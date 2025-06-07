import 'dotenv/config';

import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML } from "@tiptap/html";
import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { nanoid } from "nanoid";
import sanitizeHtml from "sanitize-html";
import sqlite3 from "sqlite3";
import * as Y from "yjs";
import { getDefaultYdocUpdate, createContentEditorExtensions } from "shared";

const sqlite3Verbose = sqlite3.verbose();

const db = new sqlite3Verbose.Database("./notes.db");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      ydocUpdate BLOB NOT NULL,
      UNIQUE (userId, title)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE
    )
  `);
});

const server = Server.configure({
  port: 1234,
  async onLoadDocument(data) {
    try {
      const [userId, noteId] = data.documentName.split("/");

      if (!noteId) {
        return;
      }

      const ydoc = new Y.Doc();
      const update = await new Promise((resolve, reject) => {
        db.get(
          "SELECT ydocUpdate FROM notes WHERE id = ? AND userId = ?",
          [noteId, userId],
          (err, row) => {
            if (err) {
              console.error(err);
              return reject(err);
            }

            if (!row) {
              return reject(new Error("Note not found"));
            }

            resolve(row.ydocUpdate);
          },
        );
      });

      Y.applyUpdate(ydoc, update);

      return ydoc;
    } catch (err) {
      console.error("Error loading document:", err);
      throw err;
    }
  },
  async onStoreDocument(data) {
    try {
      const [userId, noteId] = data.documentName.split("/");
      const editorExtensions = createContentEditorExtensions();
      const json = TiptapTransformer.fromYdoc(
        data.document,
        "default", // The field used in Tiptap
        editorExtensions, // Your editor extensions
      );
      const html = generateHTML(json, editorExtensions);
      const sanitizedHtml = sanitizeHtml(html, {
        allowedAttributes: {
          "*": [
            "id",
            "class",
            "data-type",
            "data-target-note-id",
            "data-target-block-id",
          ],
        },
      });

      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE notes SET content = ?, ydocUpdate = ? WHERE id = ? AND userId = ?",
          [sanitizedHtml, Y.encodeStateAsUpdate(data.document), noteId, userId],
          (err) => {
            if (err) {
              console.error(err);
              return reject(err);
            }

            resolve();
          },
        );
      });
    } catch (err) {
      console.error("Error writing document:", err);
      throw err;
    }
  },
  async onStateless({ payload, document }) {
    // console.log(`server has received a stateless message "${payload}"!`);

    try {
      const msg = JSON.parse(payload);
      const { userId, noteId, title, ydocArray } = msg;

      if (msg.type === "rename") {
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE notes SET title = ? WHERE id = ? AND userId = ?",
            [title, noteId, userId],
            (err) => {
              if (err) {
                console.error("Error renaming note:", err);
                return reject(err);
              }

              resolve();
            },
          );
        });
      } else if (msg.type === "create") {
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT OR IGNORE INTO notes (id, userId, title, content, ydocUpdate) VALUES (?, ?, ?, ?, ?)",
            [noteId, userId, title, `<p class="frontmatter"></p><p></p>`, new Uint8Array(ydocArray)],
            (err) => {
              if (err) {
                console.error("Error creating note:", err);
                return reject(err);
              }

              resolve();
            },
          );
        });
      } else if (msg.type === "delete") {
        await new Promise((resolve, reject) => {
          db.run(
            "DELETE FROM notes WHERE id = ? AND userId = ?",
            [noteId, userId],
            (err) => {
              if (err) {
                console.error("Error deleting note:", err);
                return reject(err);
              }

              resolve();
            },
          );
        });
      }

      // broadcast a stateless message to all connections based on document
      document.broadcastStateless(payload);
    } catch (err) {
      console.error("Error handling stateless message:", err);
      throw err;
    }
  },
  onConnect(data) {
    console.log(
      "connect:    ",
      data.socketId,
      " : ",
      server.getConnectionsCount() + 1,
    );
  },
  onDisconnect(data) {
    console.log(
      "disconnect: ",
      data.socketId,
      " : ",
      server.getConnectionsCount(),
    );
  },
});
server.listen();

const app = express();
const port = 3000;
const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "postmessage",
);

async function authCheck(req, res, next) {
  if (req.session) {
    req.session.sessionExpiry = Date.now() + 1 * 10 * 60 * 1000;

    const sessionExpirationDate = new Date(req.session.sessionExpiry);
    res.cookie("expiration", sessionExpirationDate.toISOString(), {
      httpOnly: false,
      expires: sessionExpirationDate,
    });

    next();
  } else {
    res.status(401).send("Session expired, please log in again");
  }
}

app.use(express.json()); // make `req.body` available
app.use(cors());
app.use(
  cookieSession({
    name: "session",
    keys: ["secret"],
    maxAge: 1 * 10 * 60 * 1000,
  }),
);

app.get("/api", authCheck, async (req, res) => {
  res.status(200).send("ok");
});

app.get("/api/auth", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(code); // exchange code for tokens
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    const userInfo = await oauth2.userinfo.get();

    db.get(
      "SELECT id FROM users WHERE username = ?",
      [userInfo.data.email],
      (err, row) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error checking user existence");
          return;
        }

        const userId = row?.id || nanoid(6);

        if (!row) {
          db.run(
            "INSERT INTO users (id, username) VALUES (?, ?)",
            [userId, userInfo.data.email],
            (err) => {
              if (err) {
                console.error(err);
                res.status(500).send("Error inserting user");
                return;
              }
            },
          );
          db.run(
            "INSERT INTO notes (id, userId, title, content, ydocUpdate) VALUES (?, ?, ?, ?, ?)",
            [
              nanoid(6),
              userId,
              "Starred",
              `<p class="frontmatter"></p><p></p>`,
              getDefaultYdocUpdate(),
            ],
            (err) => {
              if (err) {
                console.error(err);
                res.status(500).send("Error inserting Starred");
                return;
              }
            },
          );
        }

        req.session.userId = userId;
        res.status(200).send({ message: "Authenticated successfully", userId });
      },
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during authentication");
  }
});

app.get("/api/notes", authCheck, async (req, res) => {
  db.all(
    "SELECT id, title, content, ydocUpdate FROM notes WHERE userId = ?",
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error getting list of notes");
        return;
      }

      const resultObject = Object.fromEntries(
        rows.map((row) => [
          row.id,
          {
            title: row.title,
            content: row.content,
            ydocArray: Array.from(row.ydocUpdate),
          },
        ]),
      );

      // console.log(resultObject);

      res.status(200).json(resultObject);
    },
  );
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.clearCookie("session");
  res.status(200).send({ message: "Logout successful" });
});

app.listen(port, () => {
  console.log(`Server app listening on port ${port}`);
});

// close db connection when the app terminates to prevent resource leakage
process.on("SIGINT", () => {
  db.close(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});

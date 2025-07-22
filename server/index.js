import "dotenv/config";

import cookieSession from "cookie-session";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { nanoid } from "nanoid";
import { getDefaultYdocUpdate, getDefaultMetadataYdocArray } from "shared";
import db, { dbRun } from "./utils/db.js";
import { getHocuspocusServer } from "./utils/hocuspocus.js";

const hocuspocusServer = getHocuspocusServer();

const { app } = expressWs(express());
const port = 3000;
const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "postmessage",
);

async function authCheck(req, res, next) {
  if (req.session && req.session.userId) {
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
      async (err, row) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error checking user existence");
          return;
        }

        const userId = row?.id || nanoid(6);

        if (!row) {
          await dbRun(
            "INSERT INTO users (id, username, metadataYdocArray) VALUES (?, ?, ?)",
            [userId, userInfo.data.email, getDefaultMetadataYdocArray()],
          );
          await dbRun(
            "INSERT INTO notes (id, userId, title, content, ydocUpdate) VALUES (?, ?, ?, ?, ?)",
            [
              "starred",
              userId,
              "Starred",
              `<p class="frontmatter"></p><p></p>`,
              getDefaultYdocUpdate(),
            ],
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

app.ws("/collaboration", (ws, req) => {
  console.log("/collaboration", req.session);
  hocuspocusServer.handleConnection(ws, req);
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

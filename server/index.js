require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const { OAuth2Client } = require("google-auth-library");
const { google } = require("googleapis");
const { nanoid } = require("nanoid");
const sanitizeHtml = require("sanitize-html");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./notes.db");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
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

const app = express();
const port = 3000;
const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "postmessage",
);

async function authCheck(req, res, next) {
  if (req.session) {
    req.session.sessionExpiry = Date.now() + 1 * 1 * 60 * 1000;

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
    maxAge: 1 * 1 * 60 * 1000,
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
            "INSERT INTO notes (id, userId, title, content) VALUES (?, ?, ?, ?)",
            [
              nanoid(6),
              userId,
              "Starred",
              `<p class="frontmatter"></p><p></p>`,
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
        res.status(200).send({ message: "Authenticated successfully" });
      },
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during authentication");
  }
});

app.get("/api/notes/:noteId", authCheck, async (req, res) => {
  db.get(
    "SELECT content FROM notes WHERE id = ? AND userId = ?",
    [req.params.noteId, req.session.userId],
    (err, row) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error getting note");
        return;
      }

      if (!row) {
        res.status(404).send("Note not found");
        return;
      }

      res.status(200).send(row.content);
    },
  );
});

app.post("/api/search", authCheck, async (req, res) => {
  db.all(
    "SELECT id, content FROM notes WHERE content LIKE ?",
    [`%${req.body.query}%`],
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error searching notes");
        return;
      }

      res.status(200).send(rows);
    },
  );
});

app.get("/api/notes", authCheck, async (req, res) => {
  db.all(
    "SELECT id, title FROM notes WHERE userId = ?",
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error getting list of notes");
        return;
      }

      const resultObject = Object.fromEntries(
        rows.map((row) => [row.id, row.title]),
      );

      res.status(200).json(resultObject);
    },
  );
});

app.post("/api/notes/:noteId", authCheck, async (req, res) => {
  const sanitizedContent = sanitizeHtml(req.body.updatedContent, {
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

  db.run(
    "UPDATE notes SET content = ? WHERE id = ? AND userId = ?",
    [sanitizedContent, req.params.noteId, req.session.userId],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error updating note");
        return;
      }

      res.status(200).send(sanitizedContent);
    },
  );
});

app.post("/api/create/:noteId", authCheck, async (req, res) => {
  db.run(
    "INSERT INTO notes (id, userId, title, content) VALUES (?, ?, ?, ?)",
    [
      req.params.noteId,
      req.session.userId,
      req.body.title,
      `<p class="frontmatter"></p><p></p>`,
    ],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error inserting note");
        return;
      }

      res.status(200).send({ message: "Note created successfully" });
    },
  );
});

app.post("/api/rename/:noteId", authCheck, async (req, res) => {
  db.run(
    "UPDATE notes SET title = ? WHERE id = ? AND userId = ?",
    [req.body.newTitle, req.params.noteId, req.session.userId],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error renaming note");
        return;
      }

      res.status(200).send({ message: "Note renamed successfully" });
    },
  );
});

app.post("/api/delete/:noteId", authCheck, async (req, res) => {
  db.run(
    "DELETE FROM notes WHERE id = ? AND userId = ?",
    [req.params.noteId, req.session.userId],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error deleting note");
        return;
      }

      res.status(200).send({ message: "Note deleted successfully" });
    },
  );
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.clearCookie("session");
  res.status(200).send({ message: "Logout successful" });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// close db connection when the app terminates to prevent resource leakage
process.on("SIGINT", () => {
  db.close(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});

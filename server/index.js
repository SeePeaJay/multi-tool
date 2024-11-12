require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const { Dropbox } = require("dropbox");
const fetch = require("node-fetch");
const sanitizeHtml = require("sanitize-html");

const app = express();
const port = 3000;
const dbx = new Dropbox({
  fetch,
  clientId: process.env.DROPBOX_CLIENT_ID,
  clientSecret: process.env.DROPBOX_CLIENT_SECRET,
});
const redirectUri = process.env.DROPBOX_REDIRECT_URI;

function authCheck(req, res, next) {
  if (req.session?.accessToken) {
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
    maxAge: 1 * 1 * 60 * 1000, // default lifespan of access token, 14400s
  }),
);

app.get("/api", authCheck, async (req, res) => {
  res.status(200).send("ok");
});

app.get("/api/auth", async (req, res) => {
  try {
    const { code } = req.query;
    const token = await dbx.auth.getAccessTokenFromCode(redirectUri, code); // POST https://api.dropbox.com/oauth2/token

    req.session.accessToken = token.result.access_token;

    res.status(200).send({ message: "Authenticated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during authentication");
  }
});

app.get("/api/starred", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const fileResponse = await dbx.filesDownload({ path: "/Starred.html" });

    const fileContent = fileResponse.result.fileBinary.toString("utf8");

    res.status(200).send(fileContent);
  } catch (error) {
    // if file isn't found, create it
    if (error.status === 409) {
      const defaultContent = "<p></p>";

      await dbx.filesUpload({
        path: "/Starred.html",
        contents: defaultContent,
        mode: { ".tag": "add" },
      });

      res.status(200).send(defaultContent);
    } else {
      console.error(error);

      res
        .status(500)
        .send("An error occurred while trying to obtain Starred page");
    }
  }
});

app.post("/api/search", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const searchResponse = await dbx.filesSearchV2({
      query: req.body.query,
      options: {
        file_status: "active",
        filename_only: true,
      },
    });

    const noteList = searchResponse.result.matches.map(
      (match) => match.metadata.metadata.name,
    );

    res.status(200).send(noteList);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while trying to search for list of notes");
  }
});

app.get("/api/notes", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const sampleList = [
      { id: 1, title: "Note 1" },
      { id: 2, title: "Note 2" },
      { id: 3, title: "Note 3" },
    ];

    res.status(200).json(sampleList);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while trying to obtain list of notes");
  }
});

app.post("/api/notes/:noteTitle", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const noteTitle = req.params.noteTitle;
    const sanitizedContent = sanitizeHtml(req.body.updatedContent, {
      allowedAttributes: {
        "*": ["id"],
        span: ["class", "data-type", "data-label"],
      },
    });
    console.log(noteTitle, sanitizedContent);

    // validate input (basic check for empty strings)
    if (!noteTitle || !sanitizedContent) {
      return res.status(400).send("Note title and content are required");
    }

    await dbx.filesUpload({
      path: `/${noteTitle}.html`,
      contents: sanitizedContent,
      mode: { ".tag": "overwrite" }, // overwrite existing file
    });

    res.status(200).send(sanitizedContent);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while trying to update the note");
  }
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.clearCookie("session");
  res.status(200).send({ message: "Logout successful" });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

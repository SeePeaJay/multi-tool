require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const { Dropbox } = require("dropbox");
const { nanoid } = require("nanoid");
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
    maxAge: 4 * 60 * 60 * 1000, // default lifespan of access token, 14400s
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

    // check if id file exists
    dbx.auth.setAccessToken(req.session.accessToken);
    await dbx.filesDownload({ path: `/ids.json` });

    res.status(200).send({ message: "Authenticated successfully" });
  } catch (error) {
    // if id file isn't found, create it
    if (error.status === 409) {
      const starredId = nanoid(6);
      const idFileContent = `{"${starredId}": "Starred"}`;
      await dbx.filesUpload({
        path: `/ids.json`,
        contents: idFileContent,
        mode: { ".tag": "add" },
      });

      const starredContent = `<p class="frontmatter"></p><p></p>`;
      await dbx.filesUpload({
        path: `/Starred.html`,
        contents: starredContent,
        mode: { ".tag": "add" },
      });

      res.status(200).send({ message: "Authenticated successfully" });
    } else {
      console.error(error);
      res.status(500).send("An error occurred during authentication");
    }
  }
});

app.get("/api/notes/:noteId", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const idFileResponse = await dbx.filesDownload({
      path: `/ids.json`,
    });
    const idFileContent = idFileResponse.result.fileBinary.toString("utf8");
    const idObject = JSON.parse(idFileContent);
    const noteTitle = idObject[req.params.noteId];
    const fileResponse = await dbx.filesDownload({
      path: `/${noteTitle}.html`,
    });
    const fileContent = fileResponse.result.fileBinary.toString("utf8");

    res.status(200).send(fileContent);
  } catch (error) {
    console.error(error);

    res
      .status(500)
      .send(
        `An error occurred while trying to obtain note with id ${req.params.noteId}`,
      );
  }
});

app.post("/api/ids", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    console.log(req.body.updatedIdObject);

    await dbx.filesUpload({
      path: `/ids.json`,
      contents: JSON.stringify(req.body.updatedIdObject),
      mode: { ".tag": "overwrite" },
    });

    res.status(200).send("ok");
  } catch (error) {
    console.error(error);

    res.status(500).send(`An error occurred while trying to update id object`);
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

    // initial request
    const idFileResponse = await dbx.filesDownload({
      path: `/ids.json`,
    });
    const idFileContent = idFileResponse.result.fileBinary.toString("utf8");
    const idObject = JSON.parse(idFileContent);

    res.status(200).json(idObject);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while trying to obtain list of notes");
  }
});

app.post("/api/notes/:noteId", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const idFileResponse = await dbx.filesDownload({
      path: `/ids.json`,
    });
    const idFileContent = idFileResponse.result.fileBinary.toString("utf8");
    const idObject = JSON.parse(idFileContent);
    const noteTitle = idObject[req.params.noteId];
    const sanitizedContent = sanitizeHtml(req.body.updatedContent, {
      allowedAttributes: {
        "*": ["id", "class"],
        span: ["data-type", "data-target-note-id", "data-target-block-id"],
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

app.post("/api/rename/:noteId", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;
    dbx.auth.setAccessToken(accessToken);

    const idFileResponse = await dbx.filesDownload({
      path: `/ids.json`,
    });
    const idFileContent = idFileResponse.result.fileBinary.toString("utf8");
    const idObject = JSON.parse(idFileContent);
    const oldTitle = idObject[req.params.noteId];
    const { newTitle } = req.body;

    idObject[req.params.noteId] = newTitle;
    await dbx.filesUpload({
      path: `/ids.json`,
      contents: JSON.stringify(idObject),
      mode: { ".tag": "overwrite" },
    });

    // rename the file
    await dbx.filesMoveV2({
      from_path: `/${oldTitle}.html`,
      to_path: `/${newTitle}.html`,
    });

    res.status(200).send({ message: "Note renamed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while trying to rename the note");
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

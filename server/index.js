require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const { OAuth2Client } = require("google-auth-library");
const { google } = require("googleapis");
const { nanoid } = require("nanoid");
const sanitizeHtml = require("sanitize-html");
const stream = require("stream");

const app = express();
const port = 3000;
const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "postmessage",
);
const drive = google.drive({ version: "v3", auth: oAuth2Client });

async function authCheck(req, res, next) {
  if (req.session && req.session.accessToken) {
    req.session.sessionExpiry = Date.now() + 1 * 1 * 60 * 1000;
    const sessionExpirationDate = new Date(req.session.sessionExpiry);
    res.cookie("expiration", sessionExpirationDate.toISOString(), {
      httpOnly: false,
      expires: sessionExpirationDate,
    });

    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
      refresh_token: req.session.refreshToken,
      expiry_date: req.session.accessTokenExpiryDate,
    });
    if (oAuth2Client.isTokenExpiring()) {
      const {
        credentials: { access_token, expiry_date },
      } = await oAuth2Client.refreshAccessToken();

      req.session.accessToken = access_token;
      req.session.accessTokenExpiryDate = expiry_date;
    }

    next();
  } else {
    res.status(401).send("Session expired, please log in again");
  }
}

const broadcastUpdate = (userId, eventData) => {
  if (global.connections && global.connections[userId]) {
    global.connections[userId].forEach((sendUpdate) => {
      sendUpdate(eventData);
    });
  }
};

const getIdObject = async (idOfIdfile) => {
  const idFileResponse = await drive.files.get(
    {
      fileId: idOfIdfile,
      alt: "media",
    },
    { responseType: "text" },
  );
  const idFileContent = idFileResponse.data;

  return JSON.parse(idFileContent);
};

const updateFile = async (fileId, fileContent, isFileJson) => {
  const bufferStream = new stream.PassThrough();
  const mimeType = isFileJson ? "application/json" : "text/html";
  const useContentAsIndexableText = !isFileJson;

  bufferStream.end(fileContent);
  await drive.files.update({
    fileId: fileId,
    media: {
      mimeType,
      body: bufferStream,
    },
    useContentAsIndexableText,
  });
};

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

    const searchFolderResponse = await drive.files.list({
      q: "name = 'multi-tool' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id, name)",
    });
    const searchIdFileResponse = await drive.files.list({
      q: "name = 'ids.json' and trashed = false",
      fields: "files(id, name)",
    });

    let folderId;
    let idOfIdfile;

    if (searchFolderResponse.data.files.length === 0) {
      const folderCreateResponse = await drive.files.create({
        resource: {
          name: "multi-tool",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = folderCreateResponse.data.id;

      const idFileCreateResponse = await drive.files.create({
        resource: {
          name: "ids.json",
          parents: [folderId],
        },
        media: {
          mimeType: "application/json",
          body: `{"${nanoid(6)}": "Starred"}`,
        },
        fields: "id",
      });
      idOfIdfile = idFileCreateResponse.data.id;

      await drive.files.create({
        resource: {
          name: "Starred.html",
          parents: [folderId],
        },
        media: {
          mimeType: "text/html",
          body: `<p class="frontmatter"></p><p></p><div class="backlinks"></div>`,
        },
        useContentAsIndexableText: true,
      });
    } else {
      folderId = searchFolderResponse.data.files[0].id;
      idOfIdfile = searchIdFileResponse.data.files[0].id;
    }

    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.accessTokenExpiryDate = tokens.expiry_date;
    req.session.userId = folderId;
    req.session.idOfIdfile = idOfIdfile;

    res.status(200).send({ message: "Authenticated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during authentication");
  }
});

app.get("/api/notes/:noteId", authCheck, async (req, res) => {
  try {
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const idObject = await getIdObject(req.session.idOfIdfile);

    const noteTitle = idObject[req.params.noteId];

    const searchFileResponse = await drive.files.list({
      q: `name = '${noteTitle}.html' and trashed = false`,
      fields: "files(id, name)",
    });

    const fileResponse = await drive.files.get(
      {
        fileId: searchFileResponse.data.files[0].id,
        alt: "media",
      },
      { responseType: "text" },
    );

    res.status(200).send(fileResponse.data);
  } catch (error) {
    console.error(error);

    res
      .status(500)
      .send(
        `An error occurred while trying to obtain note with id ${req.params.noteId}`,
      );
  }
});

app.post("/api/search", authCheck, async (req, res) => {
  try {
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const searchResponse = await drive.files.list({
      q: `mimeType='text/html' and fullText contains '"${req.body.query}"' and trashed = false`,
      fields: "files(id, name)",
    });

    const idObject = await getIdObject(req.session.idOfIdfile);
    const notes = [];
    const list = searchResponse.data.files;
    console.log(searchResponse.data.files);

    for (const fileMetadata of list) {
      const fileId = fileMetadata.id;
      const noteTitle = fileMetadata.name.split(".")[0];
      const noteId = Object.keys(idObject).find(
        (key) => idObject[key] === noteTitle,
      );

      const contentResponse = await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        { responseType: "text" },
      );

      notes.push({
        id: noteId,
        content: contentResponse.data,
      });
    }

    res.status(200).send(notes);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while trying to search");
  }
});

app.get("/api/notes", authCheck, async (req, res) => {
  try {
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const idObject = await getIdObject(req.session.idOfIdfile);

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
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const idObject = await getIdObject(req.session.idOfIdfile);

    const noteTitle = idObject[req.params.noteId];

    const searchFileResponse = await drive.files.list({
      q: `name = '${noteTitle}.html' and trashed = false`,
      fields: "files(id, name)",
    });

    const sanitizedContent = sanitizeHtml(req.body.updatedContent, {
      allowedAttributes: {
        "*": ["id", "class"],
        span: ["data-type", "data-target-note-id", "data-target-block-id"],
        div: ["data-target-note-id", "data-target-block-id"],
      },
    });

    await updateFile(searchFileResponse.data.files[0].id, sanitizedContent);

    res.status(200).send(sanitizedContent);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while trying to update the note");
  }
});

app.post("/api/broadcast", authCheck, (req, res) => {
  broadcastUpdate(req.session.userId, req.body.initiator);

  res.status(200).send("ok");
});

app.get("/api/events", authCheck, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // flush the headers to establish SSE with client, replacing the need to res.write("...") before req.on("close", ...)

  const userId = req.session.userId;

  const sendUpdate = (eventData) => {
    res.write(`data: ${eventData}\n\n`);
  };
  sendUpdate.id = req.query.sessionId;

  if (!global.connections) {
    global.connections = {};
  }
  if (!global.connections[userId]) {
    global.connections[userId] = [];
  }
  global.connections[userId].push(sendUpdate);
  // console.log(global.connections);

  req.on("close", () => {
    global.connections[userId] = global.connections[userId].filter(
      (fn) => fn !== sendUpdate,
    );

    // console.log(global.connections);
    res.end();
  });
});

app.post("/api/create/:noteId", authCheck, async (req, res) => {
  try {
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const idObject = await getIdObject(req.session.idOfIdfile);

    idObject[req.params.noteId] = req.body.title;

    await updateFile(req.session.idOfIdfile, JSON.stringify(idObject), true);

    await drive.files.create({
      resource: {
        name: `${req.body.title}.html`,
        parents: [req.session.userId],
      },
      media: {
        mimeType: "text/html",
        body: `<p class="frontmatter"></p><p></p><div class="backlinks"></div>`,
      },
    });

    res.status(200).send({ message: "Note created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while trying to create the note");
  }
});

app.post("/api/rename/:noteId", authCheck, async (req, res) => {
  try {
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const idObject = await getIdObject(req.session.idOfIdfile);

    const oldTitle = idObject[req.params.noteId];
    const { newTitle } = req.body;

    idObject[req.params.noteId] = newTitle;

    await updateFile(req.session.idOfIdfile, JSON.stringify(idObject), true);

    // rename the file
    const searchFileResponse = await drive.files.list({
      q: `name = '${oldTitle}.html' and trashed = false`,
      fields: "files(id, name)",
    });
    await drive.files.update({
      fileId: searchFileResponse.data.files[0].id,
      resource: {
        name: `${newTitle}.html`,
      },
    });

    res.status(200).send({ message: "Note renamed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while trying to rename the note");
  }
});

app.post("/api/delete/:noteId", authCheck, async (req, res) => {
  try {
    oAuth2Client.setCredentials({
      access_token: req.session.accessToken,
    });

    const idObject = await getIdObject(req.session.idOfIdfile);

    const titleToDelete = idObject[req.params.noteId];

    delete idObject[req.params.noteId];

    await updateFile(req.session.idOfIdfile, JSON.stringify(idObject), true);

    // delete the file
    const searchFileResponse = await drive.files.list({
      q: `name = '${titleToDelete}.html' and trashed = false`,
      fields: "files(id, name)",
    });
    await drive.files.delete({ fileId: searchFileResponse.data.files[0].id });

    res.status(200).send({ message: "Note deleted successfully" });
  } catch (error) {
    console.error(error);

    res.status(500).send("An error occurred while trying to delete the note");
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

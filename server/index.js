require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Dropbox } = require("dropbox");
const fetch = require("node-fetch");

const app = express();
const port = 3000;

const dbx = new Dropbox({
  fetch,
  clientId: process.env.DROPBOX_CLIENT_ID,
  clientSecret: process.env.DROPBOX_CLIENT_SECRET,
});
const redirectUri = process.env.DROPBOX_REDIRECT_URI;

app.use(cors());
app.use(express.json()); // makes `req.body` available

app.get("/api/auth", async (req, res) => {
  try {
    const { code } = req.query;
    console.log(`code: ${code}`);

    const token = await dbx.auth.getAccessTokenFromCode(redirectUri, code); // effectively POST https://api.dropbox.com/oauth2/token
    console.log(`Token Result: ${JSON.stringify(token)}`);

    dbx.auth.setAccessToken(token.result.access_token);

    const response = await dbx.usersGetCurrentAccount();
    console.log("response", response);

    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during authentication");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

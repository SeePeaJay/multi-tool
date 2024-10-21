require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
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

function authCheck(req, res, next) {
  if (req.session?.accessToken) {
    next();
  } else {
    res.status(401).send("Session expired, please log in again");
  }
}

app.use(express.json()); // makes `req.body` available
app.use(cors());
app.use(
  cookieSession({
    name: "session",
    keys: ["secret"],
    maxAge: 1 * 1 * 60 * 1000, // default lifespan of access token, 14400s
  }),
);

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

app.get("/api/user", authCheck, async (req, res) => {
  try {
    const accessToken = req.session.accessToken;

    dbx.auth.setAccessToken(accessToken);

    const response = await dbx.usersGetCurrentAccount();

    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during authentication");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

import dotenv from "dotenv";
dotenv.config();

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { OAuth2Client } from "google-auth-library";
import db from "./persistence/sqlite";

const app: Express = express();
const port = process.env.PORT;
const client = new OAuth2Client();

/* https://developers.google.com/identity/gsi/web/guides/verify-google-id-token#using-a-google-api-client-library */
async function verifyGoogleToken(credential: string) {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  return payload?.["sub"]; // userId
}

function authCheck(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    next();
  } else {
    res.status(403).send("Unauthorized");
  }
}

app.use(cors());
app.use(
  cookieSession({
    name: "session",
    keys: ["secret"],
    maxAge: 60 * 60 * 1000,
  }),
);

app.get("/api", (req: Request, res: Response) => {
  db.getBlockRows().then((rows) => {
    res.send(rows.map((row) => row.content));
  });
});

app.post("/api/login", (req: Request, res: Response) => {
  verifyGoogleToken(req.headers.authorization?.split(" ")[1] || "")
    .then((userId) => {
      // console.log(userId);

      if (req.session) {
        req.session.userId = userId;
      }

      res.status(200).send(userId);
    })
    .catch((err) => {
      console.error(err);

      res.status(401).send("Invalid credential");
    });
});

app.get("/api/engrams", authCheck, async (req: Request, res: Response) => {
  console.log(req.session?.userId);

  try {
    const engramTitles = await db.getEngramIdsAndTitles(req.session?.userId);

    if (engramTitles.length === 0) {
      const starredTitle = await db.createStarredEngram(req.session?.userId);

      res.status(200).send([starredTitle]);
    } else {
      res.status(200).send(engramTitles);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.get("/api/engrams/:engramId", authCheck, async (req: Request, res: Response) => {
  try {
    const blockRows = await db.getBlockRows({
      repoId: req.session?.userId,
      engramId: req.params.engramId,
    });
    res.send(blockRows.map((row) => row.content));
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

db.init().then(() => {
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
});

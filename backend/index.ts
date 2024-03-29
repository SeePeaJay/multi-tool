import dotenv from "dotenv";
dotenv.config();

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import cookieSession from "cookie-session";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import { JSDOM } from "jsdom";
import db from "./utils/sqlite";

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
    maxAge: 24 * 60 * 60 * 1000,
  }),
);
app.use(express.json()); // make req.body available
app.use(express.static(path.join(process.env.PWD || "", "../frontend/dist"))); // serve Vue static files for production when users access root

app.get("/api", (req: Request, res: Response) => {
  const html = fs.readFileSync(path.join(process.env.PWD || "", "/utils/multi-tool.html"), "utf8");
  const dom = new JSDOM(html);
  const htmlElements = Array.from(dom.window.document.body.children).map((child: Element) => child.outerHTML);

  res.send({
    title: "Multi-Tool",
    blocks: htmlElements.slice(1),
  });
});

app.post("/api/login", (req: Request, res: Response) => {
  verifyGoogleToken(req.headers.authorization?.split(" ")[1] || "")
    .then((userId) => {
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
  try {
    const engramIdsAndTitles = await db.getEngramIdsAndTitles(req.session?.userId);

    if (engramIdsAndTitles.length === 0) {
      const starredIdAndTitle = await db.createEngram({
        repoId: req.session?.userId,
        engramTitle: "Starred",
      });

      res.status(200).send([starredIdAndTitle]);
    } else {
      res.status(200).send(engramIdsAndTitles);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.get("/api/engrams/:engramId", authCheck, async (req: Request, res: Response) => {
  try {
    const title = await db.getTitleFromEngramId({
      repoId: req.session?.userId,
      engramId: req.params.engramId,
    });
    const blockRows = await db.getBlockRows({
      repoId: req.session?.userId,
      engramId: req.params.engramId,
    });

    res.send({
      title,
      blocks: blockRows.map((row) => row.content),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.post("/api/engrams/:engramId", authCheck, async (req, res) => {
  try {
    db.updateBlocks({
      engramId: req.params.engramId,
      updatedBlocks: req.body,
    });

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.delete("/api/engrams/:engramId", authCheck, async (req, res) => {
  try {
    await db.deleteEngram({
      repoId: req.session?.userId,
      engramId: req.params.engramId,
    });

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.put("/api/engrams/:engramId/rename", authCheck, async (req, res) => {
  try {
    const updatedTitle = await db.renameEngram({
      repoId: req.session?.userId,
      engramId: req.params.engramId,
      newEngramTitle: req.body.newEngramTitle,
      createdEngramLinks: req.body.createdEngramLinks,
      deletedEngramLinks: req.body.deletedEngramLinks,
    });

    res.send(updatedTitle);
  } catch (err) {
    const sqliteError = err as Error;

    if (sqliteError.message.startsWith("SQLITE_CONSTRAINT")) {
      res.status(400).send("Engram with new title already exists");
    } else {
      res.status(500).send(err);
    }
  }
});

app.get("/api/engrams/:engramTitle/id", authCheck, async (req, res) => {
  try {
    let id = await db.getIdFromEngramTitle({
      repoId: req.session?.userId,
      engramTitle: req.params.engramTitle,
    });

    if (!id) {
      await db.createEngram({
        repoId: req.session?.userId,
        engramTitle: req.params.engramTitle,
      });

      id = await db.getIdFromEngramTitle({
        repoId: req.session?.userId,
        engramTitle: req.params.engramTitle,
      });
    }

    res.send(id);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.get("/api/engrams/:targetId/display", authCheck, async (req, res) => {
  try {
    const content = await db.getMetadataToDisplayEngramLink({
      repoId: req.session?.userId,
      targetId: req.params.targetId,
    });

    res.send(content);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.get("/api/logout", (req, res) => {
  if (req.session) {
    req.session = null; // https://github.com/expressjs/cookie-session#destroying-a-session
  }
  res.clearCookie("session");

  res.status(200).end();
});

/* This is needed for production in case users refresh at any route except root */
app.get("*", (req, res) => {
  res.sendFile(path.join(process.env.PWD || "", "../frontend/dist/index.html"));
});

db.init().then(() => {
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
});

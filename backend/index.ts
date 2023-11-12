import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors from "cors";
import db from "./persistence/sqlite";

const app: Express = express();
const port = process.env.PORT;

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.get("/blocks", (req: Request, res: Response) => {
  db.getItems().then((rows) => {
    res.send(rows.map((row) => row.content));
  });
});

db.init().then(() => {
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
});

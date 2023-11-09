import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import db from "./sqlite";

const app: Express = express();
const port = process.env.PORT;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

db.init().then(() => {
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    db.getItems().then((rows) => {
      console.log("jjj");
      console.log(rows);
    });
  });
});

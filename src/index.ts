import "./env";
import "reflect-metadata";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { createConnection, getRepository } from "typeorm";
import connectionOptions from "./shared/ormconfig";
import { handleBlockEvent } from "./shared/blockEventHandler";
import Web3 from "web3";
import { LogError } from "./shared/entities/LogError";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORT = IS_PRODUCTION ? process.env.PORT : 5001;

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    credentials: true,
  })
);

app.post("/createBlock", async (req: Request, res: Response) => {
  const {
    query: { blockNumber },
  }: any = req;

  try {
    const result = await handleBlockEvent(Number(blockNumber));
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(400).json({ isSuccess: false, error: e.message });
  }
});

createConnection(connectionOptions)
  .then(() => {
    console.log("DB CONNECTION!");
    app.listen(PORT, async () => {
      console.log(`Listening on port: "http://localhost:${PORT}"`);
    });
  })
  .catch((error) => {
    console.log(error);
  });

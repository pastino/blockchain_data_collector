import "./env";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createConnection } from "typeorm";
import connectionOptions from "./ormconfig";
import { Alchemy, Network } from "alchemy-sdk";
import { handleBlockEvent } from "./services/blockEvent";
import axios from "axios";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORT = IS_PRODUCTION ? process.env.PORT : 4002;

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

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

function connect() {
  subscribeToBlockEvents();

  // 연결이 되면 5분 후 빠진 블록 채우기.
  setTimeout(async () => {
    try {
      await axios({
        method: "post",
        url: `http://121.168.75.64:6000/block`,
      });
    } catch (e) {
      console.error(e);
    }
  }, 1000 * 60 * 5);
}

function subscribeToBlockEvents() {
  alchemy.ws.on("block", async (blockNumber) => {
    console.log("blockNumber 구독", blockNumber);
    try {
      await handleBlockEvent(blockNumber);
    } catch (e) {
      console.error("Error handling block event:", e);
    }
  });
}

createConnection(connectionOptions)
  .then(() => {
    console.log("DB CONNECTION!");
    app.listen(PORT, async () => {
      console.log(`Listening on port: "http://localhost:${PORT}"`);
      connect();
    });
  })
  .catch((error) => {
    console.log(error);
  });

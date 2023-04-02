import "./env";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createConnection, getConnection, getRepository } from "typeorm";
import connectionOptions from "./shared/ormconfig";
import { Alchemy, Network } from "alchemy-sdk";
import { handleBlockEvent } from "./shared/modules/blockEvent";
import axios from "axios";
import { NFT } from "./shared/entities/NFT";
import { Contract } from "./shared/entities/Contract";
import { Transfer } from "./shared/entities/Transfer";

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

const duplicateDataHandler = async () => {
  const contractRepository = getRepository(Contract);
  const nftRepository = getRepository(NFT);
  const transferRepository = getRepository(Transfer);
  const connection = getConnection();
  // 중복된 Contract 주소 찾기
  const duplicateContracts = await connection.query(`
    SELECT address, COUNT(*) as count
    FROM contract
    GROUP BY address
    HAVING count > 1
  `);

  for (const { address } of duplicateContracts) {
    // 각 주소에 대한 모든 Contract 가져오기
    const contracts = await contractRepository.find({
      where: { address },
      order: { id: "ASC" },
    });

    // 첫 번째 Contract를 유지하고 나머지를 삭제
    const [firstContract, ...otherContracts] = contracts;

    for (let i = 0; i < otherContracts.length; i++) {
      console.log(`${i + 1} / ${otherContracts.length}`);
      const contractToDelete = otherContracts[i];
      // NFT 엔티티 업데이트
      await nftRepository
        .createQueryBuilder()
        .update(NFT)
        .set({ contract: firstContract })
        .where("contractId = :id", { id: contractToDelete.id })
        .execute();

      // Transfer 엔티티 업데이트
      await transferRepository
        .createQueryBuilder()
        .update(Transfer)
        .set({ contract: firstContract })
        .where("contractId = :id", { id: contractToDelete.id })
        .execute();
    }

    // Contract 삭제
    for (const contractToDelete of otherContracts) {
      await contractRepository.remove(contractToDelete);
    }
  }
};

createConnection(connectionOptions)
  .then(() => {
    console.log("DB CONNECTION!");
    app.listen(PORT, async () => {
      console.log(`Listening on port: "http://localhost:${PORT}"`);
      // connect();

      duplicateDataHandler();
    });
  })
  .catch((error) => {
    console.log(error);
  });

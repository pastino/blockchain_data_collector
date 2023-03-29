import { Alchemy, Network } from "alchemy-sdk";
import { getConnection } from "typeorm";
import { BlockNumber } from "../entities/BlockNumber";
import Web3 from "web3";
import { Contract } from "../entities/Contract";
import { NFT } from "../entities/NFT";
import { Transfer } from "../entities/Transfer";
import { hexToDecimal } from "../utils";
import { Transaction } from "../entities/Transaction";

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

export async function handleBlockEvent(blockNumber: number) {
  const connection = getConnection();
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 블록 번호 생성 - 누락된 데이터가 없도록 하기 위함.
    const blockNumberData = await queryRunner.manager.save(BlockNumber, {
      blockNumber,
    });

    const blockData = await alchemy.core.getBlock(blockNumber);

    const transactions = blockData?.transactions;

    for (let i = 0; i < transactions.length; i++) {
      const transactionHash = transactions[i];

      const transactionReceipt = await alchemy.core.getTransactionReceipt(
        transactionHash
      );

      if (transactionReceipt?.logs) {
        for (let i = 0; i < transactionReceipt?.logs?.length; i++) {
          const log = transactionReceipt?.logs[i];

          const web3 = new Web3();

          const nftTransferEventAbi: any = {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
              },
              {
                indexed: true,
                internalType: "uint256",
                name: "tokenId",
                type: "uint256",
              },
            ],
            name: "Transfer",
            type: "event",
          };

          const nftTransferEventSignature =
            web3.eth.abi.encodeEventSignature(nftTransferEventAbi);

          try {
            if (log.topics[0] === nftTransferEventSignature) {
              const decodedLog = web3.eth.abi.decodeLog(
                nftTransferEventAbi.inputs,
                log.data,
                log.topics.slice(1)
              );

              let contract = await queryRunner.manager.findOne(Contract, {
                where: {
                  address: log.address,
                },
              });

              if (!contract) {
                const contractMetaData = await alchemy.nft.getContractMetadata(
                  log.address
                );

                const newContract = {
                  ...contractMetaData,
                  ...contractMetaData.openSea,
                  isCompletedInitialUpdate: false,
                  isCompletedUpdate: false,
                };
                delete contractMetaData.openSea;
                contract = await queryRunner.manager.save(
                  Contract,
                  newContract
                );
              }

              let nft = await queryRunner.manager.findOne(NFT, {
                where: {
                  contract,
                  tokenId: decodedLog?.tokenId,
                },
              });
              if (!nft) {
                const nftData = await alchemy.nft.getNftMetadata(
                  contract.address,
                  decodedLog?.tokenId
                );

                nft = await queryRunner.manager.save(NFT, {
                  ...nftData,
                  mediaThumbnail: nftData?.media?.[0]?.thumbnail,
                  contract,
                });
              }

              const transferData = await queryRunner.manager.save(Transfer, {
                from: decodedLog?.from,
                to: decodedLog?.to,
                blockNumber,
                tokenId: decodedLog?.tokenId,
                tokenType: nft?.tokenType,
                contract,
                nft,
                title: nft?.title,
                transactionHash,
              });

              const transactionData = await alchemy.transact.getTransaction(
                transactionHash
              );

              const timestamp = blockData.timestamp;
              const eventTime = new Date(timestamp * 1000);

              const timeOption = {
                timestamp,
                eventTime,
              };

              const transaction = await queryRunner.manager.save(Transaction, {
                ...transactionData,
                blockNumber: blockNumberData,
                transfer: transferData,
                gasPrice: String(
                  hexToDecimal(transactionData?.gasPrice?._hex || "0")
                ),
                gasLimit: String(
                  hexToDecimal(transactionData?.gasLimit?._hex || "0")
                ),
                value: String(
                  hexToDecimal(transactionData?.value?._hex || "0")
                ),
                ...timeOption,
              });

              await queryRunner.manager.update(
                Transfer,
                {
                  id: transferData.id,
                },
                {
                  transaction,
                }
              );
            }
          } catch (e) {
            null;
          }
        }
      }
    }

    await queryRunner.commitTransaction();
    console.log("블록 데이터 생성", blockNumber);
  } catch (e) {
    await queryRunner.rollbackTransaction();
    console.log(e);
  } finally {
    await queryRunner.release();
  }
}

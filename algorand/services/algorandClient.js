import algosdk from "algosdk";
import dotenv from "dotenv";

// Load environment variables from the project root .env file
dotenv.config({ path: "../../.env" }); 

export function getAlgodClient() {
  // Use environment variables for Algod client configuration
  const algodServer = process.env.ALGORAND_ALGOD_URL || "https://testnet-api.algonode.cloud";
  const algodToken = process.env.ALGORAND_ALGOD_TOKEN || ""; // Often empty for public nodes
  const algodPort = process.env.ALGORAND_ALGOD_PORT || ""; // Often empty for public nodes

  return new algosdk.Algodv2(
    algodToken,
    algodServer,
    algodPort
  );
}

export function getIndexerClient() {
  // Use environment variables for Indexer client configuration
  const indexerServer = process.env.ALGORAND_INDEXER_URL || "https://testnet-idx.algonode.cloud";
  const indexerToken = process.env.ALGORAND_INDEXER_TOKEN || ""; // Often empty for public nodes
  const indexerPort = process.env.ALGORAND_INDEXER_PORT || ""; // Often empty for public nodes

  return new algosdk.Indexer(
    indexerToken,
    indexerServer,
    indexerPort
  );
}
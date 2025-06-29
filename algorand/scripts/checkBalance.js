import { getAlgodClient } from "../services/algorandClient.js";

async function checkBalance() {
  const algodClient = getAlgodClient();
  try {
    const accountInfo = await algodClient
      .accountInformation(
        "577ACJKHM4D623YKVQ76TQY4KPKSK3LUEXBEIYSOITROZ4X3PDXWFXMH6Q"
      )
      .do();
    const balance = Number(accountInfo.amount) / 1e6; // Convert BigInt to Number
    console.log("Balance:", balance, "ALGO");
  } catch (error) {
    console.error("Failed to fetch balance:", error);
  }
}

checkBalance();

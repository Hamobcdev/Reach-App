// routes/emergencyRoutes.js
import express from "express";
import { algodClient } from "../services/algorandClient.js";

const router = express.Router();

router.get("/balance/:wallet", async (req, res) => {
  try {
    const accountInfo = await algodClient
      .accountInformation(req.params.wallet)
      .do();
    res.json({
      address: req.params.wallet,
      balance: accountInfo.amount / 1e6,
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to fetch balance" });
  }
});

export default router;

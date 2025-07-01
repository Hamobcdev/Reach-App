import React, { useEffect, useState } from "react";
import { useAidManager } from "../context/AidManagerContext";
import { ethers } from "ethers";

const AidTestPage = () => {
  const aidManager = useAidManager();
  const [owner, setOwner] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!aidManager) return;
    const fetchOwner = async () => {
      try {
        const result = await aidManager.owner();
        setOwner(result);
      } catch (err) {
        console.error("Failed to fetch owner:", err);
      }
    };
    fetchOwner();
  }, [aidManager]);

  const handleAuthorize = async () => {
    setStatus("Authorizing...");
    try {
      const tx = await aidManager.authorizeNGO(await window.ethereum.selectedAddress);
      await tx.wait();
      setStatus("✅ NGO Authorized");
    } catch (err) {
      console.error("Authorization failed:", err);
      setStatus("❌ Authorization failed");
    }
  };

  const handleDistribute = async () => {
    if (!ethers.utils.isAddress(recipient)) {
      setStatus("❌ Invalid recipient address");
      return;
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      setStatus("❌ Invalid token amount");
      return;
    }
    setStatus("Distributing...");
    try {
      const tx = await aidManager.distributeAid(recipient, ethers.utils.parseUnits(amount, 18));
      await tx.wait();
      setStatus(`✅ Distributed ${amount} tokens to ${recipient}`);
    } catch (err) {
      console.error("Distribute aid failed:", err);
      setStatus("❌ Distribution failed");
    }
  };

  const revokeNGO = async () => {
    setStatus("Revoking NGO...");
    try {
      const tx = await aidManager.revokeNGO(await window.ethereum.selectedAddress);
      await tx.wait();
      setStatus("✅ NGO authorization revoked");
    } catch (err) {
      console.error("Revoke failed", err);
      setStatus("❌ Revoke failed");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h1>Aid Test Page</h1>
      <p><strong>Contract Owner:</strong> {owner ?? "Loading..."}</p>

      {/* Authorization Controls */}
      <button onClick={handleAuthorize}>Authorize My Wallet as NGO</button>
      <button onClick={revokeNGO} style={{ marginLeft: 10 }}>Revoke My NGO Status</button>

      <hr style={{ margin: "20px 0" }} />

      {/* Aid Distribution Controls */}
      <h2>Distribute Aid</h2>
      <input
        type="text"
        placeholder="Recipient address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <input
        type="text"
        placeholder="Amount (tokens)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <button onClick={handleDistribute}>Send Aid</button>

      <p style={{ marginTop: 20 }}><strong>Status:</strong> {status}</p>

      {/* Future enhancement: Add NGO status check, aid logs, and balance views */}
    </div>
  );
};

export default AidTestPage;

import { ethers } from 'ethers';
import deployments from '../../deployments.json';
import AidManagerABI from '../../abis/AidManager.abi.json';

export const getAidManagerContract = () => {
  if (!window.ethereum) {
    console.error("MetaMask not found.");
    return null;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner(); // ✅ this enables sending txs

  const contractAddress = deployments?.AidManager?.address;

  if (!contractAddress) {
    console.error("AidManager address missing from deployments.json");
    return null;
  }

  return new ethers.Contract(contractAddress, AidManagerABI, signer); // ✅ use signer here
};



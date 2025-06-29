// algorand/scripts/generate_new_account.js

import algosdk from 'algosdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Setup path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '../../');
const envPath = resolve(rootPath, '.env');

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Use Node.js process.env instead of import.meta.env
const ALGORAND_NODE_URL = process.env.ALGORAND_ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGORAND_NODE_TOKEN = process.env.ALGORAND_NODE_TOKEN || '';

// Initialize Algod client
const algodClient = new algosdk.Algodv2(
  ALGORAND_NODE_TOKEN,
  ALGORAND_NODE_URL,
  ''
);

async function generateNewAlgorandAccount() {
  console.log('Generating a new Algorand account...');
  
  // Generate a new account
  const account = algosdk.generateAccount();
  const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
  
  // Create account object
  const newAccount = {
    addr: account.addr,
    sk: account.sk,
    mnemonic: mnemonic
  };

  console.log('\n--- New Algorand Account Details ---');
  console.log('Address:', newAccount.addr);
  console.log('Mnemonic:', newAccount.mnemonic);
  console.log('------------------------------------');
  console.log('\nIMPORTANT: Securely save this mnemonic phrase. Do NOT share it or commit it to version control.');
  
  // Optional: Check account balance
  try {
    console.log('\nChecking TestNet balance...');
    const accountInfo = await algodClient.accountInformation(newAccount.addr).do();
    const balance = accountInfo.amount / 1000000; // Convert microAlgos to Algos
    console.log(`Balance: ${balance} ALGO`);
    
    if (balance === 0) {
      console.log('\nYour account has 0 ALGO. To fund it on TestNet:');
      console.log('1. Visit https://bank.testnet.algorand.network/');
      console.log(`2. Enter your address: ${newAccount.addr}`);
      console.log('3. Click "Dispense" to receive test Algos');
    }
  } catch (error) {
    console.log('Could not check balance:', error.message);
  }
  
  // Optional: Save to .env.local file
  const saveToEnv = process.argv.includes('--save');
  if (saveToEnv) {
    try {
      const envLocalPath = resolve(rootPath, '.env.local');
      const envContent = `
# Algorand Account (TESTNET ONLY - DO NOT USE FOR MAINNET/REAL FUNDS)
# Generated on ${new Date().toISOString()}
VITE_ALGORAND_ADDRESS=${newAccount.addr}
VITE_ALGORAND_MNEMONIC="${newAccount.mnemonic}"
VITE_ALGORAND_NODE_URL=${ALGORAND_NODE_URL}
`;
      fs.writeFileSync(envLocalPath, envContent, { flag: 'a' });
      console.log(`\nAccount details appended to ${envLocalPath}`);
      console.log('IMPORTANT: Add .env.local to your .gitignore file!');
    } catch (error) {
      console.error('Error saving to .env.local:', error.message);
    }
  }
  
  return newAccount;
}

generateNewAlgorandAccount().catch(console.error);
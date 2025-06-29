import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import algosdk from 'algosdk';

// Setup path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, '../../');
const envPath = path.resolve(rootPath, '.env');

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Algorand node configuration
const ALGORAND_NODE_URL = process.env.ALGORAND_ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGORAND_NODE_TOKEN = process.env.ALGORAND_NODE_TOKEN || '';
const ALGORAND_MNEMONIC = process.env.ALGORAND_MNEMONIC;
const APP_ID = parseInt(process.env.VITE_ALGORAND_APP_ID || '0');

// Initialize Algod client
const algodClient = new algosdk.Algodv2(ALGORAND_NODE_TOKEN, ALGORAND_NODE_URL, '');

// Mock price feed data (in a real implementation, this would come from Chainlink)
const PRICE_FEEDS = {
  'WST/USD': 0.35, // Samoan Tala to USD
  'USD/WST': 2.86, // USD to Samoan Tala
  'ALGO/USD': 0.25, // Algorand to USD
  'USD/ALGO': 4.00  // USD to Algorand
};

// Function to fetch price from mock or real API
async function fetchPrice(pair) {
  console.log(`Fetching price for ${pair}...`);
  
  // In a real implementation, this would call a Chainlink price feed or API
  // For now, we'll use our mock data
  if (PRICE_FEEDS[pair]) {
    return PRICE_FEEDS[pair];
  }
  
  throw new Error(`Price feed not available for ${pair}`);
}

// Function to update price on the Algorand contract
async function updatePriceOnChain(pair, price) {
  if (!ALGORAND_MNEMONIC || !APP_ID) {
    throw new Error('ALGORAND_MNEMONIC and VITE_ALGORAND_APP_ID must be set in .env file');
  }
  
  try {
    console.log(`Updating ${pair} price on chain: ${price}`);
    
    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(ALGORAND_MNEMONIC);
    
    // Get suggested parameters
    const params = await algodClient.getTransactionParams().do();
    
    // Create application call transaction
    // This assumes your contract has an update_price_feed method
    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      from: account.addr,
      appIndex: APP_ID,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new Uint8Array(Buffer.from('update_system_settings')),
        new Uint8Array(Buffer.from('price_feed')),
        algosdk.encodeUint64(Math.floor(price * 1000000)), // Convert to microunits
        new Uint8Array(Buffer.from(pair))
      ],
      suggestedParams: params
    });
    
    // Sign transaction
    const signedTxn = appCallTxn.signTxn(account.sk);
    
    // Submit transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    console.log(`✅ Price update transaction confirmed: ${txId}`);
    console.log(`Transaction round: ${confirmedTxn['confirmed-round']}`);
    
    // Log to price history file
    logPriceUpdate(pair, price, txId);
    
    return txId;
  } catch (error) {
    console.error(`❌ Error updating price on chain:`, error);
    throw error;
  }
}

// Function to log price updates to a file
function logPriceUpdate(pair, price, txId) {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'price_feed_history.json');
  let history = [];
  
  // Read existing history if available
  if (fs.existsSync(logFile)) {
    try {
      history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (error) {
      console.error('Error reading price history file:', error);
    }
  }
  
  // Add new entry
  history.push({
    pair,
    price,
    txId,
    timestamp: new Date().toISOString()
  });
  
  // Write updated history
  fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
  console.log(`📝 Price update logged to ${logFile}`);
}

// Main function to run price feed updates
async function monitorPriceFeed() {
  console.log('🔄 Starting price feed monitor...');
  
  try {
    // Check if APP_ID is set
    if (!APP_ID) {
      console.error('❌ VITE_ALGORAND_APP_ID is not set in .env file. Please deploy the contract first.');
      process.exit(1);
    }
    
    // Fetch and update prices for all pairs
    for (const pair of Object.keys(PRICE_FEEDS)) {
      try {
        const price = await fetchPrice(pair);
        await updatePriceOnChain(pair, price);
        console.log(`✅ Updated ${pair} price: ${price}`);
      } catch (error) {
        console.error(`❌ Error updating ${pair} price:`, error.message);
      }
    }
    
    console.log('✅ Price feed update complete!');
    
    // In a real implementation, this would be scheduled to run periodically
    console.log('ℹ️ In production, this script would be scheduled to run hourly or daily.');
    console.log('ℹ️ For continuous monitoring, consider using a cron job or a service like Chainlink Automation.');
  } catch (error) {
    console.error('❌ Error in price feed monitor:', error);
  }
}

// Run the monitor
monitorPriceFeed().catch(console.error);
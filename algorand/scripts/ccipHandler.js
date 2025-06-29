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

// Mock CCIP configuration
const CCIP_CONFIG = {
  supportedChains: ['ethereum', 'polygon', 'avalanche'],
  mockMessages: [
    {
      id: 'msg_001',
      sourceChain: 'ethereum',
      sourceAddress: '0x1234567890abcdef1234567890abcdef12345678',
      payload: {
        type: 'fiat_deposit',
        userAddress: process.env.TEST_USER_1_ALGORAND_ADDRESS,
        amount: 100000000, // 100 ALGO equivalent
        reference: 'stripe_pi_12345',
        timestamp: Date.now()
      }
    },
    {
      id: 'msg_002',
      sourceChain: 'polygon',
      sourceAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      payload: {
        type: 'system_update',
        settingKey: 'emergency_threshold',
        settingValue: 5000000, // 5 ALGO
        reason: 'Adjusted for market conditions',
        timestamp: Date.now()
      }
    }
  ]
};

// Function to process a CCIP message
async function processCcipMessage(message) {
  if (!ALGORAND_MNEMONIC || !APP_ID) {
    throw new Error('ALGORAND_MNEMONIC and VITE_ALGORAND_APP_ID must be set in .env file');
  }
  
  try {
    console.log(`Processing CCIP message from ${message.sourceChain}:`, message.payload);
    
    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(ALGORAND_MNEMONIC);
    
    // Get suggested parameters
    const params = await algodClient.getTransactionParams().do();
    
    // Create application call transaction based on message type
    let appCallTxn;
    
    if (message.payload.type === 'fiat_deposit') {
      // Handle fiat deposit message
      appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: account.addr,
        appIndex: APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('fiat_deposit')),
          new Uint8Array(Buffer.from(message.payload.userAddress)),
          algosdk.encodeUint64(message.payload.amount),
          new Uint8Array(Buffer.from(message.payload.reference))
        ],
        suggestedParams: params
      });
    } else if (message.payload.type === 'system_update') {
      // Handle system update message
      appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: account.addr,
        appIndex: APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('update_system_settings')),
          new Uint8Array(Buffer.from(message.payload.settingKey)),
          algosdk.encodeUint64(message.payload.settingValue),
          new Uint8Array(Buffer.from(message.payload.reason))
        ],
        suggestedParams: params
      });
    } else {
      throw new Error(`Unsupported message type: ${message.payload.type}`);
    }
    
    // Sign transaction
    const signedTxn = appCallTxn.signTxn(account.sk);
    
    // Submit transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    console.log(`✅ CCIP message processed. Transaction ID: ${txId}`);
    console.log(`Transaction round: ${confirmedTxn['confirmed-round']}`);
    
    // Log to CCIP history file
    logCcipMessage(message, txId);
    
    return txId;
  } catch (error) {
    console.error(`❌ Error processing CCIP message:`, error);
    throw error;
  }
}

// Function to log CCIP messages to a file
function logCcipMessage(message, txId) {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'ccip_message_history.json');
  let history = [];
  
  // Read existing history if available
  if (fs.existsSync(logFile)) {
    try {
      history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (error) {
      console.error('Error reading CCIP history file:', error);
    }
  }
  
  // Add new entry
  history.push({
    messageId: message.id,
    sourceChain: message.sourceChain,
    sourceAddress: message.sourceAddress,
    payload: message.payload,
    txId,
    processedAt: new Date().toISOString()
  });
  
  // Write updated history
  fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
  console.log(`📝 CCIP message logged to ${logFile}`);
}

// Main function to process mock CCIP messages
async function handleCcipMessages() {
  console.log('🔄 Starting CCIP message handler...');
  
  try {
    // Check if APP_ID is set
    if (!APP_ID) {
      console.error('❌ VITE_ALGORAND_APP_ID is not set in .env file. Please deploy the contract first.');
      process.exit(1);
    }
    
    console.log(`Found ${CCIP_CONFIG.mockMessages.length} mock CCIP messages to process`);
    
    // Process each mock message
    for (const message of CCIP_CONFIG.mockMessages) {
      try {
        await processCcipMessage(message);
        console.log(`✅ Processed message ${message.id}`);
      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error.message);
      }
    }
    
    console.log('✅ CCIP message processing complete!');
    
    // In a real implementation, this would be a service listening for CCIP events
    console.log('ℹ️ In production, this would be a service listening for CCIP events from supported chains.');
    console.log('ℹ️ For continuous monitoring, consider using a webhook service or a dedicated CCIP relayer.');
  } catch (error) {
    console.error('❌ Error in CCIP message handler:', error);
  }
}

// Run the handler
handleCcipMessages().catch(console.error);
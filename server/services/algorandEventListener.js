// server/services/algorandEventListener.js
import algosdk from 'algosdk';
import axios from 'axios'; // For making HTTP requests to your own backend API
import { supabase } from '../config/supabase.js'; // Import Supabase client

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const ALGORAND_NODE_URL = process.env.ALGORAND_NODE_URL || 'https://testnet-api.algonode.cloud';
const ALGORAND_APP_ID = parseInt(process.env.ALGORAND_APP_ID || '0');

// Initialize Algod client
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE_URL, '');

class AlgorandEventListener {
  constructor(appId) {
    this.appId = appId;
    this.lastProcessedRound = 0; // Store the last processed round to avoid reprocessing
  }

  async startListening() {
    console.log('🎧 Starting Algorand event listener...');

    try {
      // Fetch last processed round from DB or start from a recent block
      const { data, error } = await supabase.from('admin_settings').select('setting_value').eq('setting_key', 'last_algorand_round').single();
      
      if (data) {
        this.lastProcessedRound = parseInt(data.setting_value);
        console.log(`Resuming from Algorand round: ${this.lastProcessedRound}`);
      } else {
        const status = await algodClient.status().do();
        this.lastProcessedRound = status['last-round'] - 100; // Start 100 rounds back for safety
        // Ensure it's not negative
        if (this.lastProcessedRound < 0) this.lastProcessedRound = 0; 
        console.log(`Starting Algorand listener from current round - 100: ${this.lastProcessedRound}`);
        // Save initial round to DB
        await supabase.from('admin_settings').upsert({ setting_key: 'last_algorand_round', setting_value: this.lastProcessedRound.toString() });
      }
    } catch (err) {
      console.error('Error fetching last processed round from Supabase:', err.message);
      // Fallback to current round if DB fetch fails
      try {
        const status = await algodClient.status().do();
        this.lastProcessedRound = status['last-round'] - 100;
        if (this.lastProcessedRound < 0) this.lastProcessedRound = 0;
        console.log(`Fallback: Starting Algorand listener from current round - 100: ${this.lastProcessedRound}`);
      } catch (algodErr) {
        console.error('Error fetching Algorand node status:', algodErr.message);
        this.lastProcessedRound = 0; // Default to 0 if all else fails
      }
    }

    // Start polling
    setInterval(async () => {
      await this.processNewBlocks();
    }, 5000); // Poll every 5 seconds
  }

  async processNewBlocks() {
    try {
      const status = await algodClient.status().do();
      const currentRound = status['last-round'];

      if (currentRound > this.lastProcessedRound) {
        console.log(`Processing new blocks from ${this.lastProcessedRound + 1} to ${currentRound}`);
        for (let round = this.lastProcessedRound + 1; round <= currentRound; round++) {
          await this.processRound(round);
        }
        this.lastProcessedRound = currentRound;
        // Save last processed round to DB
        await supabase.from('admin_settings').upsert({ setting_key: 'last_algorand_round', setting_value: this.lastProcessedRound.toString() });
      }
    } catch (error) {
      console.error('Error processing blocks:', error.message);
    }
  }

  async processRound(round) {
    try {
      const block = await algodClient.block(round).do();
      
      if (block.block && block.block.txns) {
        for (const txn of block.block.txns) {
          // Check if it's an application call to your contract
          if (txn.txn.type === 'appl' && txn.txn.apid === this.appId) {
            await this.processCrisisManagementEvent(txn, round);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing round ${round}:`, error.message);
    }
  }

  async processCrisisManagementEvent(txn, round) {
    // Parse transaction logs and sync with Supabase
    if (txn.dt && txn.dt.lg) { // dt.lg contains base64 encoded logs
      for (const logEntry of txn.dt.lg) {
        const decodedLog = Buffer.from(logEntry, 'base64').toString();
        console.log('Decoded Algorand Log:', decodedLog);

        // Parse the log string (e.g., "EVENT_TYPE:data1:data2:...")
        const parts = decodedLog.split(':');
        const eventType = parts[0];
        const eventData = {}; // Populate this based on your log format

        // Example parsing for FIAT_DEPOSIT:FIAT_DEPOSIT:userAddress:amount:stripePaymentId:timestamp
        if (eventType === 'FIAT_DEPOSIT') {
          eventData.userAddress = parts[1];
          eventData.amount = parts[2];
          eventData.stripePaymentId = parts[3];
          eventData.timestamp = parts[4];
        } else if (eventType === 'NGO_AUTHORIZED') {
          eventData.userAddress = parts[1]; // NGO address
          eventData.rating = parts[2];
          eventData.region = parts[3];
          eventData.timestamp = parts[4];
        }
        // ... parse other event types similarly

        // Add Algorand transaction details to eventData
        eventData.algorandTxId = txn.txn.txid;
        eventData.algorandRound = round;
        eventData.algorandSender = txn.txn.snd; // Sender of the Algorand transaction

        // Send to your backend API for Supabase sync
        try {
          await axios.post(`${API_BASE_URL}/api/algorand/sync-event`, {
            event_type: eventType,
            event_data: eventData,
          });
          console.log(`Synced event ${eventType} for transaction ${txn.txn.txid}`);
        } catch (apiError) {
          console.error(`Failed to sync event ${eventType} to backend:`, apiError.message);
        }
      }
    }
  }
}

// Export the class instead of an instance
export default AlgorandEventListener;
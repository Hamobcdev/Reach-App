# Algorand Virtual Card Manager Integration Guide

## Overview

This guide explains how to integrate the Algorand Virtual Card Manager smart contract with your Bolt.new application and Supabase backend.

## Smart Contract Features

### Core Functionality
- **Multi-currency support**: ALGO, USDC, WST, USD, NZD, AUD, FJD
- **KYC tier-based limits**: Basic, Standard, Enhanced
- **Automated limit resets**: Daily and monthly spending limits
- **Chainlink integration**: Price feeds and automation
- **Event logging**: All actions logged for Supabase sync

### Contract Methods

#### User Methods
- `create_card(kyc_tier, region, currency)` - Create a new virtual card
- `fund_card()` - Add funds to card (requires payment transaction)
- `use_card(amount)` - Spend from card balance
- `deactivate_card()` - Deactivate card
- `activate_card()` - Reactivate card

#### Admin Methods
- `update_limits(address, daily_limit, monthly_limit)` - Update user limits
- `emergency_pause()` - Pause all operations
- `update_chainlink_feed(feed_id)` - Configure price feed

#### Automation Methods
- `reset_limits()` - Reset daily/monthly limits (called by Chainlink)

## Deployment Instructions

### Prerequisites
```bash
# Install Python dependencies
pip install py-algorand-sdk pyteal python-dotenv

# Set up environment variables
export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase"
export CHAINLINK_AUTOMATION_MNEMONIC="automation account mnemonic"
```

### Deploy to TestNet
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy to TestNet
./deploy.sh testnet

# Deploy to MainNet (when ready)
./deploy.sh mainnet
```

### Manual Deployment
```bash
# Compile contract
python3 virtual_card_manager.py

# Deploy contract
python3 deploy.py
```

## Bolt.new Integration

### 1. Update Environment Variables

Add to your `.env` file:
```env
# Algorand Configuration
VITE_ALGORAND_NETWORK=testnet
VITE_ALGORAND_APP_ID=your_app_id_here
VITE_ALGORAND_APP_ADDRESS=your_app_address_here

# Algorand Node
VITE_ALGORAND_NODE_URL=https://testnet-api.algonode.cloud
VITE_ALGORAND_NODE_TOKEN=

# For MainNet
# VITE_ALGORAND_NODE_URL=https://mainnet-api.algonode.cloud
```

### 2. Install Algorand SDK

```bash
npm install algosdk
```

### 3. Create Algorand Client

```javascript
// src/lib/algorand.js
import algosdk from 'algosdk';

const ALGORAND_NODE_URL = import.meta.env.VITE_ALGORAND_NODE_URL;
const ALGORAND_NODE_TOKEN = import.meta.env.VITE_ALGORAND_NODE_TOKEN || '';
const APP_ID = parseInt(import.meta.env.VITE_ALGORAND_APP_ID);

export const algodClient = new algosdk.Algodv2(
  ALGORAND_NODE_TOKEN,
  ALGORAND_NODE_URL,
  ''
);

export const APP_ID = APP_ID;
export const APP_ADDRESS = import.meta.env.VITE_ALGORAND_APP_ADDRESS;
```

### 4. Implement Card Operations

```javascript
// src/lib/virtualCardContract.js
import algosdk from 'algosdk';
import { algodClient, APP_ID } from './algorand';

export class VirtualCardContract {
  constructor(userAccount) {
    this.userAccount = userAccount;
  }

  async createCard(kycTier, region, currency) {
    const params = await algodClient.getTransactionParams().do();
    
    // First opt into the application
    const optInTxn = algosdk.makeApplicationOptInTxn(
      this.userAccount.addr,
      params,
      APP_ID
    );

    // Then create the card
    const createTxn = algosdk.makeApplicationCallTxn(
      this.userAccount.addr,
      params,
      APP_ID,
      algosdk.OnApplicationComplete.NoOpOC,
      ['create_card', kycTier, region, currency]
    );

    // Group transactions
    const txns = [optInTxn, createTxn];
    algosdk.assignGroupID(txns);

    // Sign transactions
    const signedTxns = txns.map(txn => txn.signTxn(this.userAccount.sk));

    // Submit to network
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    return this.parseCardCreatedEvent(confirmedTxn);
  }

  async fundCard(amount) {
    const params = await algodClient.getTransactionParams().do();
    
    // Payment transaction to fund the card
    const paymentTxn = algosdk.makePaymentTxn(
      this.userAccount.addr,
      APP_ADDRESS,
      amount * 1000000, // Convert to microAlgos
      undefined,
      undefined,
      params
    );

    // Application call to record funding
    const appCallTxn = algosdk.makeApplicationCallTxn(
      this.userAccount.addr,
      params,
      APP_ID,
      algosdk.OnApplicationComplete.NoOpOC,
      ['fund_card']
    );

    // Group transactions
    const txns = [paymentTxn, appCallTxn];
    algosdk.assignGroupID(txns);

    // Sign and submit
    const signedTxns = txns.map(txn => txn.signTxn(this.userAccount.sk));
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
    
    return await algosdk.waitForConfirmation(algodClient, txId, 4);
  }

  async useCard(amount) {
    const params = await algodClient.getTransactionParams().do();
    
    const txn = algosdk.makeApplicationCallTxn(
      this.userAccount.addr,
      params,
      APP_ID,
      algosdk.OnApplicationComplete.NoOpOC,
      ['use_card', amount * 1000000] // Convert to microAlgos
    );

    const signedTxn = txn.signTxn(this.userAccount.sk);
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    return await algosdk.waitForConfirmation(algodClient, txId, 4);
  }

  parseCardCreatedEvent(confirmedTxn) {
    // Parse logs to extract card information
    if (confirmedTxn.logs) {
      for (const log of confirmedTxn.logs) {
        const decodedLog = Buffer.from(log, 'base64').toString();
        if (decodedLog.startsWith('CardCreated:')) {
          const parts = decodedLog.split(':');
          return {
            cardId: parts[1],
            userAddress: parts[2],
            kycTier: parseInt(parts[3]),
            region: parts[4],
            currency: parts[5]
          };
        }
      }
    }
    return null;
  }
}
```

## Supabase Integration

### 1. Update Sync Endpoint

Modify your existing `/api/algorand/card-sync` endpoint to handle Algorand events:

```javascript
// server/routes/algorand-sync.js
app.post('/api/algorand/card-sync', async (req, res) => {
  const {
    cardId,
    userAddress,
    balance,
    currency,
    kycTier,
    region,
    isActive,
    transactionHash,
    blockNumber
  } = req.body;

  // Validate Algorand address
  if (!isValidAlgorandAddress(userAddress)) {
    return res.status(400).json({ error: 'Invalid Algorand address' });
  }

  // Sync with existing logic...
  const result = await supabase.rpc('sync_blockchain_card', {
    p_card_id: cardId,
    p_user_address: userAddress,
    p_balance: balance,
    p_currency: currency,
    p_kyc_tier: kycTier,
    p_region: region,
    p_is_active: isActive,
    p_transaction_hash: transactionHash,
    p_block_number: blockNumber
  });

  res.json({ success: true, data: result });
});
```

### 2. Event Listener Service

Create a service to listen for Algorand events:

```javascript
// server/services/algorandEventListener.js
import algosdk from 'algosdk';
import { supabase } from '../config/supabase.js';

class AlgorandEventListener {
  constructor(algodClient, appId) {
    this.algodClient = algodClient;
    this.appId = appId;
    this.lastProcessedRound = 0;
  }

  async startListening() {
    console.log('🎧 Starting Algorand event listener...');
    
    setInterval(async () => {
      await this.processNewBlocks();
    }, 5000); // Check every 5 seconds
  }

  async processNewBlocks() {
    try {
      const status = await this.algodClient.status().do();
      const currentRound = status['last-round'];

      if (currentRound > this.lastProcessedRound) {
        for (let round = this.lastProcessedRound + 1; round <= currentRound; round++) {
          await this.processRound(round);
        }
        this.lastProcessedRound = currentRound;
      }
    } catch (error) {
      console.error('Error processing blocks:', error);
    }
  }

  async processRound(round) {
    try {
      const block = await this.algodClient.block(round).do();
      
      if (block.block && block.block.txns) {
        for (const txn of block.block.txns) {
          if (this.isVirtualCardTransaction(txn)) {
            await this.processVirtualCardEvent(txn, round);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing round ${round}:`, error);
    }
  }

  isVirtualCardTransaction(txn) {
    return txn.txn && 
           txn.txn.apid === this.appId && 
           txn.txn.type === 'appl';
  }

  async processVirtualCardEvent(txn, round) {
    // Parse transaction logs and sync with Supabase
    if (txn.dt && txn.dt.lg) {
      for (const log of txn.dt.lg) {
        const decodedLog = Buffer.from(log, 'base64').toString();
        await this.syncEventToSupabase(decodedLog, txn, round);
      }
    }
  }

  async syncEventToSupabase(logData, txn, round) {
    // Parse different event types and sync to Supabase
    if (logData.startsWith('CardCreated:')) {
      await this.syncCardCreated(logData, txn, round);
    } else if (logData.startsWith('CardFunded:')) {
      await this.syncCardFunded(logData, txn, round);
    } else if (logData.startsWith('CardUsed:')) {
      await this.syncCardUsed(logData, txn, round);
    }
  }

  async syncCardCreated(logData, txn, round) {
    const parts = logData.split(':');
    const cardData = {
      cardId: parts[1],
      userAddress: parts[2],
      kycTier: parts[3],
      region: parts[4],
      currency: parts[5],
      balance: 0,
      isActive: true,
      transactionHash: txn.txn.txid,
      blockNumber: round
    };

    // Call your existing sync endpoint
    await fetch('http://localhost:3001/api/algorand/card-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData)
    });
  }
}

export default AlgorandEventListener;
```

## Chainlink Integration

### 1. Automation Setup

The contract includes Chainlink automation support for:
- Daily limit resets (called at midnight UTC)
- Monthly limit resets (called on the 1st of each month)
- Price feed updates

### 2. Automation Configuration

```python
# Set up Chainlink automation
python3 chainlink_automation.py
```

### 3. Price Feed Integration

For production, integrate with Chainlink price feeds:

```javascript
// Example: Get ALGO/USD price from Chainlink
const getAlgoPrice = async () => {
  // This would call your Chainlink price feed
  // For now, use a mock price
  return 0.25; // $0.25 per ALGO
};
```

## Testing

### 1. Local Testing

```bash
# Test contract compilation
python3 virtual_card_manager.py

# Test deployment (TestNet)
python3 deploy.py
```

### 2. Integration Testing

```javascript
// Test card creation
const contract = new VirtualCardContract(userAccount);
const cardInfo = await contract.createCard(1, 'samoa', 'ALGO');
console.log('Card created:', cardInfo);

// Test funding
await contract.fundCard(10); // Fund with 10 ALGO

// Test usage
await contract.useCard(5); // Spend 5 ALGO
```

### 3. Supabase Sync Testing

```bash
# Test sync endpoint
curl -X POST http://localhost:3001/api/algorand/card-sync \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "card_123",
    "userAddress": "ALGORAND_ADDRESS",
    "balance": 100,
    "currency": "ALGO",
    "kycTier": "BASIC",
    "region": "samoa",
    "isActive": true
  }'
```

## Production Deployment

### 1. MainNet Deployment

```bash
# Deploy to MainNet
export DEPLOYER_MNEMONIC="your mainnet mnemonic"
./deploy.sh mainnet
```

### 2. Security Considerations

- Use hardware wallets for MainNet deployment
- Set up proper key management for automation accounts
- Enable monitoring and alerting
- Implement emergency pause mechanisms
- Regular security audits

### 3. Monitoring

- Monitor contract balance and transactions
- Set up alerts for unusual activity
- Track gas costs and optimization opportunities
- Monitor Chainlink automation performance

## Support

For issues and questions:
1. Check the deployment logs
2. Verify environment variables
3. Test on TestNet first
4. Review Algorand documentation
5. Contact the development team

## Resources

- [Algorand Developer Portal](https://developer.algorand.org/)
- [PyTeal Documentation](https://pyteal.readthedocs.io/)
- [Algorand SDK Documentation](https://py-algorand-sdk.readthedocs.io/)
- [Chainlink Documentation](https://docs.chain.link/)
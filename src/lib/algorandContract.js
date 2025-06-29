// Algorand Crisis Management Contract Integration for Bolt.new
import algosdk from 'algosdk';

// Configuration
const ALGORAND_NODE_URL = import.meta.env.VITE_ALGORAND_NODE_URL || 'https://testnet-api.algonode.cloud';
const ALGORAND_NODE_TOKEN = import.meta.env.VITE_ALGORAND_NODE_TOKEN || '';
const APP_ID = parseInt(import.meta.env.VITE_ALGORAND_APP_ID || '0');
const APP_ADDRESS = import.meta.env.VITE_ALGORAND_APP_ADDRESS;

// Initialize Algod client
export const algodClient = new algosdk.Algodv2(
  ALGORAND_NODE_TOKEN,
  ALGORAND_NODE_URL,
  ''
);

export class CrisisManagementClient {
  constructor(userAccount) {
    this.userAccount = userAccount;
    this.appId = APP_ID;
    this.appAddress = APP_ADDRESS;
  }

  /**
   * Authorize an NGO
   * @param {string} ngoAddress - NGO's Algorand address
   * @param {number} rating - NGO rating (1-10)
   * @param {string} region - NGO's operating region
   * @returns {Promise<Object>} Authorization result
   */
  async authorizeNgo(ngoAddress, rating, region) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('authorize_ngo')),
          new Uint8Array(Buffer.from(ngoAddress)),
          algosdk.encodeUint64(rating),
          new Uint8Array(Buffer.from(region))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        transactionId: txId,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error) {
      console.error('Error authorizing NGO:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Issue a crisis badge to a user
   * @param {string} userAddress - User's Algorand address
   * @param {string} caseId - Emergency case ID
   * @param {string} crisisType - Type of crisis
   * @param {number} severity - Severity level (1-5)
   * @returns {Promise<Object>} Badge issuance result
   */
  async issueCrisisBadge(userAddress, caseId, crisisType, severity) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('issue_crisis_badge')),
          new Uint8Array(Buffer.from(userAddress)),
          new Uint8Array(Buffer.from(caseId)),
          new Uint8Array(Buffer.from(crisisType)),
          algosdk.encodeUint64(severity)
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        transactionId: txId,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error) {
      console.error('Error issuing crisis badge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform emergency disbursal to a user
   * @param {string} userAddress - User's Algorand address
   * @param {number} amount - Amount to disburse
   * @param {string} caseId - Emergency case ID
   * @returns {Promise<Object>} Disbursal result
   */
  async emergencyDisbursal(userAddress, amount, caseId) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('emergency_disbursal')),
          new Uint8Array(Buffer.from(userAddress)),
          algosdk.encodeUint64(Math.floor(amount * 1000000)), // Convert to microAlgos
          new Uint8Array(Buffer.from(caseId))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        transactionId: txId,
        amount: amount,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error) {
      console.error('Error performing emergency disbursal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transfer tokens between users
   * @param {string} toAddress - Recipient's Algorand address
   * @param {number} amount - Amount to transfer
   * @param {string} reference - Transfer reference
   * @returns {Promise<Object>} Transfer result
   */
  async transferTokens(toAddress, amount, reference) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('transfer_tokens')),
          new Uint8Array(Buffer.from(toAddress)),
          algosdk.encodeUint64(Math.floor(amount * 1000000)), // Convert to microAlgos
          new Uint8Array(Buffer.from(reference))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        transactionId: txId,
        amount: amount,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error) {
      console.error('Error transferring tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a virtual card
   * @param {number} cardLimit - Card spending limit
   * @param {string} cardType - Type of virtual card
   * @returns {Promise<Object>} Card creation result
   */
  async createVirtualCard(cardLimit, cardType) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('create_virtual_card')),
          algosdk.encodeUint64(Math.floor(cardLimit * 1000000)), // Convert to microAlgos
          new Uint8Array(Buffer.from(cardType))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        transactionId: txId,
        cardLimit: cardLimit,
        cardType: cardType,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error) {
      console.error('Error creating virtual card:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update system settings
   * @param {string} settingKey - Setting key to update
   * @param {number} settingValue - New setting value
   * @param {string} reason - Reason for update
   * @returns {Promise<Object>} Update result
   */
  async updateSystemSettings(settingKey, settingValue, reason) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('update_system_settings')),
          new Uint8Array(Buffer.from(settingKey)),
          algosdk.encodeUint64(Math.floor(settingValue)),
          new Uint8Array(Buffer.from(reason))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        transactionId: txId,
        settingKey: settingKey,
        settingValue: settingValue,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error) {
      console.error('Error updating system settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user balance
   * @param {string} userAddress - User's Algorand address
   * @returns {Promise<number>} User balance
   */
  async getUserBalance(userAddress) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('get_user_balance')),
          new Uint8Array(Buffer.from(userAddress))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      // Parse return value from transaction logs
      if (confirmedTxn.logs && confirmedTxn.logs.length > 0) {
        const returnValue = Buffer.from(confirmedTxn.logs[0], 'base64').toString();
        return parseInt(returnValue) / 1000000; // Convert from microAlgos
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Get system status
   * @returns {Promise<Object>} System status
   */
  async getSystemStatus() {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('get_system_status'))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      // Parse return values from transaction logs
      if (confirmedTxn.logs && confirmedTxn.logs.length > 0) {
        const returnValues = Buffer.from(confirmedTxn.logs[0], 'base64').toString().split(':');
        return {
          systemActive: parseInt(returnValues[0]),
          liquidityPool: parseInt(returnValues[1]) / 1000000, // Convert from microAlgos
          tokenTotal: parseInt(returnValues[2]) / 1000000 // Convert from microAlgos
        };
      }
      
      return {
        systemActive: 0,
        liquidityPool: 0,
        tokenTotal: 0
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        systemActive: 0,
        liquidityPool: 0,
        tokenTotal: 0
      };
    }
  }

  /**
   * Get NGO status
   * @param {string} ngoAddress - NGO's Algorand address
   * @returns {Promise<Array<number>>} NGO status [authorized, rating]
   */
  async getNgoStatus(ngoAddress) {
    try {
      const params = await algodClient.getTransactionParams().do();
      
      const txn = algosdk.makeApplicationCallTxn(
        this.userAccount.addr,
        params,
        this.appId,
        algosdk.OnApplicationComplete.NoOpOC,
        [
          new Uint8Array(Buffer.from('get_ngo_status')),
          new Uint8Array(Buffer.from(ngoAddress))
        ]
      );

      const signedTxn = txn.signTxn(this.userAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      // Parse return values from transaction logs
      if (confirmedTxn.logs && confirmedTxn.logs.length > 0) {
        const returnValues = Buffer.from(confirmedTxn.logs[0], 'base64').toString().split(':');
        return [parseInt(returnValues[0]), parseInt(returnValues[1])];
      }
      
      return [0, 0]; // Not authorized, no rating
    } catch (error) {
      console.error('Error getting NGO status:', error);
      return [0, 0]; // Not authorized, no rating
    }
  }
}

// Utility functions
export const algorandUtils = {
  /**
   * Generate a new Algorand account
   * @returns {Object} Account with address and private key
   */
  generateAccount() {
    const account = algosdk.generateAccount();
    return {
      addr: account.addr,
      sk: account.sk,
      mnemonic: algosdk.secretKeyToMnemonic(account.sk)
    };
  },

  /**
   * Import account from mnemonic
   * @param {string} mnemonic - 25-word mnemonic phrase
   * @returns {Object} Account object
   */
  importAccount(mnemonic) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    return {
      addr: account.addr,
      sk: account.sk,
      mnemonic: mnemonic
    };
  },

  /**
   * Get account balance
   * @param {string} address - Account address
   * @returns {Promise<number>} Balance in ALGO
   */
  async getBalance(address) {
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      return accountInfo.amount / 1000000; // Convert from microAlgos
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  },

  /**
   * Format ALGO amount for display
   * @param {number} microAlgos - Amount in microAlgos
   * @returns {string} Formatted amount
   */
  formatAlgo(microAlgos) {
    return (microAlgos / 1000000).toFixed(6) + ' ALGO';
  },

  /**
   * Validate Algorand address
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid address
   */
  isValidAddress(address) {
    try {
      algosdk.decodeAddress(address);
      return true;
    } catch {
      return false;
    }
  }
};

export default CrisisManagementClient;
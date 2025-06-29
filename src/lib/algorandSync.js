// Algorand Card Sync API helpers for frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const algorandSyncAPI = {
  /**
   * Sync blockchain card event data with Supabase
   * @param {Object} cardData - Card data from blockchain
   * @returns {Promise<Object>} Sync result
   */
  async syncCard(cardData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/algorand/card-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync card');
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Card sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get virtual card information
   * @param {string} cardId - Blockchain card ID
   * @returns {Promise<Object>} Card information
   */
  async getCard(cardId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/algorand/card/${cardId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get card');
      }

      return {
        success: true,
        data: result.card
      };
    } catch (error) {
      console.error('Get card error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get card activity history
   * @param {string} cardId - Blockchain card ID
   * @param {number} limit - Number of activities to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Card activity history
   */
  async getCardActivity(cardId, limit = 20, offset = 0) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/algorand/card/${cardId}/activity?limit=${limit}&offset=${offset}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get card activity');
      }

      return {
        success: true,
        data: result.activities,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Get card activity error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get all cards for a user address
   * @param {string} userAddress - Algorand wallet address
   * @param {boolean} activeOnly - Only return active cards
   * @returns {Promise<Object>} User's cards
   */
  async getUserCards(userAddress, activeOnly = false) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/algorand/cards/user/${userAddress}?active_only=${activeOnly}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get user cards');
      }

      return {
        success: true,
        data: result.cards,
        total: result.total
      };
    } catch (error) {
      console.error('Get user cards error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Log card activity manually
   * @param {string} cardId - Blockchain card ID
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Log result
   */
  async logActivity(cardId, activityData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/algorand/card/${cardId}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to log activity');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Log activity error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Utility functions for Algorand integration
export const algorandUtils = {
  /**
   * Validate Algorand address format
   * @param {string} address - Algorand address
   * @returns {boolean} Is valid address
   */
  isValidAddress(address) {
    const algorandAddressRegex = /^[A-Z2-7]{58}$/;
    return algorandAddressRegex.test(address);
  },

  /**
   * Format balance for display
   * @param {number} balance - Balance in microAlgos or base units
   * @param {string} currency - Currency type
   * @returns {string} Formatted balance
   */
  formatBalance(balance, currency = 'ALGO') {
    if (currency === 'ALGO') {
      // Convert microAlgos to Algos
      return (balance / 1000000).toFixed(6);
    } else if (currency === 'USDC') {
      // USDC has 6 decimal places
      return (balance / 1000000).toFixed(6);
    }
    return balance.toString();
  },

  /**
   * Generate card ID from transaction data
   * @param {string} userAddress - User's Algorand address
   * @param {number} timestamp - Creation timestamp
   * @returns {string} Generated card ID
   */
  generateCardId(userAddress, timestamp) {
    const shortAddress = userAddress.substring(0, 8);
    const timeStr = timestamp.toString();
    return `algo_${shortAddress}_${timeStr}`;
  },

  /**
   * Parse blockchain metadata
   * @param {Object} rawMetadata - Raw metadata from blockchain
   * @returns {Object} Parsed metadata
   */
  parseMetadata(rawMetadata) {
    try {
      if (typeof rawMetadata === 'string') {
        return JSON.parse(rawMetadata);
      }
      return rawMetadata || {};
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return {};
    }
  },

  /**
   * Determine KYC tier from blockchain data
   * @param {Object} blockchainData - Data from smart contract
   * @returns {string} KYC tier
   */
  determineKYCTier(blockchainData) {
    const { kycLevel, verificationScore } = blockchainData;
    
    if (kycLevel >= 3 || verificationScore >= 90) return 'ENHANCED';
    if (kycLevel >= 2 || verificationScore >= 70) return 'STANDARD';
    return 'BASIC';
  },

  /**
   * Map blockchain region to system region
   * @param {string} blockchainRegion - Region from blockchain
   * @returns {string} System region
   */
  mapRegion(blockchainRegion) {
    const regionMap = {
      'samoa': 'samoa',
      'fiji': 'pacific',
      'tonga': 'pacific',
      'vanuatu': 'pacific',
      'pacific': 'pacific',
      'global': 'global'
    };
    
    return regionMap[blockchainRegion?.toLowerCase()] || 'samoa';
  }
};

// React hook for Algorand sync operations
export const useAlgorandSync = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const syncCard = async (cardData) => {
    setLoading(true);
    setError(null);
    
    const result = await algorandSyncAPI.syncCard(cardData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const getCard = async (cardId) => {
    setLoading(true);
    setError(null);
    
    const result = await algorandSyncAPI.getCard(cardId);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const getUserCards = async (userAddress, activeOnly = false) => {
    setLoading(true);
    setError(null);
    
    const result = await algorandSyncAPI.getUserCards(userAddress, activeOnly);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const getCardActivity = async (cardId, limit = 20, offset = 0) => {
    setLoading(true);
    setError(null);
    
    const result = await algorandSyncAPI.getCardActivity(cardId, limit, offset);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  return {
    loading,
    error,
    syncCard,
    getCard,
    getUserCards,
    getCardActivity
  };
};
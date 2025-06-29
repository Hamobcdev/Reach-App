// Stripe Customer API helpers for frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const stripeCustomerAPI = {
  /**
   * Create or get Stripe customer for a user
   * @param {string} userId - Supabase user ID
   * @param {string} email - User email (optional)
   * @param {string} currency - Wallet currency (default: USD)
   * @returns {Promise<Object>} Stripe customer and wallet information
   */
  async createCustomer(userId, email = null, currency = 'USD') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/create-stripe-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email,
          currency
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Stripe customer');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Stripe customer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get existing Stripe customer information
   * @param {string} userId - Supabase user ID
   * @returns {Promise<Object>} Stripe customer information
   */
  async getCustomer(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-customer/${userId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get Stripe customer');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Stripe customer fetch error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Update Stripe customer information
   * @param {string} userId - Supabase user ID
   * @param {Object} updateData - Data to update (email, name, phone)
   * @returns {Promise<Object>} Updated customer information
   */
  async updateCustomer(userId, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-customer/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update Stripe customer');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Stripe customer update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Ensure user has both Stripe customer and wallet set up
   * @param {Object} user - Supabase user object
   * @param {string} currency - Preferred currency
   * @returns {Promise<Object>} Setup result
   */
  async ensureUserSetup(user, currency = 'USD') {
    if (!user || !user.id) {
      return {
        success: false,
        error: 'User information required'
      };
    }

    try {
      // First try to get existing customer
      const existingResult = await this.getCustomer(user.id);
      
      if (existingResult.success) {
        return {
          success: true,
          data: {
            stripe_customer_id: existingResult.data.stripe_customer.id,
            customer_created: false,
            message: 'Existing Stripe customer found'
          }
        };
      }

      // If no existing customer, create one
      const createResult = await this.createCustomer(user.id, user.email, currency);
      
      if (createResult.success) {
        return {
          success: true,
          data: {
            ...createResult.data,
            message: createResult.data.customer_created 
              ? 'New Stripe customer created' 
              : 'Existing Stripe customer linked'
          }
        };
      }

      return createResult;
    } catch (error) {
      console.error('User setup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Hook for React components
export const useStripeCustomer = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const createCustomer = async (userId, email, currency) => {
    setLoading(true);
    setError(null);
    
    const result = await stripeCustomerAPI.createCustomer(userId, email, currency);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const getCustomer = async (userId) => {
    setLoading(true);
    setError(null);
    
    const result = await stripeCustomerAPI.getCustomer(userId);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const updateCustomer = async (userId, updateData) => {
    setLoading(true);
    setError(null);
    
    const result = await stripeCustomerAPI.updateCustomer(userId, updateData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const ensureUserSetup = async (user, currency) => {
    setLoading(true);
    setError(null);
    
    const result = await stripeCustomerAPI.ensureUserSetup(user, currency);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  return {
    loading,
    error,
    createCustomer,
    getCustomer,
    updateCustomer,
    ensureUserSetup
  };
};
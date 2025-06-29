import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Validation middleware
const validateCreateCustomer = [
  body('user_id')
    .isUUID()
    .withMessage('Valid user ID is required'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email address required'),
  body('currency')
    .optional()
    .isIn(['USD', 'WST', 'NZD', 'AUD', 'FJD'])
    .withMessage('Invalid currency')
];

/**
 * POST /api/create-stripe-customer
 * Creates a Stripe customer and ensures user has a wallet
 */
router.post('/create-stripe-customer', validateCreateCustomer, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { user_id, email, currency = 'USD' } = req.body;

    // First, get user information from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let stripeCustomerId = user.stripe_customer_id;
    let customerCreated = false;

    // If user doesn't have a Stripe customer ID, create one
    if (!stripeCustomerId) {
      try {
        const customerEmail = email || user.email;
        
        if (!customerEmail) {
          return res.status(400).json({
            success: false,
            error: 'Email is required to create Stripe customer'
          });
        }

        // Check if customer already exists with this email
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          // Use existing customer
          stripeCustomerId = existingCustomers.data[0].id;
        } else {
          // Create new Stripe customer
          const stripeCustomer = await stripe.customers.create({
            email: customerEmail,
            metadata: {
              user_id: user_id,
              platform: 'samoa_virtual_bankcard',
              created_via: 'api'
            },
            description: `Samoa Virtual Bankcard user: ${customerEmail}`
          });

          stripeCustomerId = stripeCustomer.id;
          customerCreated = true;
        }

        // Update user record with Stripe customer ID
        const { error: updateError } = await supabase
          .rpc('update_user_stripe_customer', {
            p_user_id: user_id,
            p_stripe_customer_id: stripeCustomerId
          });

        if (updateError) {
          console.error('Error updating user Stripe customer ID:', updateError);
          // Don't fail the request, just log the error
        }

      } catch (stripeError) {
        console.error('Stripe customer creation error:', stripeError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create Stripe customer',
          details: stripeError.message
        });
      }
    }

    // Ensure user has a wallet
    const { data: walletResult, error: walletError } = await supabase
      .rpc('ensure_user_wallet', {
        p_user_id: user_id,
        p_currency: currency,
        p_stripe_customer_id: stripeCustomerId
      });

    if (walletError) {
      console.error('Wallet creation error:', walletError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create or update wallet',
        details: walletError.message
      });
    }

    // Log the event
    await supabase
      .from('events')
      .insert({
        user_id: user_id,
        type: 'stripe_customer_created',
        data: {
          stripe_customer_id: stripeCustomerId,
          customer_created: customerCreated,
          wallet_created: walletResult.wallet_created,
          currency: currency
        }
      });

    // Return success response
    res.json({
      success: true,
      stripe_customer_id: stripeCustomerId,
      customer_created: customerCreated,
      wallet: {
        id: walletResult.wallet_id,
        balance: walletResult.balance,
        currency: walletResult.currency,
        daily_limit: walletResult.daily_limit,
        monthly_limit: walletResult.monthly_limit,
        is_active: walletResult.is_active,
        wallet_created: walletResult.wallet_created
      }
    });

  } catch (error) {
    console.error('Create Stripe customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/stripe-customer/:userId
 * Get Stripe customer information for a user
 */
router.get('/stripe-customer/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.stripe_customer_id) {
      return res.status(404).json({
        success: false,
        error: 'No Stripe customer found for this user'
      });
    }

    // Get Stripe customer details
    try {
      const stripeCustomer = await stripe.customers.retrieve(user.stripe_customer_id);
      
      res.json({
        success: true,
        stripe_customer: {
          id: stripeCustomer.id,
          email: stripeCustomer.email,
          created: stripeCustomer.created,
          metadata: stripeCustomer.metadata
        }
      });

    } catch (stripeError) {
      console.error('Stripe customer retrieval error:', stripeError);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Stripe customer',
        details: stripeError.message
      });
    }

  } catch (error) {
    console.error('Get Stripe customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/stripe-customer/:userId
 * Update Stripe customer information
 */
router.put('/stripe-customer/:userId', [
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { email, name, phone } = req.body;

    // Get user's Stripe customer ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.stripe_customer_id) {
      return res.status(404).json({
        success: false,
        error: 'User or Stripe customer not found'
      });
    }

    // Update Stripe customer
    const updateData = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    try {
      const updatedCustomer = await stripe.customers.update(
        user.stripe_customer_id,
        updateData
      );

      res.json({
        success: true,
        stripe_customer: {
          id: updatedCustomer.id,
          email: updatedCustomer.email,
          name: updatedCustomer.name,
          phone: updatedCustomer.phone
        }
      });

    } catch (stripeError) {
      console.error('Stripe customer update error:', stripeError);
      res.status(500).json({
        success: false,
        error: 'Failed to update Stripe customer',
        details: stripeError.message
      });
    }

  } catch (error) {
    console.error('Update Stripe customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
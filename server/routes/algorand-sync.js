import express from 'express';
import { supabase } from '../config/supabase.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware for card sync
const validateCardSync = [
  body('cardId')
    .notEmpty()
    .withMessage('Card ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Card ID must be 1-100 characters'),
  body('userAddress')
    .notEmpty()
    .withMessage('User address is required')
    .isLength({ min: 10, max: 200 })
    .withMessage('User address must be 10-200 characters'),
  body('balance')
    .isFloat({ min: 0 })
    .withMessage('Balance must be a positive number'),
  body('currency')
    .optional()
    .isIn(['ALGO', 'USDC', 'WST', 'USD', 'NZD', 'AUD', 'FJD'])
    .withMessage('Invalid currency'),
  body('kycTier')
    .optional()
    .isIn(['BASIC', 'STANDARD', 'ENHANCED'])
    .withMessage('Invalid KYC tier'),
  body('region')
    .optional()
    .isIn(['samoa', 'pacific', 'global'])
    .withMessage('Invalid region'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Helper function to validate Algorand address format
const isValidAlgorandAddress = (address) => {
  // Basic Algorand address validation (58 characters, base32)
  const algorandAddressRegex = /^[A-Z2-7]{58}$/;
  return algorandAddressRegex.test(address);
};

// Helper function to determine sync action based on balance change
const determineSyncAction = (previousBalance, newBalance, isNewCard) => {
  if (isNewCard) return 'created';
  if (newBalance > previousBalance) return 'funded';
  if (newBalance < previousBalance) return 'spent';
  return 'synced';
};

/**
 * POST /api/algorand/card-sync
 * Sync blockchain card event data with Supabase
 */
router.post('/card-sync', validateCardSync, async (req, res) => {
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

    const {
      cardId,
      userAddress,
      balance,
      currency = 'ALGO',
      kycTier = 'BASIC',
      region = 'samoa',
      isActive = true,
      transactionHash,
      blockNumber,
      metadata
    } = req.body;

    // Validate Algorand address format
    if (!isValidAlgorandAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format'
      });
    }

    // Additional validation for blockchain data
    if (blockNumber && (!Number.isInteger(blockNumber) || blockNumber < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Block number must be a positive integer'
      });
    }

    if (transactionHash && (typeof transactionHash !== 'string' || transactionHash.length < 10)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format'
      });
    }

    // Prepare metadata for blockchain storage
    const blockchainMetadata = {
      ...metadata,
      sync_timestamp: new Date().toISOString(),
      source: 'algorand_blockchain',
      transaction_hash: transactionHash,
      block_number: blockNumber
    };

    // Sync card data using database function
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_blockchain_card', {
        p_card_id: cardId,
        p_user_address: userAddress,
        p_balance: parseFloat(balance),
        p_currency: currency,
        p_kyc_tier: kycTier,
        p_region: region,
        p_is_active: isActive,
        p_transaction_hash: transactionHash,
        p_block_number: blockNumber,
        p_metadata: blockchainMetadata
      });

    if (syncError) {
      console.error('Card sync error:', syncError);
      return res.status(500).json({
        success: false,
        error: 'Failed to sync card data',
        details: syncError.message
      });
    }

    // Log the sync event in the main events table
    await supabase
      .from('events')
      .insert({
        user_id: syncResult.user_id,
        type: 'algorand_card_sync',
        data: {
          card_id: cardId,
          user_address: userAddress,
          balance: parseFloat(balance),
          currency,
          kyc_tier: kycTier,
          region,
          is_active: isActive,
          card_created: syncResult.card_created,
          balance_changed: syncResult.balance_changed,
          previous_balance: syncResult.previous_balance,
          transaction_hash: transactionHash,
          block_number: blockNumber,
          sync_timestamp: new Date().toISOString()
        }
      });

    // Return success response
    res.json({
      success: true,
      message: syncResult.card_created ? 'Card created successfully' : 'Card updated successfully',
      data: {
        cardId: cardId,
        userAddress: userAddress,
        userId: syncResult.user_id,
        balance: parseFloat(balance),
        currency: currency,
        kycTier: kycTier,
        region: region,
        isActive: isActive,
        cardCreated: syncResult.card_created,
        balanceChanged: syncResult.balance_changed,
        previousBalance: syncResult.previous_balance,
        newBalance: parseFloat(balance),
        activityId: syncResult.activity_id,
        syncedAt: syncResult.synced_at,
        transactionHash: transactionHash,
        blockNumber: blockNumber
      }
    });

  } catch (error) {
    console.error('Algorand card sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/algorand/card/:cardId
 * Get virtual card information
 */
router.get('/card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const { data: card, error } = await supabase
      .from('virtual_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (error || !card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      card: {
        id: card.id,
        userAddress: card.user_address,
        userId: card.user_id,
        currency: card.currency,
        balance: card.balance,
        kycTier: card.kyc_tier,
        region: card.region,
        isActive: card.is_active,
        blockchainData: card.blockchain_data,
        createdAt: card.created_at,
        lastSyncedAt: card.last_synced_at,
        updatedAt: card.updated_at
      }
    });

  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/algorand/card/:cardId/activity
 * Get card activity history
 */
router.get('/card/:cardId/activity', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Validate card exists
    const { data: card, error: cardError } = await supabase
      .from('virtual_cards')
      .select('id')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Get activity using database function
    const { data: activities, error: activityError } = await supabase
      .rpc('get_card_activity', {
        p_card_id: cardId,
        p_limit: parseInt(limit),
        p_offset: parseInt(offset)
      });

    if (activityError) {
      console.error('Activity fetch error:', activityError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch card activity'
      });
    }

    res.json({
      success: true,
      activities: activities || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: activities?.length || 0
      }
    });

  } catch (error) {
    console.error('Get card activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/algorand/cards/user/:userAddress
 * Get all cards for a user address
 */
router.get('/cards/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { active_only = false } = req.query;

    let query = supabase
      .from('virtual_cards')
      .select('*')
      .eq('user_address', userAddress)
      .order('created_at', { ascending: false });

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: cards, error } = await query;

    if (error) {
      console.error('User cards fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user cards'
      });
    }

    res.json({
      success: true,
      cards: cards.map(card => ({
        id: card.id,
        userAddress: card.user_address,
        userId: card.user_id,
        currency: card.currency,
        balance: card.balance,
        kycTier: card.kyc_tier,
        region: card.region,
        isActive: card.is_active,
        createdAt: card.created_at,
        lastSyncedAt: card.last_synced_at
      })),
      total: cards.length
    });

  } catch (error) {
    console.error('Get user cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/algorand/card/:cardId/activity
 * Manually log card activity (for testing or admin purposes)
 */
router.post('/card/:cardId/activity', [
  body('action')
    .isIn(['created', 'funded', 'spent', 'refunded', 'activated', 'deactivated', 'synced'])
    .withMessage('Invalid action'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be positive'),
  body('source')
    .optional()
    .isIn(['blockchain', 'api', 'admin', 'user'])
    .withMessage('Invalid source')
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

    const { cardId } = req.params;
    const {
      action,
      amount = 0,
      source = 'api',
      transactionHash,
      blockNumber,
      metadata
    } = req.body;

    // Log activity using database function
    const { data: activityId, error: logError } = await supabase
      .rpc('log_card_activity', {
        p_card_id: cardId,
        p_action: action,
        p_amount: parseFloat(amount),
        p_source: source,
        p_transaction_hash: transactionHash,
        p_block_number: blockNumber,
        p_metadata: metadata
      });

    if (logError) {
      console.error('Activity log error:', logError);
      return res.status(500).json({
        success: false,
        error: 'Failed to log activity',
        details: logError.message
      });
    }

    res.json({
      success: true,
      message: 'Activity logged successfully',
      activityId: activityId
    });

  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * NEW ENDPOINT: POST /api/algorand/sync-event
 * Receives parsed Algorand event data from the event listener and calls Supabase RPC.
 */
router.post('/sync-event', [
  body('event_type').notEmpty().withMessage('Event type is required'),
  body('event_data').isObject().withMessage('Event data must be an object')
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

    const { event_type, event_data } = req.body;
    console.log(`Received event for sync: ${event_type}`, event_data);

    // Call the Supabase RPC function to handle the event
    const { data, error } = await supabase.rpc('sync_algorand_event', {
      p_event_type: event_type,
      p_event_data: event_data
    });

    if (error) {
      console.error(`Error calling sync_algorand_event RPC for ${event_type}:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to process Algorand event: ${error.message}`
      });
    }

    res.json({
      success: true,
      message: `Algorand event ${event_type} processed successfully`,
      result: data
    });

  } catch (error) {
    console.error('Algorand sync-event endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;
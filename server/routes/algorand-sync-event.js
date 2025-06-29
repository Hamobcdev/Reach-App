import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/algorand/sync-event
 * Sync Algorand contract events with Supabase
 */
router.post('/sync-event', async (req, res) => {
  try {
    const { event_type, event_data } = req.body;

    if (!event_type || !event_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing event type or data'
      });
    }

    console.log(`Processing ${event_type} event:`, event_data);

    // Process different event types
    let result;
    switch (event_type) {
      case 'FIAT_DEPOSIT':
        result = await processFiatDeposit(event_data);
        break;
      case 'NGO_AUTHORIZED':
        result = await processNgoAuthorized(event_data);
        break;
      case 'CRISIS_BADGE_ISSUED':
        result = await processCrisisBadgeIssued(event_data);
        break;
      case 'EMERGENCY_DISBURSAL':
        result = await processEmergencyDisbursal(event_data);
        break;
      case 'TOKEN_TRANSFER':
        result = await processTokenTransfer(event_data);
        break;
      case 'VIRTUAL_CARD_CREATED':
        result = await processVirtualCardCreated(event_data);
        break;
      case 'SYSTEM_UPDATED':
        result = await processSystemUpdated(event_data);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown event type: ${event_type}`
        });
    }

    // Log the event in the events table
    await supabase.from('events').insert({
      type: `algorand_${event_type.toLowerCase()}`,
      data: {
        ...event_data,
        processed_at: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: `Successfully processed ${event_type} event`,
      data: result
    });

  } catch (error) {
    console.error(`Error processing Algorand event:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Algorand event',
      details: error.message
    });
  }
});

// Process FIAT_DEPOSIT event
// Format: FIAT_DEPOSIT:userAddress:amount:stripePaymentId:timestamp
async function processFiatDeposit(eventData) {
  const { userAddress, amount, stripePaymentId, timestamp, algorandTxId } = eventData;
  
  // Find user by Algorand address
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress)
    .single();

  if (userError) {
    console.error('User lookup error:', userError);
    throw new Error('User not found for wallet address');
  }

  // Update virtual token balance
  const { data: balanceData, error: balanceError } = await supabase
    .rpc('update_virtual_token_balance', {
      p_user_id: user.id,
      p_token_type: 'WST.v',
      p_amount: parseFloat(amount) / 1000000, // Convert from microAlgos
      p_operation: 'add'
    });

  if (balanceError) {
    console.error('Balance update error:', balanceError);
    throw new Error('Failed to update token balance');
  }

  // Record transaction
  const { data: txData, error: txError } = await supabase
    .from('virtual_token_transactions')
    .insert({
      to_user_id: user.id,
      token_type: 'WST.v',
      amount: parseFloat(amount) / 1000000,
      transaction_type: 'deposit',
      status: 'completed',
      reference: `FIAT_${stripePaymentId}`,
      algorand_tx_id: algorandTxId,
      metadata: {
        source: 'algorand_contract',
        stripe_payment_id: stripePaymentId,
        timestamp: timestamp
      }
    })
    .select()
    .single();

  if (txError) {
    console.error('Transaction record error:', txError);
    throw new Error('Failed to record transaction');
  }

  return {
    user_id: user.id,
    amount: parseFloat(amount) / 1000000,
    transaction_id: txData.id
  };
}

// Process NGO_AUTHORIZED event
// Format: NGO_AUTHORIZED:ngoAddress:rating:region:timestamp
async function processNgoAuthorized(eventData) {
  const { userAddress, rating, region, timestamp, algorandTxId } = eventData;
  
  // Find user by Algorand address
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress)
    .single();

  if (userError) {
    console.error('User lookup error:', userError);
    throw new Error('User not found for wallet address');
  }

  // Update or create NGO record
  const { data: ngoData, error: ngoError } = await supabase
    .from('ngos')
    .upsert({
      user_id: user.id,
      wallet_address: userAddress,
      rating: parseInt(rating),
      region: region,
      is_active: true,
      approved_at: new Date().toISOString()
    })
    .select()
    .single();

  if (ngoError) {
    console.error('NGO update error:', ngoError);
    throw new Error('Failed to update NGO record');
  }

  // Update user role to NGO if not already
  await supabase
    .from('users')
    .update({ role: 'ngo' })
    .eq('id', user.id);

  return {
    ngo_id: ngoData.id,
    user_id: user.id,
    rating: parseInt(rating),
    region: region
  };
}

// Process CRISIS_BADGE_ISSUED event
// Format: CRISIS_BADGE_ISSUED:userAddress:caseId:crisisType:severity:ngoAddress:timestamp
async function processCrisisBadgeIssued(eventData) {
  const { userAddress, caseId, crisisType, severity, algorandSender, timestamp, algorandTxId } = eventData;
  
  // Find user by Algorand address
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress)
    .single();

  if (userError) {
    console.error('User lookup error:', userError);
    throw new Error('User not found for wallet address');
  }

  // Find NGO by Algorand address
  const { data: ngo, error: ngoError } = await supabase
    .from('ngos')
    .select('id')
    .eq('wallet_address', algorandSender)
    .single();

  if (ngoError) {
    console.error('NGO lookup error:', ngoError);
    throw new Error('NGO not found for wallet address');
  }

  // Create crisis badge
  const { data: badgeData, error: badgeError } = await supabase
    .from('crisis_badges')
    .insert({
      user_id: user.id,
      case_id: caseId,
      issued_by_ngo_id: ngo.id,
      badge_type: 'emergency',
      crisis_type: crisisType,
      severity_level: parseInt(severity),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days validity
      metadata: {
        algorand_tx_id: algorandTxId,
        timestamp: timestamp
      },
      is_active: true
    })
    .select()
    .single();

  if (badgeError) {
    console.error('Badge creation error:', badgeError);
    throw new Error('Failed to create crisis badge');
  }

  // Update emergency case status if it exists
  const { error: caseError } = await supabase
    .from('emergency_cases')
    .update({ 
      status: 'approved',
      assigned_ngo_id: ngo.id
    })
    .eq('id', caseId);

  if (caseError) {
    console.error('Case update error:', caseError);
    // Don't throw here, as the case might not exist in our database yet
  }

  return {
    badge_id: badgeData.id,
    user_id: user.id,
    case_id: caseId,
    ngo_id: ngo.id,
    severity: parseInt(severity)
  };
}

// Process EMERGENCY_DISBURSAL event
// Format: EMERGENCY_DISBURSAL:userAddress:amount:caseId:ngoAddress:timestamp
async function processEmergencyDisbursal(eventData) {
  const { userAddress, amount, caseId, algorandSender, timestamp, algorandTxId } = eventData;
  
  // Find user by Algorand address
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress)
    .single();

  if (userError) {
    console.error('User lookup error:', userError);
    throw new Error('User not found for wallet address');
  }

  // Find NGO by Algorand address
  const { data: ngo, error: ngoError } = await supabase
    .from('ngos')
    .select('id')
    .eq('wallet_address', algorandSender)
    .single();

  if (ngoError) {
    console.error('NGO lookup error:', ngoError);
    throw new Error('NGO not found for wallet address');
  }

  // Create remittance log
  const { data: remittanceData, error: remittanceError } = await supabase
    .from('remittance_logs')
    .insert({
      case_id: caseId,
      ngo_id: ngo.id,
      recipient_user_id: user.id,
      recipient_wallet: userAddress,
      amount: parseFloat(amount) / 1000000, // Convert from microAlgos
      currency: 'ALGO',
      status: 'completed',
      algorand_tx_id: algorandTxId,
      provider: 'algorand',
      metadata: {
        timestamp: timestamp,
        transaction_type: 'emergency_disbursal'
      }
    })
    .select()
    .single();

  if (remittanceError) {
    console.error('Remittance creation error:', remittanceError);
    throw new Error('Failed to create remittance record');
  }

  // Update emergency case
  const { data: caseData, error: caseError } = await supabase
    .from('emergency_cases')
    .update({
      status: 'completed',
      disbursed_amount: parseFloat(amount) / 1000000,
      disbursed_at: new Date().toISOString()
    })
    .eq('id', caseId)
    .select()
    .single();

  if (caseError) {
    console.error('Case update error:', caseError);
    // Don't throw here, as the case might not exist in our database yet
  }

  return {
    remittance_id: remittanceData.id,
    user_id: user.id,
    ngo_id: ngo.id,
    case_id: caseId,
    amount: parseFloat(amount) / 1000000
  };
}

// Process TOKEN_TRANSFER event
// Format: TOKEN_TRANSFER:fromAddress:toAddress:amount:reference:timestamp
async function processTokenTransfer(eventData) {
  const { fromAddress, toAddress, amount, reference, timestamp, algorandTxId } = eventData;
  
  // Find sender by Algorand address
  const { data: fromUser, error: fromUserError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', fromAddress)
    .single();

  if (fromUserError) {
    console.error('Sender lookup error:', fromUserError);
    throw new Error('Sender not found for wallet address');
  }

  // Find recipient by Algorand address
  const { data: toUser, error: toUserError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', toAddress)
    .single();

  if (toUserError) {
    console.error('Recipient lookup error:', toUserError);
    throw new Error('Recipient not found for wallet address');
  }

  // Record transaction
  const { data: txData, error: txError } = await supabase
    .from('virtual_token_transactions')
    .insert({
      from_user_id: fromUser.id,
      to_user_id: toUser.id,
      token_type: 'WST.v',
      amount: parseFloat(amount) / 1000000, // Convert from microAlgos
      transaction_type: 'transfer',
      status: 'completed',
      reference: reference,
      algorand_tx_id: algorandTxId,
      metadata: {
        timestamp: timestamp
      }
    })
    .select()
    .single();

  if (txError) {
    console.error('Transaction record error:', txError);
    throw new Error('Failed to record transaction');
  }

  return {
    transaction_id: txData.id,
    from_user_id: fromUser.id,
    to_user_id: toUser.id,
    amount: parseFloat(amount) / 1000000,
    reference: reference
  };
}

// Process VIRTUAL_CARD_CREATED event
// Format: VIRTUAL_CARD_CREATED:userAddress:cardLimit:cardType:timestamp
async function processVirtualCardCreated(eventData) {
  const { userAddress, cardLimit, cardType, timestamp, algorandTxId } = eventData;
  
  // Find user by Algorand address
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress)
    .single();

  if (userError) {
    console.error('User lookup error:', userError);
    throw new Error('User not found for wallet address');
  }

  // Generate card details
  const cardNumber = generateCardNumber();
  const cvv = generateCVV();
  const expiryDate = generateExpiryDate();

  // Create virtual card
  const { data: cardData, error: cardError } = await supabase
    .from('virtual_cards')
    .insert({
      user_id: user.id,
      card_number: cardNumber,
      card_type: cardType,
      status: 'active',
      spending_limit: parseFloat(cardLimit) / 1000000, // Convert from microAlgos
      current_balance: parseFloat(cardLimit) / 1000000,
      currency: 'ALGO',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days validity
      metadata: {
        algorand_tx_id: algorandTxId,
        timestamp: timestamp
      }
    })
    .select()
    .single();

  if (cardError) {
    console.error('Card creation error:', cardError);
    throw new Error('Failed to create virtual card');
  }

  return {
    card_id: cardData.id,
    user_id: user.id,
    card_number: cardNumber,
    card_type: cardType,
    spending_limit: parseFloat(cardLimit) / 1000000
  };
}

// Process SYSTEM_UPDATED event
// Format: SYSTEM_UPDATED:settingKey:settingValue:reason:timestamp
async function processSystemUpdated(eventData) {
  const { settingKey, settingValue, reason, timestamp, algorandTxId, algorandSender } = eventData;
  
  // Find admin by Algorand address
  const { data: admin, error: adminError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', algorandSender)
    .single();

  if (adminError) {
    console.error('Admin lookup error:', adminError);
    throw new Error('Admin not found for wallet address');
  }

  // Update admin settings
  const { data: settingData, error: settingError } = await supabase
    .from('admin_settings')
    .upsert({
      setting_key: settingKey,
      setting_value: JSON.stringify({
        value: parseFloat(settingValue) / 1000000, // Convert from microAlgos
        updated_at: timestamp
      }),
      description: reason,
      updated_by: admin.id
    })
    .select()
    .single();

  if (settingError) {
    console.error('Setting update error:', settingError);
    throw new Error('Failed to update system setting');
  }

  return {
    setting_id: settingData.id,
    setting_key: settingKey,
    setting_value: parseFloat(settingValue) / 1000000,
    reason: reason,
    updated_by: admin.id
  };
}

// Helper functions for virtual card generation
function generateCardNumber() {
  return Array(4).fill(0).map(() => Math.floor(1000 + Math.random() * 9000)).join('-');
}

function generateCVV() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function generateExpiryDate() {
  const now = new Date();
  const expiry = new Date(now.setFullYear(now.getFullYear() + 2));
  const month = String(expiry.getMonth() + 1).padStart(2, '0');
  const year = String(expiry.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

export default router;
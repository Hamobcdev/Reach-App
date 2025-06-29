// Crisis Management Contract using TEALScript
// Crisis Management Contract - AlgoKit 3.0 + Vite Compatible
import { Contract } from '@algorandfoundation/tealscript';

// Define a custom type for Algorand Address to ensure type safety
type AlgorandAddress = Address;

export class CrisisManagementContract extends Contract {
  // Global State (using the new AlgoKit 3.0 syntax)
  globalBalance = this.GlobalStateKey.uint64('balance');
  globalLimit = this.GlobalStateKey.uint64('limit');
  globalOwner = this.GlobalStateKey.address('owner');
  globalAdmin = this.GlobalStateKey.address('admin');
  globalNgoCount = this.GlobalStateKey.uint64('ngo_count');
  globalCrisisCount = this.GlobalStateKey.uint64('crisis_count');
  globalEmergencyThreshold = this.GlobalStateKey.uint64('emergency_threshold');
  globalTokenTotal = this.GlobalStateKey.uint64('token_total');
  globalLiquidityPool = this.GlobalStateKey.uint64('liquidity_pool');
  globalSystemActive = this.GlobalStateKey.uint64('system_active');

  // Local State
  localNgoAuthorized = this.LocalStateKey.uint64('authorized');
  localNgoRating = this.LocalStateKey.uint64('rating');
  localTotalDisbursed = this.LocalStateKey.uint64('total_disbursed');
  localUserBalance = this.LocalStateKey.uint64('user_balance');
  localCrisisBadge = this.LocalStateKey.uint64('crisis_badge');
  localLastTransaction = this.LocalStateKey.uint64('last_tx');

  @abi.method({ name: 'create_application' })
  createApplication(): void {
    this.globalBalance.value = 0;
    this.globalLimit.value = 10_000_000; // Example limit in microAlgos
    this.globalOwner.value = this.txn.sender;
    this.globalAdmin.value = this.txn.sender; // Admin is initially the creator
    this.globalNgoCount.value = 0;
    this.globalCrisisCount.value = 0;
    this.globalEmergencyThreshold.value = 5_000_000; // Example threshold in microAlgos
    this.globalTokenTotal.value = 0;
    this.globalLiquidityPool.value = 0;
    this.globalSystemActive.value = 1; // 1 for active, 0 for inactive
  }

  @abi.method({ name: 'fiat_deposit' })
  fiatDeposit(userAlgorandAddress: AlgorandAddress, amount: uint64, stripePaymentId: string): void {
    assert(this.globalSystemActive.value === 1, 'System inactive');
    assert(amount > 0, 'Invalid deposit amount');
    
    this.globalLiquidityPool.value += amount;
    this.localUserBalance(userAlgorandAddress).value += amount;
    this.globalTokenTotal.value += amount;

    // Log event for off-chain synchronization
    log(`FIAT_DEPOSIT:${userAlgorandAddress.toString()}:${amount}:${stripePaymentId}:${globals.latestTimestamp}`);
  }

  @abi.method({ name: 'authorize_ngo' })
  authorizeNgo(ngoAlgorandAddress: AlgorandAddress, rating: uint64, region: string): void {
    assert(this.txn.sender === this.globalAdmin.value, 'Only admin can authorize NGOs');
    assert(rating >= 1 && rating <= 10, 'Rating must be between 1 and 10'); // Adjusted rating range
    
    this.localNgoAuthorized(ngoAlgorandAddress).value = 1; // 1 for authorized
    this.localNgoRating(ngoAlgorandAddress).value = rating;
    this.localTotalDisbursed(ngoAlgorandAddress).value = 0; // Initialize disbursed amount
    this.globalNgoCount.value += 1;

    // Log event for off-chain synchronization
    log(`NGO_AUTHORIZED:${ngoAlgorandAddress.toString()}:${rating}:${region}:${globals.latestTimestamp}`);
  }

  @abi.method({ name: 'issue_crisis_badge' })
  issueCrisisBadge(userAlgorandAddress: AlgorandAddress, caseId: string, crisisType: string, severity: uint64): void {
    assert(this.localNgoAuthorized(this.txn.sender).value === 1, 'Only authorized NGO can issue badges');
    assert(severity >= 1 && severity <= 5, 'Severity must be 1-5');
    
    this.localCrisisBadge(userAlgorandAddress).value = 1; // 1 for badge issued
    this.globalCrisisCount.value += 1;

    // Log event for off-chain synchronization
    log(`CRISIS_BADGE_ISSUED:${userAlgorandAddress.toString()}:${caseId}:${crisisType}:${severity}:${this.txn.sender.toString()}:${globals.latestTimestamp}`);
  }

  @abi.method({ name: 'emergency_disbursal' })
  emergencyDisbursal(userAlgorandAddress: AlgorandAddress, amount: uint64, caseId: string): void {
    assert(this.localNgoAuthorized(this.txn.sender).value === 1, 'Only authorized NGO can disburse funds');
    assert(amount > 0, 'Disbursal amount must be positive');
    assert(amount <= this.globalEmergencyThreshold.value, 'Disbursal exceeds emergency threshold');
    assert(this.globalLiquidityPool.value >= amount, 'Insufficient liquidity in contract pool');
    assert(this.localCrisisBadge(userAlgorandAddress).value === 1, 'User does not have a valid crisis badge');

    this.globalLiquidityPool.value -= amount;
    this.localUserBalance(userAlgorandAddress).value += amount;
    this.localTotalDisbursed(this.txn.sender).value += amount;

    // Log event for off-chain synchronization
    log(`EMERGENCY_DISBURSAL:${userAlgorandAddress.toString()}:${amount}:${caseId}:${this.txn.sender.toString()}:${globals.latestTimestamp}`);
  }

  @abi.method({ name: 'transfer_tokens' })
  transferTokens(toAlgorandAddress: AlgorandAddress, amount: uint64, reference: string): void {
    assert(amount > 0, 'Invalid transfer amount');
    
    const senderBalance = this.localUserBalance(this.txn.sender).value;
    assert(senderBalance >= amount, 'Insufficient balance for transfer');

    this.localUserBalance(this.txn.sender).value -= amount;
    this.localUserBalance(toAlgorandAddress).value += amount;
    this.localLastTransaction(this.txn.sender).value = globals.latestTimestamp;

    // Log event for off-chain synchronization
    log(`TOKEN_TRANSFER:${this.txn.sender.toString()}:${toAlgorandAddress.toString()}:${amount}:${reference}:${globals.latestTimestamp}`);
  }

  @abi.method({ name: 'create_virtual_card' })
  createVirtualCard(cardLimit: uint64, cardType: string): void {
    assert(this.localUserBalance(this.txn.sender).value >= cardLimit, 'Insufficient balance to create virtual card');
    assert(cardLimit > 0, 'Card limit must be positive');

    // Log event for off-chain synchronization
    log(`VIRTUAL_CARD_CREATED:${this.txn.sender.toString()}:${cardLimit}:${cardType}:${globals.latestTimestamp}`);
  }

  @abi.method({ name: 'update_system_settings' })
  updateSystemSettings(settingKey: string, settingValue: uint64, reason: string): void {
    assert(this.txn.sender === this.globalAdmin.value, 'Only admin can update system settings');

    if (settingKey === 'emergency_threshold') {
      this.globalEmergencyThreshold.value = settingValue;
    } else if (settingKey === 'system_active') {
      this.globalSystemActive.value = settingValue;
    } else if (settingKey === 'spending_limit') {
      this.globalLimit.value = settingValue;
    } else {
      assert(false, 'Invalid setting key'); // Reject if key is not recognized
    }

    // Log event for off-chain synchronization
    log(`SYSTEM_UPDATED:${settingKey}:${settingValue}:${reason}:${globals.latestTimestamp}`);
  }

  // Read-only methods for querying state
  @abi.method({ name: 'get_user_balance', readonly: true })
  getUserBalance(userAlgorandAddress: AlgorandAddress): uint64 {
    return this.localUserBalance(userAlgorandAddress).value;
  }

  @abi.method({ name: 'get_system_status', readonly: true })
  getSystemStatus(): [uint64, uint64, uint64] {
    return [
      this.globalSystemActive.value,
      this.globalLiquidityPool.value,
      this.globalTokenTotal.value
    ];
  }

  @abi.method({ name: 'get_ngo_status', readonly: true })
  getNgoStatus(ngoAlgorandAddress: AlgorandAddress): [uint64, uint64] {
    return [
      this.localNgoAuthorized(ngoAlgorandAddress).value,
      this.localNgoRating(ngoAlgorandAddress).value
    ];
  }
}
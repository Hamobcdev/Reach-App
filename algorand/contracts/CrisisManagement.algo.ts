import {
  Application,
  GlobalStateKey,
  LocalStateKey,
  abi,
  Txn,
  itxn,
  App,
  Account,
  assert,
  Addr,
  UInt64
} from '@algorandfoundation/tealscript';

export class CrisisManagementContract extends Application {
  // Global State Keys
  globalBalance = GlobalStateKey.uint64('balance');
  globalLimit = GlobalStateKey.uint64('limit');
  globalOwner = GlobalStateKey.address('owner');
  globalAdmin = GlobalStateKey.address('admin');
  globalNgoCount = GlobalStateKey.uint64('ngo_count');
  globalCrisisCount = GlobalStateKey.uint64('crisis_count');
  globalEmergencyThreshold = GlobalStateKey.uint64('emergency_threshold');
  globalTokenTotal = GlobalStateKey.uint64('token_total');
  globalLiquidityPool = GlobalStateKey.uint64('liquidity_pool');
  globalSystemActive = GlobalStateKey.uint64('system_active');

  // Local State Keys
  localNgoAuthorized = LocalStateKey.uint64('authorized');
  localNgoRating = LocalStateKey.uint64('rating');
  localTotalDisbursed = LocalStateKey.uint64('total_disbursed');
  localUserBalance = LocalStateKey.uint64('user_balance');
  localCrisisBadge = LocalStateKey.uint64('crisis_badge');
  localLastTransaction = LocalStateKey.uint64('last_tx');

  @abi.method({ name: 'create_application' })
  createApplication(): void {
    this.globalBalance.set(0);
    this.globalLimit.set(1000000); // default
    this.globalOwner.set(Txn.sender);
    this.globalAdmin.set(Txn.sender);
    this.globalNgoCount.set(0);
    this.globalCrisisCount.set(0);
    this.globalEmergencyThreshold.set(500000);
    this.globalTokenTotal.set(0);
    this.globalLiquidityPool.set(0);
    this.globalSystemActive.set(1);
  }

  @abi.method({ name: 'fiat_deposit' })
  fiatDeposit(account: Account, amount: UInt64): void {
    assert(this.globalSystemActive.get() === 1);
    this.localUserBalance[account].set(this.localUserBalance[account].get() + amount);
    this.globalTokenTotal.set(this.globalTokenTotal.get() + amount);
  }

  @abi.method({ name: 'authorize_ngo' })
  authorizeNGO(ngo: Account): void {
    assert(Txn.sender === this.globalAdmin.get());
    this.localNgoAuthorized[ngo].set(1);
    this.globalNgoCount.set(this.globalNgoCount.get() + 1);
  }

  @abi.method({ name: 'issue_crisis_badge' })
  issueCrisisBadge(to: Account): void {
    assert(this.localNgoAuthorized[Txn.sender].get() === 1);
    this.localCrisisBadge[to].set(1);
    this.localLastTransaction[to].set(Txn.firstValid);
    this.globalCrisisCount.set(this.globalCrisisCount.get() + 1);
  }

  @abi.method({ name: 'emergency_disbursal' })
  emergencyDisbursal(to: Account, amount: UInt64): void {
    assert(this.localCrisisBadge[to].get() === 1);
    assert(amount <= this.globalEmergencyThreshold.get());
    this.localUserBalance[to].set(this.localUserBalance[to].get() + amount);
    this.globalLiquidityPool.set(this.globalLiquidityPool.get() - amount);
  }

  @abi.method({ name: 'transfer_tokens' })
  transferTokens(from: Account, to: Account, amount: UInt64): void {
    assert(this.localUserBalance[from].get() >= amount);
    this.localUserBalance[from].set(this.localUserBalance[from].get() - amount);
    this.localUserBalance[to].set(this.localUserBalance[to].get() + amount);
  }

  @abi.method({ name: 'create_virtual_card' })
  createVirtualCard(forUser: Account): void {
    assert(this.localUserBalance[forUser].get() > 0);
    // Implement virtual card logic if needed
    this.localLastTransaction[forUser].set(Txn.firstValid);
  }

  @abi.method({ name: 'update_system_settings' })
  updateSystemSettings(newLimit: UInt64, emergencyThreshold: UInt64): void {
    assert(Txn.sender === this.globalAdmin.get());
    this.globalLimit.set(newLimit);
    this.globalEmergencyThreshold.set(emergencyThreshold);
  }

  // View-only (readonly: true) Methods
  @abi.method({ name: 'get_user_balance', readonly: true })
  getUserBalance(user: Account): UInt64 {
    return this.localUserBalance[user].get();
  }

  @abi.method({ name: 'get_system_status', readonly: true })
  getSystemStatus(): UInt64 {
    return this.globalSystemActive.get();
  }

  @abi.method({ name: 'get_ngo_status', readonly: true })
  getNgoStatus(ngo: Account): UInt64 {
    return this.localNgoAuthorized[ngo].get();
  }
}

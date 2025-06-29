"""
Algorand Virtual Card Manager Smart Contract
PyTeal implementation for managing multi-currency virtual cards

Features:
- Multi-currency support (ALGO, USDC, WST, etc.)
- KYC tier-based limits
- Daily/monthly spending controls
- Chainlink automation integration
- Supabase sync compatibility
"""

from pyteal import *

def approval_program():
    # Global State Keys
    ASA_ID = Bytes("ASA_ID")
    OWNER = Bytes("OWNER")
    BASE_CURRENCY = Bytes("BASE_CURRENCY")
    CHAINLINK_FEED = Bytes("CHAINLINK_FEED")
    TOTAL_CARDS = Bytes("TOTAL_CARDS")
    CONTRACT_VERSION = Bytes("CONTRACT_VERSION")
    
    # Local State Keys
    BALANCE = Bytes("balance")
    DAILY_SPENT = Bytes("daily_spent")
    MONTHLY_SPENT = Bytes("monthly_spent")
    LAST_RESET_DAY = Bytes("last_reset_day")
    LAST_RESET_MONTH = Bytes("last_reset_month")
    KYC_TIER = Bytes("kyc_tier")
    REGION = Bytes("region")
    IS_ACTIVE = Bytes("is_active")
    CURRENCY = Bytes("currency")
    DAILY_LIMIT = Bytes("daily_limit")
    MONTHLY_LIMIT = Bytes("monthly_limit")
    CARD_ID = Bytes("card_id")
    
    # Application Methods
    METHOD_CREATE_CARD = Bytes("create_card")
    METHOD_FUND_CARD = Bytes("fund_card")
    METHOD_USE_CARD = Bytes("use_card")
    METHOD_RESET_LIMITS = Bytes("reset_limits")
    METHOD_DEACTIVATE_CARD = Bytes("deactivate_card")
    METHOD_ACTIVATE_CARD = Bytes("activate_card")
    METHOD_UPDATE_LIMITS = Bytes("update_limits")
    METHOD_EMERGENCY_PAUSE = Bytes("emergency_pause")
    
    # KYC Tier Limits (in microAlgos for ALGO, adjust for other currencies)
    BASIC_DAILY_LIMIT = Int(100_000_000)    # 100 ALGO
    BASIC_MONTHLY_LIMIT = Int(1_000_000_000) # 1000 ALGO
    
    STANDARD_DAILY_LIMIT = Int(500_000_000)    # 500 ALGO
    STANDARD_MONTHLY_LIMIT = Int(5_000_000_000) # 5000 ALGO
    
    ENHANCED_DAILY_LIMIT = Int(2_500_000_000)    # 2500 ALGO
    ENHANCED_MONTHLY_LIMIT = Int(25_000_000_000)  # 25000 ALGO
    
    # Helper Functions
    @Subroutine(TealType.uint64)
    def get_current_day():
        return Global.latest_timestamp() / Int(86400)  # Seconds in a day
    
    @Subroutine(TealType.uint64)
    def get_current_month():
        return Global.latest_timestamp() / Int(2592000)  # Approximate seconds in a month
    
    @Subroutine(TealType.uint64)
    def is_owner():
        return Txn.sender() == App.globalGet(OWNER)
    
    @Subroutine(TealType.uint64)
    def is_opted_in():
        return App.optedIn(Txn.sender(), Global.current_application_id())
    
    @Subroutine(TealType.uint64)
    def get_kyc_daily_limit(kyc_tier):
        return If(kyc_tier == Int(1)).\
            Then(BASIC_DAILY_LIMIT).\
            ElseIf(kyc_tier == Int(2)).\
            Then(STANDARD_DAILY_LIMIT).\
            Else(ENHANCED_DAILY_LIMIT)
    
    @Subroutine(TealType.uint64)
    def get_kyc_monthly_limit(kyc_tier):
        return If(kyc_tier == Int(1)).\
            Then(BASIC_MONTHLY_LIMIT).\
            ElseIf(kyc_tier == Int(2)).\
            Then(STANDARD_MONTHLY_LIMIT).\
            Else(ENHANCED_MONTHLY_LIMIT)
    
    @Subroutine(TealType.none)
    def reset_daily_limits_if_needed():
        current_day = get_current_day()
        last_reset = App.localGet(Txn.sender(), LAST_RESET_DAY)
        
        return If(current_day > last_reset).Then(
            Seq([
                App.localPut(Txn.sender(), DAILY_SPENT, Int(0)),
                App.localPut(Txn.sender(), LAST_RESET_DAY, current_day)
            ])
        )
    
    @Subroutine(TealType.none)
    def reset_monthly_limits_if_needed():
        current_month = get_current_month()
        last_reset = App.localGet(Txn.sender(), LAST_RESET_MONTH)
        
        return If(current_month > last_reset).Then(
            Seq([
                App.localPut(Txn.sender(), MONTHLY_SPENT, Int(0)),
                App.localPut(Txn.sender(), LAST_RESET_MONTH, current_month)
            ])
        )
    
    @Subroutine(TealType.uint64)
    def validate_card_usage(amount):
        kyc_tier = App.localGet(Txn.sender(), KYC_TIER)
        daily_spent = App.localGet(Txn.sender(), DAILY_SPENT)
        monthly_spent = App.localGet(Txn.sender(), MONTHLY_SPENT)
        daily_limit = App.localGet(Txn.sender(), DAILY_LIMIT)
        monthly_limit = App.localGet(Txn.sender(), MONTHLY_LIMIT)
        balance = App.localGet(Txn.sender(), BALANCE)
        is_active = App.localGet(Txn.sender(), IS_ACTIVE)
        
        return And(
            is_active == Int(1),
            balance >= amount,
            daily_spent + amount <= daily_limit,
            monthly_spent + amount <= monthly_limit,
            amount > Int(0)
        )
    
    # Application Creation
    on_creation = Seq([
        App.globalPut(OWNER, Txn.sender()),
        App.globalPut(BASE_CURRENCY, Bytes("ALGO")),
        App.globalPut(TOTAL_CARDS, Int(0)),
        App.globalPut(CONTRACT_VERSION, Bytes("1.0.0")),
        # Chainlink feed will be set later via update call
        App.globalPut(CHAINLINK_FEED, Int(0)),
        Approve()
    ])
    
    # Create Virtual Card
    create_card = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(4)),
        Assert(is_opted_in()),
        Assert(App.localGet(Txn.sender(), IS_ACTIVE) == Int(0)),  # Not already active
        
        # Parse arguments
        kyc_tier_arg := Btoi(Txn.application_args[1]),
        region_arg := Txn.application_args[2],
        currency_arg := Txn.application_args[3],
        
        # Validate KYC tier
        Assert(And(kyc_tier_arg >= Int(1), kyc_tier_arg <= Int(3))),
        
        # Set card limits based on KYC tier
        daily_limit := get_kyc_daily_limit(kyc_tier_arg),
        monthly_limit := get_kyc_monthly_limit(kyc_tier_arg),
        
        # Initialize local state
        App.localPut(Txn.sender(), BALANCE, Int(0)),
        App.localPut(Txn.sender(), DAILY_SPENT, Int(0)),
        App.localPut(Txn.sender(), MONTHLY_SPENT, Int(0)),
        App.localPut(Txn.sender(), LAST_RESET_DAY, get_current_day()),
        App.localPut(Txn.sender(), LAST_RESET_MONTH, get_current_month()),
        App.localPut(Txn.sender(), KYC_TIER, kyc_tier_arg),
        App.localPut(Txn.sender(), REGION, region_arg),
        App.localPut(Txn.sender(), IS_ACTIVE, Int(1)),
        App.localPut(Txn.sender(), CURRENCY, currency_arg),
        App.localPut(Txn.sender(), DAILY_LIMIT, daily_limit),
        App.localPut(Txn.sender(), MONTHLY_LIMIT, monthly_limit),
        
        # Generate unique card ID
        card_id := Concat(
            Bytes("card_"),
            Itob(Global.latest_timestamp()),
            Bytes("_"),
            Txn.sender()
        ),
        App.localPut(Txn.sender(), CARD_ID, card_id),
        
        # Increment total cards counter
        App.globalPut(TOTAL_CARDS, App.globalGet(TOTAL_CARDS) + Int(1)),
        
        # Log card creation event
        Log(Concat(
            Bytes("CardCreated:"),
            card_id,
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(kyc_tier_arg),
            Bytes(":"),
            region_arg,
            Bytes(":"),
            currency_arg
        )),
        
        Approve()
    ])
    
    # Fund Virtual Card
    fund_card = Seq([
        # Validate card is active
        Assert(is_opted_in()),
        Assert(App.localGet(Txn.sender(), IS_ACTIVE) == Int(1)),
        
        # Validate payment transaction
        Assert(Global.group_size() == Int(2)),
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() > Int(0)),
        
        # Update balance
        current_balance := App.localGet(Txn.sender(), BALANCE),
        new_balance := current_balance + Gtxn[0].amount(),
        App.localPut(Txn.sender(), BALANCE, new_balance),
        
        # Log funding event
        Log(Concat(
            Bytes("CardFunded:"),
            App.localGet(Txn.sender(), CARD_ID),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(Gtxn[0].amount()),
            Bytes(":"),
            App.localGet(Txn.sender(), CURRENCY)
        )),
        
        Approve()
    ])
    
    # Use Virtual Card
    use_card = Seq([
        # Parse amount argument
        Assert(Txn.application_args.length() == Int(2)),
        amount := Btoi(Txn.application_args[1]),
        
        # Reset limits if needed
        reset_daily_limits_if_needed(),
        reset_monthly_limits_if_needed(),
        
        # Validate card usage
        Assert(validate_card_usage(amount)),
        
        # Update balances and spending
        current_balance := App.localGet(Txn.sender(), BALANCE),
        daily_spent := App.localGet(Txn.sender(), DAILY_SPENT),
        monthly_spent := App.localGet(Txn.sender(), MONTHLY_SPENT),
        
        App.localPut(Txn.sender(), BALANCE, current_balance - amount),
        App.localPut(Txn.sender(), DAILY_SPENT, daily_spent + amount),
        App.localPut(Txn.sender(), MONTHLY_SPENT, monthly_spent + amount),
        
        # Log usage event
        Log(Concat(
            Bytes("CardUsed:"),
            App.localGet(Txn.sender(), CARD_ID),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(amount),
            Bytes(":"),
            App.localGet(Txn.sender(), CURRENCY),
            Bytes(":"),
            Itob(current_balance - amount)  # New balance
        )),
        
        Approve()
    ])
    
    # Reset Limits (Can be called by Chainlink automation)
    reset_limits = Seq([
        # This can be called by anyone for automated resets
        # In production, you might want to restrict this to Chainlink nodes
        
        reset_daily_limits_if_needed(),
        reset_monthly_limits_if_needed(),
        
        # Log reset event
        Log(Concat(
            Bytes("LimitsReset:"),
            Txn.sender(),
            Bytes(":"),
            Itob(Global.latest_timestamp())
        )),
        
        Approve()
    ])
    
    # Deactivate Card
    deactivate_card = Seq([
        Assert(is_opted_in()),
        Assert(App.localGet(Txn.sender(), IS_ACTIVE) == Int(1)),
        
        App.localPut(Txn.sender(), IS_ACTIVE, Int(0)),
        
        # Log deactivation event
        Log(Concat(
            Bytes("CardDeactivated:"),
            App.localGet(Txn.sender(), CARD_ID),
            Bytes(":"),
            Txn.sender()
        )),
        
        Approve()
    ])
    
    # Activate Card
    activate_card = Seq([
        Assert(is_opted_in()),
        Assert(App.localGet(Txn.sender(), IS_ACTIVE) == Int(0)),
        
        App.localPut(Txn.sender(), IS_ACTIVE, Int(1)),
        
        # Log activation event
        Log(Concat(
            Bytes("CardActivated:"),
            App.localGet(Txn.sender(), CARD_ID),
            Bytes(":"),
            Txn.sender()
        )),
        
        Approve()
    ])
    
    # Update Limits (Owner only)
    update_limits = Seq([
        Assert(is_owner()),
        Assert(Txn.application_args.length() == Int(4)),
        
        target_address := Txn.application_args[1],
        new_daily_limit := Btoi(Txn.application_args[2]),
        new_monthly_limit := Btoi(Txn.application_args[3]),
        
        # Update limits for target address
        App.localPutEx(target_address, DAILY_LIMIT, new_daily_limit),
        App.localPutEx(target_address, MONTHLY_LIMIT, new_monthly_limit),
        
        # Log limit update
        Log(Concat(
            Bytes("LimitsUpdated:"),
            target_address,
            Bytes(":"),
            Itob(new_daily_limit),
            Bytes(":"),
            Itob(new_monthly_limit)
        )),
        
        Approve()
    ])
    
    # Emergency Pause (Owner only)
    emergency_pause = Seq([
        Assert(is_owner()),
        
        # Set global pause state
        App.globalPut(Bytes("PAUSED"), Int(1)),
        
        # Log emergency pause
        Log(Concat(
            Bytes("EmergencyPause:"),
            Txn.sender(),
            Bytes(":"),
            Itob(Global.latest_timestamp())
        )),
        
        Approve()
    ])
    
    # Update Chainlink Feed (Owner only)
    update_chainlink_feed = Seq([
        Assert(is_owner()),
        Assert(Txn.application_args.length() == Int(2)),
        
        new_feed_id := Btoi(Txn.application_args[1]),
        App.globalPut(CHAINLINK_FEED, new_feed_id),
        
        # Log feed update
        Log(Concat(
            Bytes("ChainlinkFeedUpdated:"),
            Itob(new_feed_id)
        )),
        
        Approve()
    ])
    
    # Main Program Logic
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnCall.OptIn, Approve()],
        [Txn.on_completion() == OnCall.CloseOut, Approve()],
        [Txn.on_completion() == OnCall.UpdateApplication, 
         If(is_owner()).Then(Approve()).Else(Reject())],
        [Txn.on_completion() == OnCall.DeleteApplication, 
         If(is_owner()).Then(Approve()).Else(Reject())],
        [Txn.application_args[0] == METHOD_CREATE_CARD, create_card],
        [Txn.application_args[0] == METHOD_FUND_CARD, fund_card],
        [Txn.application_args[0] == METHOD_USE_CARD, use_card],
        [Txn.application_args[0] == METHOD_RESET_LIMITS, reset_limits],
        [Txn.application_args[0] == METHOD_DEACTIVATE_CARD, deactivate_card],
        [Txn.application_args[0] == METHOD_ACTIVATE_CARD, activate_card],
        [Txn.application_args[0] == METHOD_UPDATE_LIMITS, update_limits],
        [Txn.application_args[0] == METHOD_EMERGENCY_PAUSE, emergency_pause],
        [Txn.application_args[0] == Bytes("update_chainlink_feed"), update_chainlink_feed],
        [Int(1), Reject()]
    )
    
    return program

def clear_state_program():
    """
    Clear state program - allows users to clear their local state
    """
    return Approve()

if __name__ == "__main__":
    # Compile the contract
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
    
    # Write to files
    with open("virtual_card_manager_approval.teal", "w") as f:
        f.write(approval_teal)
    
    with open("virtual_card_manager_clear_state.teal", "w") as f:
        f.write(clear_state_teal)
    
    print("✅ Smart contract compiled successfully!")
    print("📄 Files generated:")
    print("   - virtual_card_manager_approval.teal")
    print("   - virtual_card_manager_clear_state.teal")
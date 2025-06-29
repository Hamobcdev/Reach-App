"""
Deployment script for Algorand Virtual Card Manager
Handles contract deployment, configuration, and initial setup
"""

import os
import json
import base64
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod, indexer
from algosdk.future.transaction import ApplicationCreateTxn, OnComplete, StateSchema
from algosdk.logic import get_application_address
import time

class VirtualCardManagerDeployer:
    def __init__(self, algod_client, private_key, network="testnet"):
        self.algod_client = algod_client
        self.private_key = private_key
        self.sender = account.address_from_private_key(private_key)
        self.network = network
        self.app_id = None
        self.app_address = None
        
    def compile_contract(self, teal_source):
        """Compile TEAL source code"""
        try:
            compile_response = self.algod_client.compile(teal_source)
            return base64.b64decode(compile_response['result'])
        except Exception as e:
            print(f"❌ Compilation error: {e}")
            raise
    
    def deploy_contract(self):
        """Deploy the Virtual Card Manager contract"""
        print("🚀 Deploying Virtual Card Manager to Algorand...")
        
        # Read TEAL files
        try:
            with open("virtual_card_manager_approval.teal", "r") as f:
                approval_teal = f.read()
            with open("virtual_card_manager_clear_state.teal", "r") as f:
                clear_state_teal = f.read()
        except FileNotFoundError:
            print("❌ TEAL files not found. Please run the contract compilation first.")
            return None
        
        # Compile contracts
        print("📝 Compiling smart contracts...")
        approval_program = self.compile_contract(approval_teal)
        clear_state_program = self.compile_contract(clear_state_teal)
        
        # Define state schema
        global_schema = StateSchema(
            num_uints=10,  # ASA_ID, OWNER, CHAINLINK_FEED, TOTAL_CARDS, etc.
            num_byte_slices=10  # BASE_CURRENCY, CONTRACT_VERSION, etc.
        )
        
        local_schema = StateSchema(
            num_uints=10,  # balance, daily_spent, monthly_spent, etc.
            num_byte_slices=5   # region, currency, card_id, etc.
        )
        
        # Get suggested parameters
        params = self.algod_client.suggested_params()
        
        # Create application transaction
        txn = ApplicationCreateTxn(
            sender=self.sender,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=approval_program,
            clear_program=clear_state_program,
            global_schema=global_schema,
            local_schema=local_schema,
            app_args=[]
        )
        
        # Sign and submit transaction
        signed_txn = txn.sign(self.private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        print(f"📤 Transaction submitted: {tx_id}")
        print("⏳ Waiting for confirmation...")
        
        # Wait for confirmation
        try:
            confirmed_txn = transaction.wait_for_confirmation(
                self.algod_client, tx_id, 4
            )
            
            # Get application ID
            self.app_id = confirmed_txn["application-index"]
            self.app_address = get_application_address(self.app_id)
            
            print(f"✅ Contract deployed successfully!")
            print(f"📋 Application ID: {self.app_id}")
            print(f"📍 Application Address: {self.app_address}")
            
            return self.app_id
            
        except Exception as e:
            print(f"❌ Deployment failed: {e}")
            return None
    
    def fund_contract(self, amount_algos=10):
        """Fund the contract with initial ALGO"""
        if not self.app_address:
            print("❌ Contract not deployed yet")
            return False
        
        print(f"💰 Funding contract with {amount_algos} ALGO...")
        
        params = self.algod_client.suggested_params()
        amount_microalgos = amount_algos * 1_000_000
        
        txn = transaction.PaymentTxn(
            sender=self.sender,
            sp=params,
            receiver=self.app_address,
            amt=amount_microalgos
        )
        
        signed_txn = txn.sign(self.private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        try:
            transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
            print(f"✅ Contract funded with {amount_algos} ALGO")
            return True
        except Exception as e:
            print(f"❌ Funding failed: {e}")
            return False
    
    def setup_chainlink_integration(self, chainlink_feed_id=None):
        """Set up Chainlink price feed integration"""
        if not self.app_id:
            print("❌ Contract not deployed yet")
            return False
        
        print("🔗 Setting up Chainlink integration...")
        
        # For now, we'll use a placeholder feed ID
        # In production, this would be the actual Chainlink feed ID
        feed_id = chainlink_feed_id or 12345  # Placeholder
        
        params = self.algod_client.suggested_params()
        
        txn = transaction.ApplicationCallTxn(
            sender=self.sender,
            sp=params,
            index=self.app_id,
            on_complete=OnComplete.NoOpOC,
            app_args=["update_chainlink_feed", feed_id]
        )
        
        signed_txn = txn.sign(self.private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        try:
            transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
            print(f"✅ Chainlink feed configured: {feed_id}")
            return True
        except Exception as e:
            print(f"❌ Chainlink setup failed: {e}")
            return False
    
    def create_test_card(self, kyc_tier=1, region="samoa", currency="ALGO"):
        """Create a test virtual card"""
        if not self.app_id:
            print("❌ Contract not deployed yet")
            return False
        
        print(f"🎴 Creating test card (KYC: {kyc_tier}, Region: {region}, Currency: {currency})...")
        
        # First, opt into the application
        params = self.algod_client.suggested_params()
        
        opt_in_txn = transaction.ApplicationOptInTxn(
            sender=self.sender,
            sp=params,
            index=self.app_id
        )
        
        signed_opt_in = opt_in_txn.sign(self.private_key)
        opt_in_id = self.algod_client.send_transaction(signed_opt_in)
        
        try:
            transaction.wait_for_confirmation(self.algod_client, opt_in_id, 4)
            print("✅ Opted into application")
        except Exception as e:
            print(f"❌ Opt-in failed: {e}")
            return False
        
        # Create the card
        create_txn = transaction.ApplicationCallTxn(
            sender=self.sender,
            sp=params,
            index=self.app_id,
            on_complete=OnComplete.NoOpOC,
            app_args=["create_card", kyc_tier, region, currency]
        )
        
        signed_create = create_txn.sign(self.private_key)
        create_id = self.algod_client.send_transaction(signed_create)
        
        try:
            confirmed = transaction.wait_for_confirmation(self.algod_client, create_id, 4)
            print("✅ Test card created successfully!")
            
            # Parse logs for card ID
            if 'logs' in confirmed:
                for log in confirmed['logs']:
                    decoded_log = base64.b64decode(log).decode('utf-8')
                    if 'CardCreated:' in decoded_log:
                        print(f"📋 Card details: {decoded_log}")
            
            return True
        except Exception as e:
            print(f"❌ Card creation failed: {e}")
            return False
    
    def save_deployment_info(self):
        """Save deployment information to file"""
        if not self.app_id:
            print("❌ No deployment information to save")
            return
        
        deployment_info = {
            "network": self.network,
            "app_id": self.app_id,
            "app_address": self.app_address,
            "deployer_address": self.sender,
            "deployment_time": int(time.time()),
            "contract_version": "1.0.0"
        }
        
        filename = f"deployment_{self.network}_{self.app_id}.json"
        with open(filename, "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"💾 Deployment info saved to {filename}")

def main():
    """Main deployment function"""
    print("🌊 Algorand Virtual Card Manager Deployment")
    print("=" * 50)
    
    # Configuration
    NETWORK = "testnet"  # Change to "mainnet" for production
    
    # Algorand node configuration
    if NETWORK == "testnet":
        ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
        ALGOD_TOKEN = ""
    else:
        # Configure for mainnet
        ALGOD_ADDRESS = "https://mainnet-api.algonode.cloud"
        ALGOD_TOKEN = ""
    
    # Initialize Algod client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    
    # Get deployer account
    # In production, use environment variables or secure key management
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("❌ Please set DEPLOYER_MNEMONIC environment variable")
        print("💡 Generate a new account: python -c \"from algosdk import account, mnemonic; pk, addr = account.generate_account(); print(f'Address: {addr}'); print(f'Mnemonic: {mnemonic.from_private_key(pk)}')\"")
        return
    
    try:
        private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = account.address_from_private_key(private_key)
        print(f"👤 Deployer address: {deployer_address}")
        
        # Check account balance
        account_info = algod_client.account_info(deployer_address)
        balance_algos = account_info['amount'] / 1_000_000
        print(f"💰 Account balance: {balance_algos:.6f} ALGO")
        
        if balance_algos < 1:
            print("❌ Insufficient balance. Please fund your account.")
            print(f"💡 Fund your account: https://testnet.algoexplorer.io/dispenser")
            return
        
    except Exception as e:
        print(f"❌ Invalid mnemonic: {e}")
        return
    
    # Initialize deployer
    deployer = VirtualCardManagerDeployer(algod_client, private_key, NETWORK)
    
    # Deploy contract
    app_id = deployer.deploy_contract()
    if not app_id:
        return
    
    # Fund contract
    if not deployer.fund_contract(5):  # Fund with 5 ALGO
        return
    
    # Set up Chainlink integration
    if not deployer.setup_chainlink_integration():
        return
    
    # Create test card
    if not deployer.create_test_card():
        return
    
    # Save deployment information
    deployer.save_deployment_info()
    
    print("\n🎉 Deployment completed successfully!")
    print("\n📋 Next Steps:")
    print("1. Update your Bolt app with the new contract details")
    print("2. Configure Supabase sync with the application ID")
    print("3. Set up Chainlink automation for limit resets")
    print("4. Test card creation and funding flows")
    
    print(f"\n🔗 View on AlgoExplorer:")
    if NETWORK == "testnet":
        print(f"   https://testnet.algoexplorer.io/application/{app_id}")
    else:
        print(f"   https://algoexplorer.io/application/{app_id}")

if __name__ == "__main__":
    main()
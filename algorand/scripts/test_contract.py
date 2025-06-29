#!/usr/bin/env python3
"""
test_contract.py - Test your deployed smart contract functions
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCallTxn, wait_for_confirmation
import json
import os

class ContractTester:
    def __init__(self, mnemonic_phrase, app_id):
        """Initialize with wallet and app ID"""
        self.private_key = mnemonic.to_private_key(mnemonic_phrase)
        self.address = account.address_from_private_key(self.private_key)
        self.app_id = app_id
        
        # Connect to TestNet
        self.algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud", 443)
        
        print(f"🧪 Testing contract {app_id} with wallet {self.address}")
    
    def get_app_state(self):
        """Get the current state of the application"""
        try:
            app_info = self.algod_client.application_info(self.app_id)
            global_state = app_info.get('params', {}).get('global-state', [])
            
            # Decode the state
            state = {}
            for item in global_state:
                key = item['key']
                value = item['value']
                
                # Decode base64 key
                key_decoded = base64.b64decode(key).decode('utf-8')
                
                # Decode value based on type
                if value['type'] == 1:  # bytes
                    value_decoded = base64.b64decode(value['bytes']).decode('utf-8')
                elif value['type'] == 2:  # uint
                    value_decoded = value['uint']
                else:
                    value_decoded = value
                
                state[key_decoded] = value_decoded
            
            return state
            
        except Exception as e:
            print(f"❌ Could not get app state: {e}")
            return {}
    
    def print_app_state(self):
        """Print current application state"""
        print("\n📊 Current Application State:")
        print("="*40)
        
        state = self.get_app_state()
        
        if state:
            for key, value in state.items():
                if key == 'balance':
                    print(f"   💰 Balance: {value} microALGOs ({value/1_000_000:.6f} ALGO)")
                elif key == 'limit':
                    print(f"   🚫 Spend Limit: {value} microALGOs ({value/1_000_000:.6f} ALGO)")
                elif key == 'owner':
                    print(f"   👤 Owner: {value}")
                else:
                    print(f"   📝 {key}: {value}")
        else:
            print("   ❌ Could not retrieve state")
    
    def call_contract(self, app_args):
        """Call the contract with given arguments"""
        try:
            # Get network parameters
            params = self.algod_client.suggested_params()
            
            # Create application call transaction
            txn = ApplicationCallTxn(
                sender=self.address,
                sp=params,
                index=self.app_id,
                on_complete=0,  # NoOp
                app_args=app_args
            )
            
            # Sign and send
            signed_txn = txn.sign(self.private_key)
            tx_id = self.algod_client.send_transaction(signed_txn)
            
            print(f"📤 Transaction sent: {tx_id}")
            
            # Wait for confirmation
            confirmed_txn = wait_for_confirmation(self.algod_client, tx_id, 4)
            
            print(f"✅ Transaction confirmed in round {confirmed_txn.get('confirmed-round')}")
            return True
            
        except Exception as e:
            print(f"❌ Transaction failed: {e}")
            return False
    
    def fund_contract(self, amount_microalgos):
        """Fund the contract with specified amount"""
        print(f"\n💰 Funding contract with {amount_microalgos} microALGOs...")
        
        # Convert amount to bytes for app arg
        app_args = [amount_microalgos.to_bytes(8, 'big')]
        
        success = self.call_contract(["fund".encode()] + app_args)
        
        if success:
            print(f"✅ Successfully funded contract!")
            self.print_app_state()
        else:
            print("❌ Funding failed")
    
    def spend_from_contract(self, amount_microalgos):
        """Spend from the contract"""
        print(f"\n💸 Spending {amount_microalgos} microALGOs from contract...")
        
        # Convert amount to bytes for app arg
        app_args = [amount_microalgos.to_bytes(8, 'big')]
        
        success = self.call_contract(["spend".encode()] + app_args)
        
        if success:
            print(f"✅ Successfully spent from contract!")
            self.print_app_state()
        else:
            print("❌ Spending failed")

def load_deployment_info():
    """Load deployment info from file"""
    try:
        with open("deployment_info.json", "r") as f:
            return json.load(f)
    except:
        return None

def load_wallet_from_env():
    """Load wallet from .env file"""
    try:
        env_path = "../.env"
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                content = f.read()
                for line in content.split('\n'):
                    if line.startswith('ALGORAND_MNEMONIC='):
                        return line.split('=', 1)[1].strip('"')
        return None
    except:
        return None

def main():
    """Main testing function"""
    print("🧪 Smart Contract Function Tester")
    print("="*50)
    
    # Load deployment info
    deployment_info = load_deployment_info()
    if deployment_info:
        app_id = deployment_info['app_id']
        print(f"📱 Found deployed contract: {app_id}")
    else:
        app_id = input("Enter your Application ID: ").strip()
        try:
            app_id = int(app_id)
        except:
            print("❌ Invalid Application ID")
            return
    
    # Load wallet
    mnemonic_phrase = load_wallet_from_env()
    if not mnemonic_phrase:
        mnemonic_phrase = input("Enter your wallet mnemonic: ").strip()
    
    if not mnemonic_phrase:
        print("❌ No mnemonic provided")
        return
    
    try:
        # Create tester
        tester = ContractTester(mnemonic_phrase, app_id)
        
        # Show initial state
        tester.print_app_state()
        
        # Interactive testing
        while True:
            print("\n🎯 Choose an action:")
            print("1. 💰 Fund contract")
            print("2. 💸 Spend from contract")
            print("3. 📊 Check contract state")
            print("4. ❌ Exit")
            
            choice = input("Enter choice (1-4): ").strip()
            
            if choice == "1":
                amount = input("Enter amount to fund (in microALGOs, e.g., 1000000 = 1 ALGO): ")
                try:
                    amount = int(amount)
                    tester.fund_contract(amount)
                except:
                    print("❌ Invalid amount")
            
            elif choice == "2":
                amount = input("Enter amount to spend (in microALGOs): ")
                try:
                    amount = int(amount)
                    tester.spend_from_contract(amount)
                except:
                    print("❌ Invalid amount")
            
            elif choice == "3":
                tester.print_app_state()
            
            elif choice == "4":
                print("👋 Goodbye!")
                break
            
            else:
                print("❌ Invalid choice")
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Add missing import
    import base64
    main()
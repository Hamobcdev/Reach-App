#!/usr/bin/env python3
"""
deploy_contract.py - Deploy your compiled smart contract to TestNet
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, wait_for_confirmation
import base64
import os
import json

class ContractDeployer:
    def __init__(self, mnemonic_phrase):
        """Initialize with your wallet mnemonic"""
        try:
            self.private_key = mnemonic.to_private_key(mnemonic_phrase)
            self.address = account.address_from_private_key(self.private_key)
            # Connect to TestNet
            self.algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
            print(f"🏦 Deploying from wallet: {self.address}")
        except Exception as e:
            print(f"❌ Failed to initialize deployer: {e}")
            raise

    def load_teal_files(self):
        """Load your compiled TEAL files"""
        try:
            with open("approval.teal", "r") as f:
                approval_program = f.read()
            with open("clear.teal", "r") as f:
                clear_program = f.read()
            print("✅ TEAL files loaded successfully")
            return approval_program, clear_program
        except FileNotFoundError as e:
            print(f"❌ Could not find TEAL files: {e}")
            print(" Make sure approval.teal and clear.teal are in this directory")
            return None, None

    def compile_program(self, source_code):
        """Compile TEAL source to bytecode"""
        try:
            compile_response = self.algod_client.compile(source_code)
            if not isinstance(compile_response, dict) or 'result' not in compile_response:
                print(f"❌ Invalid compilation response: {compile_response}")
                return None
            compiled_bytes = base64.b64decode(compile_response['result'])
            if not isinstance(compiled_bytes, bytes):
                print(f"❌ Compiled program is not bytes: {type(compiled_bytes)}")
                return None
            print(f"✅ Compiled program: {len(compiled_bytes)} bytes")
            return compiled_bytes
        except Exception as e:
            print(f"❌ Compilation error: {e}")
            return None

    def deploy_contract(self):
        """Deploy the smart contract"""
        print("\n🚀 Starting contract deployment...")
        print("="*50)
        # Load TEAL files
        approval_teal, clear_teal = self.load_teal_files()
        if not approval_teal or not clear_teal:
            return None
        # Compile programs
        print("🔧 Compiling approval program...")
        approval_program = self.compile_program(approval_teal)
        if not approval_program:
            return None
        print("🔧 Compiling clear program...")
        clear_program = self.compile_program(clear_teal)
        if not clear_program:
            return None
        # Get network parameters
        try:
            params = self.algod_client.suggested_params()
            print(f"📡 Connected to network (first valid round: {params.first})")
        except Exception as e:
            print(f"❌ Could not get network parameters: {e}")
            return None
        # Create application creation transaction
        print("📝 Creating deployment transaction...")
        global_schema = {
            "num_uints": 2,  # balance, limit
            "num_byte_slices": 1  # owner
        }
        local_schema = {
            "num_uints": 0,
            "num_byte_slices": 0
        }
        try:
            txn = ApplicationCreateTxn(
                sender=self.address,
                sp=params,
                on_complete=0,  # NoOp
                approval_program=approval_program,
                clear_program=clear_program,
                global_schema=global_schema,
                local_schema=local_schema,
            )
        except Exception as e:
            print(f"❌ Transaction creation failed: {e}")
            return None
        # Sign transaction
        print("✍️ Signing transaction...")
        signed_txn = txn.sign(self.private_key)
        # Send transaction
        print("📤 Sending transaction to network...")
        try:
            tx_id = self.algod_client.send_transaction(signed_txn)
            print(f" Transaction ID: {tx_id}")
            # Wait for confirmation
            print("⏳ Waiting for confirmation...")
            confirmed_txn = wait_for_confirmation(self.algod_client, tx_id, 4)
            # Get application ID
            app_id = confirmed_txn.get("application-index")
            if not app_id:
                print("❌ No application-index in confirmed transaction")
                return None
            print("🎉 CONTRACT DEPLOYMENT SUCCESSFUL!")
            print("="*50)
            print(f"📱 Application ID: {app_id}")
            print(f"🔗 Transaction ID: {tx_id}")
            print(f"🏦 Creator Address: {self.address}")
            print(f"🔄 Confirmed in Round: {confirmed_txn.get('confirmed-round')}")
            # Save deployment info
            deployment_info = {
                "app_id": app_id,
                "creator_address": self.address,
                "tx_id": tx_id,
                "confirmed_round": confirmed_txn.get('confirmed-round')
            }
            with open("deployment_info.json", "w") as f:
                json.dump(deployment_info, f, indent=2)
            print(f"💾 Deployment info saved to deployment_info.json")
            return app_id
        except Exception as e:
            print(f"❌ Deployment failed: {e}")
            return None

def load_wallet_from_env():
    """Load wallet from .env file in current directory"""
    try:
        env_path = ".env"
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                content = f.read()
            for line in content.split('\n'):
                if line.startswith('MNEMONIC='):
                    mnemonic_phrase = line.split('=', 1)[1].strip('"')
                    return mnemonic_phrase
        print("❌ Could not find .env file or MNEMONIC")
        return None
    except Exception as e:
        print(f"❌ Error loading wallet: {e}")
        return None

def main():
    """Main deployment function"""
    print("🚀 Algorand Smart Contract Deployer")
    print("="*50)
    # Load wallet
    print("🔑 Loading your wallet...")
    mnemonic_phrase = load_wallet_from_env()
    if not mnemonic_phrase:
        print("💡 Please enter your wallet mnemonic manually:")
        mnemonic_phrase = input("Enter your 25-word mnemonic: ").strip()
    if not mnemonic_phrase:
        print("❌ No mnemonic provided. Cannot deploy.")
        return
    try:
        # Create deployer
        deployer = ContractDeployer(mnemonic_phrase)
        # Check balance first
        print("💰 Checking wallet balance...")
        try:
            account_info = deployer.algod_client.account_info(deployer.address)
            balance = account_info['amount'] / 1_000_000
            print(f" Balance: {balance:.6f} ALGO")
            if balance < 0.1:
                print("⚠️ WARNING: Low balance! You need at least 0.1 ALGO to deploy")
                return
        except Exception as e:
            print(f"⚠️ Could not check balance: {e}")
            print(" Proceeding anyway...")
        # Deploy contract
        app_id = deployer.deploy_contract()
        if app_id:
            print(f"\n🎯 SUCCESS! Your contract is now live on TestNet!")
            print(f" App ID: {app_id}")
            print(f" You can view it at: https://testnet-idx.algonode.cloud/v2/applications/{app_id}")
        else:
            print("\n😞 Deployment failed.")
    except Exception as e:
        print(f"❌ An error occurred during deployment: {e}")

if __name__ == "__main__":
    main()
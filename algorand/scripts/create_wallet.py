#!/usr/bin/env python3
"""
create_wallet.py - Create and manage your Algorand wallet
Your first real Algorand wallet!
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
import json
import os

def create_new_wallet():
    """Create a brand new Algorand wallet"""
    print("🏦 Creating your new Algorand wallet...")
    print("="*50)
    
    # Generate a new account
    private_key, address = account.generate_account()
    passphrase = mnemonic.from_private_key(private_key)
    
    print("✅ SUCCESS! Your new wallet has been created!")
    print("\n" + "="*60)
    print("📋 YOUR WALLET DETAILS")
    print("="*60)
    print(f"Address: {address}")
    print(f"\nMnemonic (25 words):")
    print(f"{passphrase}")
    print("="*60)
    
    print("\n🔒 CRITICAL SECURITY INSTRUCTIONS:")
    print("1. ✍️  WRITE DOWN your 25-word mnemonic phrase on paper")
    print("2. 🏠 Store it in a safe place (NOT on your computer)")
    print("3. 🤐 NEVER share your mnemonic with anyone")
    print("4. 🚫 NEVER store it in code or send it online")
    print("5. 💾 This mnemonic is your ONLY way to recover your wallet")
    
    return {
        "address": address,
        "private_key": private_key,
        "mnemonic": passphrase
    }

def load_existing_wallet():
    """Load a wallet from existing mnemonic"""
    print("🔑 Loading your existing wallet...")
    print("Please enter your 25-word mnemonic phrase:")
    print("(Make sure there are spaces between each word)")
    
    mnemonic_phrase = input("\nEnter mnemonic: ").strip()
    
    try:
        # Convert mnemonic back to private key and address
        private_key = mnemonic.to_private_key(mnemonic_phrase)
        address = account.address_from_private_key(private_key)
        
        print(f"✅ SUCCESS! Wallet loaded successfully!")
        print(f"Address: {address}")
        
        return {
            "address": address,
            "private_key": private_key,
            "mnemonic": mnemonic_phrase
        }
        
    except Exception as e:
        print(f"❌ ERROR: Could not load wallet: {e}")
        print("Make sure you entered the mnemonic correctly (25 words with spaces)")
        return None

def check_wallet_balance(address):
    """Check the balance of a wallet"""
    try:
        # Connect to TestNet
        algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud", 443)
        
        # Get account info
        account_info = algod_client.account_info(address)
        balance_microalgos = account_info['amount']
        balance_algos = balance_microalgos / 1_000_000
        
        print(f"\n💰 Wallet Balance:")
        print(f"   Address: {address}")
        print(f"   Balance: {balance_algos:.6f} ALGO")
        
        if balance_algos == 0:
            print("\n🪙 Your wallet is empty! You need TestNet tokens.")
            print("📋 To get free TestNet tokens:")
            print("   1. Copy your address above")
            print("   2. Go to: https://bank.testnet.algorand.network/")
            print("   3. Paste your address and click 'Dispense'")
            print("   4. Wait a few seconds and check balance again")
        
        return balance_algos
        
    except Exception as e:
        print(f"⚠️  Could not check balance: {e}")
        return None

def save_wallet_for_development(wallet_data):
    """Save wallet info for development (TESTNET ONLY!)"""
    print("\n💾 Do you want to save wallet info for development?")
    print("⚠️  WARNING: Only do this for TestNet development!")
    print("⚠️  NEVER save real money wallets this way!")
    
    save_choice = input("Save for development? (y/N): ").lower().strip()
    
    if save_choice == 'y':
        # Create .env file for development
        env_content = f"""# Algorand Development Wallet - TESTNET ONLY!
# DO NOT use this wallet for real money!
# DO NOT commit this file to version control!

ALGORAND_MNEMONIC="{wallet_data['mnemonic']}"
ALGORAND_ADDRESS="{wallet_data['address']}"
ALGORAND_NETWORK="testnet"
"""
        
        # Save to parent directory (project root)
        env_path = "../.env"
        with open(env_path, "w") as f:
            f.write(env_content)
        
        print(f"✅ Wallet saved to {env_path}")
        print("🔒 Remember: This file contains your private keys!")
        print("📝 Add '.env' to your .gitignore file!")
        
        # Create .gitignore reminder
        gitignore_path = "../.gitignore"
        gitignore_content = "\n# Environment variables (contains private keys!)\n.env\n"
        
        try:
            with open(gitignore_path, "a") as f:
                f.write(gitignore_content)
            print("✅ Added .env to .gitignore")
        except:
            print("⚠️  Please manually add '.env' to your .gitignore file!")

def main():
    """Main wallet management function"""
    print("🏦 Welcome to Your Algorand Wallet Manager!")
    print("="*50)
    print("Choose an option:")
    print("1. 🆕 Create a new wallet")
    print("2. 🔑 Load existing wallet")
    print("3. 💰 Check wallet balance")
    print("4. ❌ Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        wallet = create_new_wallet()
        if wallet:
            check_wallet_balance(wallet['address'])
            save_wallet_for_development(wallet)
    
    elif choice == "2":
        wallet = load_existing_wallet()
        if wallet:
            check_wallet_balance(wallet['address'])
            save_wallet_for_development(wallet)
    
    elif choice == "3":
        address = input("Enter wallet address to check: ").strip()
        check_wallet_balance(address)
    
    elif choice == "4":
        print("👋 Goodbye!")
        return
    
    else:
        print("❌ Invalid choice. Please enter 1, 2, 3, or 4.")
        return main()

if __name__ == "__main__":
    main()
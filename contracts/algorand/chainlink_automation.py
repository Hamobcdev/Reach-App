"""
Chainlink Automation Integration for Virtual Card Manager
Handles automated limit resets and price feed updates
"""

import os
import json
import time
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from datetime import datetime, timedelta

class ChainlinkAutomation:
    def __init__(self, algod_client, private_key, app_id):
        self.algod_client = algod_client
        self.private_key = private_key
        self.sender = account.address_from_private_key(private_key)
        self.app_id = app_id
        
    def reset_daily_limits(self):
        """Reset daily limits for all users (called by Chainlink automation)"""
        print("🔄 Resetting daily limits...")
        
        params = self.algod_client.suggested_params()
        
        txn = transaction.ApplicationCallTxn(
            sender=self.sender,
            sp=params,
            index=self.app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=["reset_limits"]
        )
        
        signed_txn = txn.sign(self.private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        try:
            confirmed = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
            print(f"✅ Daily limits reset successfully: {tx_id}")
            return True
        except Exception as e:
            print(f"❌ Failed to reset limits: {e}")
            return False
    
    def update_price_feed(self, new_price):
        """Update price feed data (called by Chainlink price feeds)"""
        print(f"💰 Updating price feed: {new_price}")
        
        params = self.algod_client.suggested_params()
        
        txn = transaction.ApplicationCallTxn(
            sender=self.sender,
            sp=params,
            index=self.app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=["update_price_feed", int(new_price * 1000000)]  # Convert to microunits
        )
        
        signed_txn = txn.sign(self.private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        try:
            confirmed = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
            print(f"✅ Price feed updated successfully: {tx_id}")
            return True
        except Exception as e:
            print(f"❌ Failed to update price feed: {e}")
            return False
    
    def check_and_reset_limits(self):
        """Check if limits need to be reset and perform the reset"""
        current_time = datetime.now()
        
        # Check if it's a new day (reset daily limits at midnight UTC)
        if current_time.hour == 0 and current_time.minute < 5:
            print("🌅 New day detected, resetting daily limits...")
            return self.reset_daily_limits()
        
        # Check if it's a new month (reset monthly limits on the 1st)
        if current_time.day == 1 and current_time.hour == 0 and current_time.minute < 5:
            print("📅 New month detected, resetting monthly limits...")
            return self.reset_daily_limits()  # This will reset both daily and monthly
        
        return True

def setup_chainlink_automation():
    """Set up Chainlink automation for the Virtual Card Manager"""
    print("🔗 Setting up Chainlink Automation...")
    
    # Load deployment configuration
    try:
        with open("deployment_testnet.json", "r") as f:
            deployment_info = json.load(f)
        app_id = deployment_info["app_id"]
    except FileNotFoundError:
        print("❌ Deployment file not found. Please deploy the contract first.")
        return
    
    # Initialize Algod client
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    # Get automation account
    automation_mnemonic = os.getenv("CHAINLINK_AUTOMATION_MNEMONIC")
    if not automation_mnemonic:
        print("❌ Please set CHAINLINK_AUTOMATION_MNEMONIC environment variable")
        return
    
    private_key = mnemonic.to_private_key(automation_mnemonic)
    automation = ChainlinkAutomation(algod_client, private_key, app_id)
    
    print("✅ Chainlink automation configured")
    print(f"📋 App ID: {app_id}")
    print(f"🤖 Automation Address: {automation.sender}")
    
    # Test automation
    print("🧪 Testing automation...")
    if automation.check_and_reset_limits():
        print("✅ Automation test successful")
    else:
        print("❌ Automation test failed")

if __name__ == "__main__":
    setup_chainlink_automation()
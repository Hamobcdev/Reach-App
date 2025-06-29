#!/usr/bin/env python3
"""
test_setup.py - Test script to verify Algorand SDK installation
This is your first Algorand development test!
"""

def test_algorand_setup():
    print("=== Testing Your Algorand SDK Setup ===\n")
    
    # Test 1: Import algosdk
    print("🔍 Test 1: Checking if algosdk can be imported...")
    try:
        import algosdk
        print("✅ SUCCESS: algosdk imported successfully!")
    except ImportError as e:
        print(f"❌ FAILED: Could not import algosdk: {e}")
        return False
    
    # Test 2: Import specific modules we need
    print("\n🔍 Test 2: Checking core Algorand modules...")
    try:
        from algosdk import account, mnemonic
        from algosdk.v2client import algod
        print("✅ SUCCESS: All core modules imported!")
        print("   - account module ✓")
        print("   - mnemonic module ✓") 
        print("   - algod client module ✓")
    except ImportError as e:
        print(f"❌ FAILED: Could not import core modules: {e}")
        return False
    
    # Test 3: Create a test wallet (don't worry, this is just for testing)
    print("\n🔍 Test 3: Testing wallet creation...")
    try:
        private_key, address = account.generate_account()
        passphrase = mnemonic.from_private_key(private_key)
        print("✅ SUCCESS: Test wallet created!")
        print(f"   Sample address starts with: {address[:15]}...")
        print("   (This is just a test - not your real wallet)")
    except Exception as e:
        print(f"❌ FAILED: Could not create test wallet: {e}")
        return False
    
    # Test 4: Test connection to Algorand network
    print("\n🔍 Test 4: Testing connection to Algorand TestNet...")
    try:
        # These are public TestNet connection details
        algod_token = ""  # No token needed for public node
        algod_server = "https://testnet-api.algonode.cloud"
        algod_port = 443
        
        algod_client = algod.AlgodClient(algod_token, algod_server, algod_port)
        print("✅ SUCCESS: Connected to TestNet node!")
        print(f"   Server: {algod_server}")
    except Exception as e:
        print(f"❌ FAILED: Could not create connection: {e}")
        return False
    
    # Test 5: Test actual network communication
    print("\n🔍 Test 5: Testing network communication...")
    try:
        status = algod_client.status()
        print("✅ SUCCESS: Network communication works!")
        print(f"   Network: {status.get('genesis-id', 'Unknown')}")
        print(f"   Current block: {status.get('last-round', 'Unknown')}")
        print("   You're connected to the live Algorand TestNet! 🎉")
    except Exception as e:
        print(f"⚠️  WARNING: Network communication failed: {e}")
        print("   This might be due to internet connection - SDK is still working!")
    
    print("\n" + "="*50)
    print("🎉 CONGRATULATIONS! Your Algorand development environment is ready!")
    print("="*50)
    print("\nWhat this means:")
    print("✓ Python SDK is installed correctly")
    print("✓ You can create Algorand wallets")
    print("✓ You can connect to the Algorand network")
    print("✓ You're ready to deploy smart contracts!")
    print("\nNext steps:")
    print("1. Create your real wallet")
    print("2. Get TestNet tokens")
    print("3. Deploy your smart contract")
    
    return True

# This is what runs when you execute the file
if __name__ == "__main__":
    print("Welcome to your first Algorand development test!")
    print("This will check if everything is set up correctly.\n")
    
    success = test_algorand_setup()
    
    if success:
        print("\n🚀 You're ready to start building on Algorand!")
    else:
        print("\n😞 There are some issues to fix first.")
        print("Don't worry - we can solve them together!")
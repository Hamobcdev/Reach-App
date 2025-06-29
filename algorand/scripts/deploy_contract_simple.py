import os
import socket
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction
from algosdk.transaction import ApplicationCreateTxn, OnComplete
from supabase import create_client
from pathlib import Path
import urllib.error

# Load environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
ALGORAND_MNEMONIC = os.getenv('ALGORAND_MNEMONIC')
ALGORAND_URL = os.getenv('ALGORAND_URL', 'https://testnet-algorand.api.purestake.io/ps2')

# Test DNS resolution
try:
    socket.getaddrinfo('testnet-algorand.api.purestake.io', 443)
    print("DNS resolution successful")
except socket.gaierror as e:
    print(f"DNS resolution failed: {e}")
    exit(1)

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Algorand client
try:
    algod_client = algod.AlgodClient('YOUR_PURESTAKE_API_KEY', ALGORAND_URL, headers={'User-Agent': 'algosdk'})
    status = algod_client.status()
    print(f"Algorand node status: {status}")
except urllib.error.URLError as e:
    print(f"Failed to connect to Algorand node: {e}")
    exit(1)

# Read TEAL files
def read_teal(file_path):
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except FileNotFoundError:
        print(f"TEAL file not found: {file_path}")
        exit(1)

approval_program = read_teal('approval.teal')
clear_program = read_teal('clear.teal')

# Compile TEAL
try:
    approval_result = algod_client.compile(approval_program)
    clear_result = algod_client.compile(clear_program)
    approval_program = bytes.fromhex(approval_result['hash'])
    clear_program = bytes.fromhex(clear_result['hash'])
except Exception as e:
    print(f"TEAL compilation failed: {e}")
    exit(1)

# Deploy contract
def deploy_contract(user_id):
    try:
        private_key = mnemonic.to_private_key(ALGORAND_MNEMONIC)
        address = account.address_from_private_key(private_key)

        params = algod_client.suggested_params()
        params.fee = 1000
        params.flat_fee = True

        global_schema = transaction.StateSchema(num_uints=2, num_byte_slices=2)
        local_schema = transaction.StateSchema(num_uints=1, num_byte_slices=0)

        txn = ApplicationCreateTxn(
            sender=address,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema=global_schema,
            local_schema=local_schema,
            app_args=[user_id.encode()]
        )

        signed_txn = txn.sign(private_key)
        tx_id = algod_client.send_transaction(signed_txn)
        result = transaction.wait_for_confirmation(algod_client, tx_id, 4)
        app_id = result['application-index']

        # Save to Supabase
        supabase.table('algorand_contracts').insert({
            'user_id': user_id,
            'app_id': app_id,
            'address': address,
            'network': 'testnet'
        }).execute()

        print(f"Deployed contract for user {user_id}: App ID {app_id}")
        return app_id
    except Exception as e:
        print(f"Contract deployment failed: {e}")
        exit(1)

if __name__ == '__main__':
    user_id = input("Enter user ID (phone number): ")
    deploy_contract(user_id)
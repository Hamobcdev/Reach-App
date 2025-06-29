# deploy.py

from algosdk.v2client import algod
from algosdk.future.transaction import *
from algosdk import account, mnemonic
import json

# Use your sandbox or Algorand wallet keys
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

creator_mnemonic = "your 25-word mnemonic phrase here"
creator_private_key = mnemonic.to_private_key(creator_mnemonic)
creator_address = mnemonic.to_public_key(creator_mnemonic)

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

with open("approval.teal") as f:
    approval_program = f.read()

with open("clear.teal") as f:
    clear_program = f.read()

params = algod_client.suggested_params()

txn = ApplicationCreateTxn(
    sender=creator_address,
    sp=params,
    on_complete=OnComplete.NoOpOC.real,
    approval_program=compileTeal(approval_program, mode=Mode.Application, version=6),
    clear_program=compileTeal(clear_program, mode=Mode.Application, version=6),
    global_schema=StateSchema(num_uints=2, num_byte_slices=1),
    local_schema=StateSchema(num_uints=0, num_byte_slices=0),
)

signed_txn = txn.sign(creator_private_key)
tx_id = algod_client.send_transaction(signed_txn)
print("Transaction ID:", tx_id)

wait_for_confirmation(algod_client, tx_id)

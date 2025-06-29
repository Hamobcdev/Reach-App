#!/usr/bin/env python3
"""
simple_balance.py - Super simple balance checker
"""

import requests

def check_balance_simple(address):
    """Simple balance check using direct API"""
    try:
        url = f"https://testnet-api.algonode.cloud/v2/accounts/{address}"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            balance_microalgos = data['amount']
            balance_algos = balance_microalgos / 1_000_000
            
            print(f"Address: {address}")
            print(f"Balance: {balance_algos:.6f} ALGO")
            
            if balance_algos > 0:
                print("✅ Your wallet is funded!")
            else:
                print("❌ Your wallet is empty - get TestNet tokens!")
                
            return balance_algos
        else:
            print(f"Error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    address = "577ACJKHM4D623YKVQ76TQY4KPKSK3LUEXBEIYSOITROZ4X3PDXWFXMH6Q"
    check_balance_simple(address)
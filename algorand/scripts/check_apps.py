# check_apps.py
#!/usr/bin/env python3
"""
Check applications created by an address
"""
import requests
import json

def check_created_apps(address):
    try:
        url = f"https://testnet-api.algonode.cloud/v2/accounts/{address}"
        response = requests.get(url)
        data = response.json()
        if "created-apps" in data:
            for app in data["created-apps"]:
                print(f"Application ID: {app['id']}")
        else:
            print("No applications found for this address.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    address = "577ACJKHM4D623YKVQ76TQY4KPKSK3LUEXBEIYSOITROZ4X3PDXWFXMH6Q"
    check_created_apps(address)
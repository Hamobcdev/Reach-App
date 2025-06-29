# Algorand Smart Contract Integration

This directory contains the Algorand smart contract code and deployment scripts for the Samoa Virtual Bankcard project.

## Directory Structure

```
algorand/
├── build/                  # Compiled contract artifacts
├── contracts/              # Smart contract source code
│   └── CrisisManagement.algo.ts  # Main contract in TEALScript
├── scripts/                # Utility scripts
├── deploy.js               # Main deployment script
├── package.json            # Algorand-specific dependencies
└── tsconfig.json           # TypeScript configuration
```

## Getting Started

1. Install dependencies:
   ```
   cd algorand
   npm install
   ```

2. Compile the TEALScript contract:
   ```
   npm run compile
   ```

3. Deploy the contract:
   ```
   npm run deploy
   ```
   
   Or from the project root:
   ```
   npm run deploy-algorand
   ```

## Environment Variables

Make sure these variables are set in your `.env` file:

```
ALGORAND_ALGOD_URL=https://testnet-api.algonode.cloud
ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
ALGORAND_PORT=443
ALGORAND_NETWORK=testnet
ALGORAND_ADDRESS=your-algorand-address
ALGORAND_MNEMONIC="your twenty five word mnemonic phrase goes here"
```

## Contract Features

The CrisisManagement contract provides:

- NGO authorization
- Crisis badge issuance
- Emergency fund disbursals
- Token transfers
- Virtual card creation

## Integration with Frontend

After deployment, the contract details are automatically added to your `.env` and `.env.local` files:

```
VITE_ALGORAND_APP_ID=your-app-id
VITE_ALGORAND_APP_ADDRESS=your-app-address
```

These variables are used by the frontend to interact with the deployed contract.
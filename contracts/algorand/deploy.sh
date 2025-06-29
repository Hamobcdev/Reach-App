#!/bin/bash

# Algorand Virtual Card Manager Deployment Script
# Automates the entire deployment process for TestNet and MainNet

set -e  # Exit on any error

echo "🌊 Algorand Virtual Card Manager Deployment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK=${1:-testnet}  # Default to testnet
PYTHON_ENV=${2:-venv}  # Default virtual environment name

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Network: $NETWORK"
echo "   Python Environment: $PYTHON_ENV"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is not installed${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$PYTHON_ENV" ]; then
    echo -e "${YELLOW}🔧 Creating Python virtual environment...${NC}"
    python3 -m venv $PYTHON_ENV
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source $PYTHON_ENV/bin/activate

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pip install -r requirements.txt

# Check for environment variables
if [ -z "$DEPLOYER_MNEMONIC" ]; then
    echo -e "${RED}❌ DEPLOYER_MNEMONIC environment variable not set${NC}"
    echo -e "${YELLOW}💡 Generate a new account:${NC}"
    echo "python3 -c \"from algosdk import account, mnemonic; pk, addr = account.generate_account(); print(f'Address: {addr}'); print(f'Mnemonic: {mnemonic.from_private_key(pk)}')\""
    echo ""
    echo -e "${YELLOW}💡 Then set the environment variable:${NC}"
    echo "export DEPLOYER_MNEMONIC=\"your twelve word mnemonic phrase here\""
    exit 1
fi

# Compile smart contract
echo -e "${YELLOW}📝 Compiling smart contract...${NC}"
python3 virtual_card_manager.py

if [ ! -f "virtual_card_manager_approval.teal" ] || [ ! -f "virtual_card_manager_clear_state.teal" ]; then
    echo -e "${RED}❌ Contract compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Smart contract compiled successfully${NC}"

# Deploy contract
echo -e "${YELLOW}🚀 Deploying to $NETWORK...${NC}"
python3 deploy.py

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    
    # Show deployment files
    echo -e "${BLUE}📄 Generated files:${NC}"
    ls -la *.json *.teal 2>/dev/null || true
    
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Update your Bolt app configuration with the new contract details"
    echo "2. Configure Supabase sync endpoints"
    echo "3. Set up Chainlink automation"
    echo "4. Test the integration"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Deactivate virtual environment
deactivate

echo -e "${GREEN}✅ All done!${NC}"
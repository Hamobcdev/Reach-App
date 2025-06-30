import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.ALCHEMY_POLYGON_RPC_URL) {
    throw new Error('ALCHEMY_POLYGON_RPC_URL is not set in .env');
}
if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is not set in .env');
}

const AidManagerABI = [
    "function distributeAid(address recipient, uint256 amount) external",
    "function recordFiatTransaction(address recipient, uint256 fiatAmount, string memory currency) external",
    "function getUSDValue(uint256 amount) external view returns (uint256)"
];

const provider = new JsonRpcProvider(process.env.ALCHEMY_POLYGON_RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const aidManager = new Contract('<AidManager-address>', AidManagerABI, wallet);

async function getLatestBlock() {
    try {
        const block = await provider.getBlock('latest');
        console.log('Latest Block:', block);
        return block;
    } catch (error) {
        console.error('Error fetching block:', error);
        throw error;
    }
}

async function main() {
    await getLatestBlock();
}

main();
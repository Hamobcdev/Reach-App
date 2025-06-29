import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, '../');
const envPath = path.resolve(rootPath, '.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  process.exit(1);
}

// Read the current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Add VITE_ALGORAND_NODE_URL if it doesn't exist
if (!envContent.includes('VITE_ALGORAND_NODE_URL=')) {
  console.log('Adding VITE_ALGORAND_NODE_URL to .env file...');
  
  // Check if ALGORAND_ALGOD_URL exists to use its value
  const algodUrlMatch = envContent.match(/ALGORAND_ALGOD_URL=(.+)/);
  const algodUrl = algodUrlMatch ? algodUrlMatch[1].trim() : 'https://testnet-api.algonode.cloud';
  
  // Add the new variable
  envContent += `\n# Added for frontend compatibility\nVITE_ALGORAND_NODE_URL=${algodUrl}\n`;
  envContent += `VITE_ALGORAND_NODE_TOKEN=\n`;
  
  // Write the updated content back to .env
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Added VITE_ALGORAND_NODE_URL to .env file');
} else {
  console.log('VITE_ALGORAND_NODE_URL already exists in .env file');
}

// Add VITE_API_BASE_URL if it doesn't exist or is incomplete
if (!envContent.includes('VITE_API_BASE_URL=http://localhost:3001')) {
  console.log('Adding or updating VITE_API_BASE_URL to .env file...');
  
  // Remove existing incomplete entry if it exists
  envContent = envContent.replace(/VITE_API_BASE_URL=http\n/g, '');
  
  // Add the correct entry
  envContent += `\n# API Base URL for backend calls\nVITE_API_BASE_URL=http://localhost:3001\n`;
  
  // Write the updated content back to .env
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Added/updated VITE_API_BASE_URL in .env file');
} else {
  console.log('VITE_API_BASE_URL already correctly set in .env file');
}

// Check for other required variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PUBLIC_KEY'
];

const missingVars = [];
for (const varName of requiredVars) {
  if (!envContent.includes(`${varName}=`)) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.warn('⚠️ The following required variables are missing from your .env file:');
  missingVars.forEach(varName => console.warn(`  - ${varName}`));
  console.warn('Please add them to your .env file to ensure proper functionality.');
}

console.log('✅ Environment variable check complete');
import algosdk from 'algosdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Setup path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, '../');
const envPath = path.resolve(rootPath, '.env');

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Algorand node configuration
const ALGORAND_NODE_URL = process.env.ALGORAND_ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGORAND_NODE_TOKEN = process.env.ALGORAND_NODE_TOKEN || '';
const ALGORAND_MNEMONIC = process.env.ALGORAND_MNEMONIC;
const NETWORK = process.env.ALGORAND_NETWORK || 'testnet';

if (!ALGORAND_MNEMONIC) {
  console.error('Error: ALGORAND_MNEMONIC must be set in .env file');
  process.exit(1);
}

// Initialize Algod client
const algodClient = new algosdk.Algodv2(ALGORAND_NODE_TOKEN, ALGORAND_NODE_URL, '');

// Get deployer account from mnemonic
const deployerAccount = algosdk.mnemonicToSecretKey(ALGORAND_MNEMONIC);
console.log(`\n🔑 Deployer address: ${deployerAccount.addr}`);

// Compile TEALScript to TEAL
async function compileTEALScript() {
  try {
    console.log('\n📝 Compiling TEALScript to TEAL...');
    
    // Check if the contract file exists
    const contractPath = path.join(__dirname, '..', 'algorand', 'contracts', 'CrisisManagement.algo.ts');
    if (!fs.existsSync(contractPath)) {
      console.error(`Error: Contract file not found at ${contractPath}`);
      process.exit(1);
    }
    
    // Use npx to run the compilation script with the correct flag format
    try {
      console.log('Compiling TEALScript contract...');
      execSync(`npx tealscript ${contractPath}`, { stdio: 'inherit' });
      
      console.log('✅ TEALScript compilation successful!');
      
      // Check if the output files exist
      const approvalPath = path.join(__dirname, 'contracts', 'approval.teal');
      const clearPath = path.join(__dirname, 'contracts', 'clear.teal');
      
      if (!fs.existsSync(approvalPath) || !fs.existsSync(clearPath)) {
        console.error('Error: Compiled TEAL files not found');
        process.exit(1);
      }
      
      return {
        approvalPath,
        clearPath
      };
    } catch (error) {
      console.error('Error during compilation:', error);
      
      // Fallback: Check if we already have TEAL files
      console.log('Checking for existing TEAL files...');
      const approvalPath = path.join(__dirname, 'contracts', 'approval.teal');
      const clearPath = path.join(__dirname, 'contracts', 'clear.teal');
      
      if (fs.existsSync(approvalPath) && fs.existsSync(clearPath)) {
        console.log('✅ Found existing TEAL files, using those instead');
        return { approvalPath, clearPath };
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error compiling TEALScript:', error);
    process.exit(1);
  }
}

// Read TEAL files
async function readTealFiles(approvalPath, clearPath) {
  try {
    console.log('\n📄 Reading TEAL files...');
    
    if (!fs.existsSync(approvalPath) || !fs.existsSync(clearPath)) {
      console.error('TEAL files not found. Please ensure approval.teal and clear.teal exist.');
      process.exit(1);
    }
    
    const approvalProgram = fs.readFileSync(approvalPath, 'utf8');
    const clearProgram = fs.readFileSync(clearPath, 'utf8');
    
    console.log('✅ TEAL files read successfully');
    return { approvalProgram, clearProgram };
  } catch (error) {
    console.error('Error reading TEAL files:', error);
    process.exit(1);
  }
}

// Compile TEAL to bytecode
async function compileTeal(client, tealSource) {
  try {
    const compileResponse = await client.compile(tealSource).do();
    return new Uint8Array(Buffer.from(compileResponse.result, 'base64'));
  } catch (error) {
    console.error('Error compiling TEAL:', error);
    throw error;
  }
}

// Deploy the contract
async function deployContract() {
  try {
    console.log('\n🚀 Deploying Crisis Management Contract to Algorand...');
    console.log(`Network: ${NETWORK}`);
    
    // Check account balance
    const accountInfo = await algodClient.accountInformation(deployerAccount.addr).do();
    const balance = Number(accountInfo.amount) / 1000000; // Convert microAlgos to Algos
    console.log(`💰 Account balance: ${balance.toFixed(6)} ALGO`);
    
    if (balance < 0.1) {
      console.error('❌ Insufficient balance for deployment. Need at least 0.1 ALGO.');
      process.exit(1);
    }
    
    // Compile TEALScript to TEAL
    const { approvalPath, clearPath } = await compileTEALScript();
    
    // Read and compile TEAL files
    const { approvalProgram, clearProgram } = await readTealFiles(approvalPath, clearPath);
    const compiledApproval = await compileTeal(algodClient, approvalProgram);
    const compiledClear = await compileTeal(algodClient, clearProgram);
    
    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Create application
    console.log('\n📝 Creating application transaction...');
    
    const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
      from: deployerAccount.addr,
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram: compiledApproval,
      clearProgram: compiledClear,
      numGlobalInts: 10,
      numGlobalByteSlices: 0,
      numLocalInts: 6,
      numLocalByteSlices: 0,
      extraPages: 0,
      note: new Uint8Array(Buffer.from('Crisis Management Contract'))
    });
    
    // Sign transaction
    const signedTxn = appCreateTxn.signTxn(deployerAccount.sk);
    
    // Submit transaction
    console.log('📤 Submitting application creation transaction...');
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    console.log(`🔄 Transaction ID: ${txId}`);
    console.log('⏳ Waiting for confirmation...');
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    // Get application ID
    const appId = confirmedTxn['application-index'];
    const appAddress = algosdk.getApplicationAddress(appId);
    
    console.log(`\n✅ Application deployed successfully!`);
    console.log(`📋 Application ID: ${appId}`);
    console.log(`📍 Application Address: ${appAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      appId: appId,
      appAddress: appAddress,
      txId: txId,
      network: NETWORK,
      deployedAt: new Date().toISOString(),
      deployerAddress: deployerAccount.addr
    };
    
    // Save to deployment-info.json
    fs.writeFileSync(
      path.join(__dirname, 'deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('💾 Deployment info saved to deployment-info.json');
    
    // Update .env file with app ID and address
    updateEnvFile(appId, appAddress, txId);
    
    return { appId, appAddress, txId };
  } catch (error) {
    console.error('❌ Error deploying contract:', error);
    process.exit(1);
  }
}

// Update .env file with app ID and address
function updateEnvFile(appId, appAddress, txId) {
  try {
    console.log('\n📝 Updating .env file with application details...');
    
    // Read current .env content
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add or update VITE_ALGORAND_APP_ID and VITE_ALGORAND_APP_ADDRESS
    const appIdRegex = /VITE_ALGORAND_APP_ID=.*/;
    const appAddressRegex = /VITE_ALGORAND_APP_ADDRESS=.*/;
    
    if (appIdRegex.test(envContent)) {
      envContent = envContent.replace(appIdRegex, `VITE_ALGORAND_APP_ID=${appId}`);
    } else {
      envContent += `\nVITE_ALGORAND_APP_ID=${appId}`;
    }
    
    if (appAddressRegex.test(envContent)) {
      envContent = envContent.replace(appAddressRegex, `VITE_ALGORAND_APP_ADDRESS=${appAddress}`);
    } else {
      envContent += `\nVITE_ALGORAND_APP_ADDRESS=${appAddress}`;
    }
    
    // Write updated content back to .env
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated with application details');
    
    // Also create .env.local with the same info
    const envLocalContent = `# Algorand Contract Deployment\n` +
      `VITE_ALGORAND_APP_ID=${appId}\n` +
      `VITE_ALGORAND_APP_ADDRESS=${appAddress}\n` +
      `VITE_ALGORAND_NETWORK=${NETWORK}\n` +
      `VITE_ALGORAND_DEPLOYMENT_TX=${txId}\n` +
      `VITE_ALGORAND_DEPLOYED_AT=${new Date().toISOString()}\n`;
    
    fs.writeFileSync(path.resolve(rootPath, '.env.local'), envLocalContent);
    console.log('✅ .env.local file created with application details');
    
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
}

// Main function
async function main() {
  try {
    const { appId, appAddress, txId } = await deployContract();
    console.log('\n🎉 Deployment complete! Your Algorand contract is now live on TestNet.');
    console.log('You can now restart your server to enable the Algorand Event Listener.');
    
    // Print explorer link
    if (NETWORK === 'testnet') {
      console.log('\n🔍 View your contract on AlgoExplorer:');
      console.log(`https://testnet.algoexplorer.io/application/${appId}`);
    } else if (NETWORK === 'mainnet') {
      console.log('\n🔍 View your contract on AlgoExplorer:');
      console.log(`https://algoexplorer.io/application/${appId}`);
    }
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

// Run the main function
main();
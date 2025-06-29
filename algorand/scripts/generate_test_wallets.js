// algorand/scripts/generate_test_wallets.js

import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';

// Number of wallets to generate
const NUM_WALLETS = 7;

// Output file
const OUTPUT_FILE = path.resolve(process.cwd(), 'test-credentials.txt');

async function generateWallets() {
  const accounts = [];

  for (let i = 0; i < NUM_WALLETS; i++) {
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

    const wallet = {
      index: i + 1,
      address: account.addr,
      mnemonic: mnemonic
    };

    accounts.push(wallet);
    console.log(`Wallet ${wallet.index}: ${wallet.address}`);
  }

  // Save to test-credentials.txt
  const output = accounts.map(
    acc => `# Wallet ${acc.index}\nADDRESS=${acc.address}\nMNEMONIC="${acc.mnemonic}"\n`
  ).join('\n');

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`\n✅ Wallets saved to ${OUTPUT_FILE}`);
}

generateWallets().catch(console.error);

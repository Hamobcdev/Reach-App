// scripts/generateDeployments.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const broadcastPath = './cache/DeployAidSystem.s.sol/80002/run-latest.json';
const outDir = './out';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const raw = fs.readFileSync(path.resolve(__dirname, '..', broadcastPath));
const data = JSON.parse(raw);

const deployments = {};

for (const tx of data.transactions) {
  if (tx.contractName && tx.contractAddress) {
    const name = tx.contractName;
    const address = tx.contractAddress;
    const abiPath = `out/${name}.sol/${name}.json`;

    deployments[name] = { address, abiPath };
  }
}

fs.writeFileSync(
  'deployments.json',
  JSON.stringify(deployments, null, 2)
);

console.log('✅ Created deployments.json');


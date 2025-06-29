import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const algorandDir = path.resolve(__dirname, '..');

// Legacy files to remove
const legacyFiles = [
  // Python files
  'compile.py',
  'deploy.py',
  'scripts/check_apps.py',
  'scripts/check_balance.py',
  'scripts/create_wallet.py',
  'scripts/deploy_contract.py',
  'scripts/deploy_contract_simple.py',
  'scripts/test_contract.py',
  'scripts/test_setup.py',
  
  // Legacy contract files
  'contracts/contract.py',
  
  // Keep the TEAL files as they might be needed for reference
  // 'contracts/approval.teal',
  // 'contracts/clear.teal',
];

// Create a directory for backup if it doesn't exist
const backupDir = path.join(algorandDir, 'legacy_backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Function to backup and remove a file
function backupAndRemove(filePath) {
  const fullPath = path.join(algorandDir, filePath);
  
  // Check if file exists
  if (fs.existsSync(fullPath)) {
    try {
      // Create necessary directories in backup
      const backupPath = path.join(backupDir, filePath);
      const backupDirPath = path.dirname(backupPath);
      
      if (!fs.existsSync(backupDirPath)) {
        fs.mkdirSync(backupDirPath, { recursive: true });
      }
      
      // Copy file to backup
      fs.copyFileSync(fullPath, backupPath);
      console.log(`✅ Backed up: ${filePath}`);
      
      // Remove original file
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Removed: ${filePath}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      return false;
    }
  } else {
    console.log(`⚠️ File not found: ${filePath}`);
    return false;
  }
}

// Main function
function cleanLegacyFiles() {
  console.log('🧹 Cleaning up legacy Algorand files...');
  console.log(`All removed files will be backed up to: ${backupDir}`);
  
  let removedCount = 0;
  let errorCount = 0;
  
  for (const file of legacyFiles) {
    const success = backupAndRemove(file);
    if (success) {
      removedCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n🧹 Cleanup Summary:');
  console.log(`✅ Successfully processed: ${removedCount} files`);
  console.log(`⚠️ Files not found or errors: ${errorCount} files`);
  console.log(`🗂️ Backup location: ${backupDir}`);
  
  // Check if build directory exists, create if not
  const buildDir = path.join(algorandDir, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
    console.log(`\n📁 Created build directory for compiled contracts: ${buildDir}`);
  }
  
  console.log('\n✨ Cleanup complete! Your Algorand directory is now organized for the TypeScript TEALScript workflow.');
}

// Run the cleanup
cleanLegacyFiles();
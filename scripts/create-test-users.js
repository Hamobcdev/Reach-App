import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import axios from 'axios';

// Setup path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '../');
const envPath = resolve(rootPath, '.env');

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// API base URL for backend calls
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Read Algorand wallet details from test-credentials.txt
const readAlgorandWallets = () => {
  try {
    const credentialsPath = resolve(rootPath, 'test-credentials.txt');
    if (!fs.existsSync(credentialsPath)) {
      console.error('Error: test-credentials.txt file not found');
      process.exit(1);
    }

    const content = fs.readFileSync(credentialsPath, 'utf8');
    const wallets = [];
    let currentWallet = {};

    // Parse the file line by line
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line.startsWith('# Wallet')) {
        // Start of a new wallet section
        if (currentWallet.address && currentWallet.mnemonic) {
          wallets.push({ ...currentWallet });
        }
        currentWallet = {};
      } else if (line.startsWith('ADDRESS=')) {
        currentWallet.address = line.substring('ADDRESS='.length);
      } else if (line.startsWith('MNEMONIC=')) {
        // Extract the mnemonic, removing surrounding quotes if present
        let mnemonic = line.substring('MNEMONIC='.length);
        if (mnemonic.startsWith('"') && mnemonic.endsWith('"')) {
          mnemonic = mnemonic.substring(1, mnemonic.length - 1);
        }
        currentWallet.mnemonic = mnemonic;
      }
    });

    // Add the last wallet if it exists
    if (currentWallet.address && currentWallet.mnemonic) {
      wallets.push({ ...currentWallet });
    }

    if (wallets.length === 0) {
      console.error('Error: No valid wallets found in test-credentials.txt');
      process.exit(1);
    }

    return wallets;
  } catch (error) {
    console.error('Error reading Algorand wallets:', error);
    process.exit(1);
  }
};

// Get Algorand wallets from test-credentials.txt
const algorandWallets = readAlgorandWallets();
console.log(`Read ${algorandWallets.length} Algorand wallets from test-credentials.txt`);

// Test user data with the Algorand addresses from test-credentials.txt
const testUsers = [
  {
    email: 'admin@samoavirtualcard.com',
    password: 'Password123!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+685123456',
    country: 'Samoa',
    region: 'Apia',
    wallet_address: algorandWallets[0].address,
    algorand_mnemonic: algorandWallets[0].mnemonic,
    kyc_status: 'approved',
    tier: 'ENHANCED',
    mobile_money_provider: 'Digicel',
    mobile_money_balance: 1000
  },
  {
    email: 'ngo@samoavirtualcard.com',
    password: 'Password123!',
    role: 'ngo',
    firstName: 'NGO',
    lastName: 'Manager',
    phone: '+685234567',
    country: 'Samoa',
    region: 'Savai\'i',
    wallet_address: algorandWallets[1].address,
    algorand_mnemonic: algorandWallets[1].mnemonic,
    kyc_status: 'approved',
    tier: 'ENHANCED',
    mobile_money_provider: 'Vodafone',
    mobile_money_balance: 2000
  },
  {
    email: 'agent@samoavirtualcard.com',
    password: 'Password123!',
    role: 'agent',
    firstName: 'Agent',
    lastName: 'Support',
    phone: '+685345678',
    country: 'Samoa',
    region: 'Apia',
    wallet_address: algorandWallets[2].address,
    algorand_mnemonic: algorandWallets[2].mnemonic,
    kyc_status: 'approved',
    tier: 'STANDARD',
    mobile_money_provider: 'Digicel',
    mobile_money_balance: 500
  },
  {
    email: 'user1@samoavirtualcard.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Regular',
    lastName: 'User',
    phone: '+685456789',
    country: 'Samoa',
    region: 'Upolu',
    wallet_address: algorandWallets[3].address,
    algorand_mnemonic: algorandWallets[3].mnemonic,
    kyc_status: 'approved',
    tier: 'BASIC',
    mobile_money_provider: 'Digicel',
    mobile_money_balance: 200
  },
  {
    email: 'user2@samoavirtualcard.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'New',
    lastName: 'Applicant',
    phone: '+685567890',
    country: 'Samoa',
    region: 'Apia',
    wallet_address: algorandWallets[4].address,
    algorand_mnemonic: algorandWallets[4].mnemonic,
    kyc_status: 'pending',
    tier: 'INSUFFICIENT',
    mobile_money_provider: 'Vodafone',
    mobile_money_balance: 50
  },
  {
    email: 'judge@samoavirtualcard.com',
    password: 'Password123!',
    role: 'admin',
    firstName: 'Judge',
    lastName: 'Demo',
    phone: '+685678901',
    country: 'Samoa',
    region: 'Apia',
    wallet_address: algorandWallets[5].address,
    algorand_mnemonic: algorandWallets[5].mnemonic,
    kyc_status: 'approved',
    tier: 'ENHANCED',
    mobile_money_provider: 'Digicel',
    mobile_money_balance: 5000
  },
  {
    email: 'crisis@samoavirtualcard.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Crisis',
    lastName: 'Victim',
    phone: '+685789012',
    country: 'Samoa',
    region: 'Savai\'i',
    wallet_address: algorandWallets[6].address,
    algorand_mnemonic: algorandWallets[6].mnemonic,
    kyc_status: 'approved',
    tier: 'BASIC',
    mobile_money_provider: 'Vodafone',
    mobile_money_balance: 100
  }
];

// Function to create a Stripe customer for a user
async function createStripeCustomer(userId, email) {
  try {
    console.log(`Creating Stripe customer for user ${email}...`);

    const response = await axios.post(`${API_BASE_URL}/api/create-stripe-customer`, {
      user_id: userId,
      email: email,
      currency: 'USD'
    });

    if (response.data && response.data.success) {
      console.log(`✅ Created Stripe customer: ${response.data.stripe_customer_id}`);
      return response.data.stripe_customer_id;
    } else {
      console.error(`Error creating Stripe customer for ${email}:`, response.data?.error || 'Unknown error');
      // Continue without Stripe customer ID
      return null;
    }
  } catch (error) {
    console.error(`Error calling Stripe customer API for ${email}:`, error.message);
    // Continue without Stripe customer ID
    return null;
  }
}

// Function to create a mobile money transaction for a user
async function createMobileMoneyTransaction(userId, phone, provider, amount) {
  try {
    console.log(`Creating mobile money transaction for ${phone} (${provider})...`);

    const response = await axios.post(`${API_BASE_URL}/api/mobile-money/receive`, {
      user_id: userId,
      phoneNumber: phone,
      amount: amount,
      currency: 'WST',
      sender: `Test ${provider} Deposit`,
      provider: provider
    });

    if (response.data && response.data.success) {
      console.log(`✅ Created mobile money transaction: ${response.data.transactionId}`);
      return response.data.transactionId;
    } else {
      console.error(`Error creating mobile money transaction for ${phone}:`, response.data?.error || 'Unknown error');
      // Continue without mobile money transaction
      return null;
    }
  } catch (error) {
    console.error(`Error calling mobile money API for ${phone}:`, error.message);
    // Continue without mobile money transaction
    return null;
  }
}

// Function to create a user in Supabase Auth and add profile data
async function createTestUser(userData) {
  try {
    console.log(`Creating user: ${userData.email} (${userData.role})...`);

    // Check if user already exists in auth.users
    const { data: existingAuthUsers, error: existingAuthError } = await supabase.auth.admin.listUsers();
    
    if (existingAuthError) {
      console.error('Error checking existing auth users:', existingAuthError.message);
    } else {
      const existingUser = existingAuthUsers.users.find(u => u.email === userData.email);
      if (existingUser) {
        console.log(`User ${userData.email} already exists in auth.users with ID: ${existingUser.id}`);
        
        // Check if user exists in public.users
        const { data: existingProfile, error: existingProfileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', existingUser.id)
          .single();
          
        if (!existingProfileError && existingProfile) {
          console.log(`User ${userData.email} already exists in public.users. Skipping creation.`);
          return {
            id: existingUser.id,
            stripeCustomerId: existingProfile.stripe_customer_id
          };
        }
        
        // If user exists in auth but not in public.users, continue with profile creation
        return await createUserProfile(existingUser.id, userData);
      }
    }

    // Step 1: Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true // Auto-confirm email
    });

    if (authError) {
      console.error(`Error creating auth user ${userData.email}:`, authError.message);
      return null;
    }

    const userId = authUser.user.id;
    console.log(`Auth user created with ID: ${userId}`);

    return await createUserProfile(userId, userData);
  } catch (error) {
    console.error(`Unexpected error creating user ${userData.email}:`, error.message);
    return null;
  }
}

// Function to create user profile and related data
async function createUserProfile(userId, userData) {
  try {
    // Step 2: Update user profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userData.email,
        role: userData.role,
        full_name: `${userData.firstName} ${userData.lastName}`,
        phone: userData.phone,
        country: userData.country,
        region: userData.region,
        wallet_address: userData.wallet_address,
        algorand_address: userData.wallet_address,
        kyc_status: userData.kyc_status,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (profileError) {
      console.error(`Error creating profile for ${userData.email}:`, profileError.message);
      return { id: userId, error: profileError.message };
    }

    // Step 3: Create KYC data
    const { error: kycError } = await supabase
      .from('kyc_data')
      .upsert({
        user_id: userId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        address: `${Math.floor(Math.random() * 100) + 1} Main Street`,
        region: userData.region,
        country: userData.country,
        tier: userData.tier,
        status: userData.kyc_status === 'approved' ? 'verified' : 'pending', // Map 'approved' to 'verified'
        created_at: new Date()
      });

    if (kycError) {
      console.error(`Error creating KYC data for ${userData.email}:`, kycError.message);
      // Continue despite error
    }

    // Step 4: Create wallet for the user
    const { error: walletError } = await supabase
      .from('wallets')
      .upsert({
        user_id: userId,
        wallet_type: 'virtual',
        currency: 'WST',
        balance: userData.role === 'admin' || userData.role === 'ngo' ? 10000 : 500,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (walletError) {
      console.error(`Error creating wallet for ${userData.email}:`, walletError.message);
      // Continue despite error
    }

    // Step 5: Create virtual token balance
    const { error: tokenError } = await supabase
      .from('virtual_token_balances')
      .upsert({
        user_id: userId,
        token_type: 'WST.v',
        balance: userData.role === 'admin' || userData.role === 'ngo' ? 5000 : 200,
        locked_balance: 0,
        algorand_address: userData.wallet_address,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (tokenError) {
      console.error(`Error creating token balance for ${userData.email}:`, tokenError.message);
      // Continue despite error
    }

    // Step 6: If user is NGO, create NGO record
    if (userData.role === 'ngo') {
      const { error: ngoError } = await supabase
        .from('ngos')
        .upsert({
          user_id: userId,
          name: `${userData.firstName} ${userData.lastName} NGO`,
          wallet_address: userData.wallet_address,
          algorand_address: userData.wallet_address,
          country: userData.country,
          region: userData.region,
          contact_email: userData.email,
          contact_phone: userData.phone,
          rating: 8,
          is_active: true,
          is_authorized: true,
          created_at: new Date(),
          updated_at: new Date()
        });

      if (ngoError) {
        console.error(`Error creating NGO record for ${userData.email}:`, ngoError.message);
        // Continue despite error
      }
    }

    // Step 7: Create security settings
    const { error: securityError } = await supabase
      .from('user_security_settings')
      .upsert({
        user_id: userId,
        phone: userData.phone,
        phone_verified: true,
        mfa_enabled: false,
        failed_login_attempts: 0,
        created_at: new Date()
      });

    if (securityError) {
      console.error(`Error creating security settings for ${userData.email}:`, securityError.message);
      // Continue despite error
    }

    // Step 8: Create Stripe customer
    let stripeCustomerId = null;
    try {
      stripeCustomerId = await createStripeCustomer(userId, userData.email);

      if (stripeCustomerId) {
        // Update user record with Stripe customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', userId);

        console.log(`✅ Updated user with Stripe customer ID: ${stripeCustomerId}`);
      }
    } catch (stripeError) {
      console.error(`Error in Stripe customer creation for ${userData.email}:`, stripeError.message);
      // Continue despite error
    }

    // Step 9: Create mobile money transaction if provider is specified
    if (userData.mobile_money_provider && userData.mobile_money_balance > 0) {
      try {
        await createMobileMoneyTransaction(
          userId,
          userData.phone,
          userData.mobile_money_provider,
          userData.mobile_money_balance
        );
      } catch (mobileError) {
        console.error(`Error in mobile money setup for ${userData.email}:`, mobileError.message);
        // Continue despite error
      }
    }

    // Step 10: Log event
    try {
      await supabase
        .from('events')
        .insert({
          user_id: userId,
          type: 'test_user_created',
          data: {
            email: userData.email,
            role: userData.role,
            created_by: 'system',
            created_at: new Date().toISOString(),
            stripe_customer_id: stripeCustomerId
          },
          created_at: new Date()
        });
    } catch (eventError) {
      console.error(`Error logging event for ${userData.email}:`, eventError.message);
      // Continue despite error
    }

    console.log(`✅ User ${userData.email} (${userData.role}) created successfully!`);
    return {
      id: userId,
      stripeCustomerId
    };
  } catch (error) {
    console.error(`Unexpected error creating user profile for ${userData.email}:`, error.message);
    return { id: userId, error: error.message };
  }
}

// Function to create a crisis case for testing
async function createCrisisCase(userId, userWalletAddress) {
  try {
    console.log(`Creating emergency case for user ${userId}...`);

    // First check if NGO exists
    const { data: ngo, error: ngoError } = await supabase
      .from('ngos')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    if (ngoError) {
      console.error('Error finding NGO for case assignment:', ngoError.message);
      console.log('Creating emergency case without NGO assignment...');
      
      const crisisTypes = ['natural_disaster', 'medical_emergency', 'conflict', 'economic_hardship', 'refugee'];
      const randomType = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
      const severity = Math.floor(Math.random() * 5) + 1;

      const { data: caseData, error: caseError } = await supabase
        .from('emergency_cases')
        .insert({
          user_id: userId,
          user_wallet: userWalletAddress,
          title: `Emergency ${randomType.replace('_', ' ')} assistance needed`,
          description: `This is a test emergency case for ${randomType.replace('_', ' ')} relief assistance.`,
          crisis_type: randomType,
          severity_level: severity,
          status: 'pending',
          requested_amount: Math.floor(Math.random() * 1000) + 100,
          location: 'Apia, Samoa',
          supporting_documents: JSON.stringify([
            { type: 'photo', name: 'situation.jpg', url: 'https://example.com/photo.jpg' },
            { type: 'document', name: 'statement.pdf', url: 'https://example.com/doc.pdf' }
          ]),
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();

      if (caseError) {
        console.error('Error creating emergency case:', caseError.message);
        return null;
      }

      console.log(`✅ Created emergency case ID: ${caseData.id}`);
      return caseData.id;
    }

    // If NGO exists, create case with NGO assignment
    const crisisTypes = ['natural_disaster', 'medical_emergency', 'conflict', 'economic_hardship', 'refugee'];
    const randomType = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
    const severity = Math.floor(Math.random() * 5) + 1;

    const { data: caseData, error: caseError } = await supabase
      .from('emergency_cases')
      .insert({
        user_id: userId,
        user_wallet: userWalletAddress,
        title: `Emergency ${randomType.replace('_', ' ')} assistance needed`,
        description: `This is a test emergency case for ${randomType.replace('_', ' ')} relief assistance.`,
        crisis_type: randomType,
        severity_level: severity,
        status: 'pending',
        assigned_ngo_id: ngo[0].id,
        requested_amount: Math.floor(Math.random() * 1000) + 100,
        location: 'Apia, Samoa',
        supporting_documents: JSON.stringify([
          { type: 'photo', name: 'situation.jpg', url: 'https://example.com/photo.jpg' },
          { type: 'document', name: 'statement.pdf', url: 'https://example.com/doc.pdf' }
        ]),
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (caseError) {
      console.error('Error creating emergency case:', caseError.message);
      return null;
    }

    console.log(`✅ Created emergency case ID: ${caseData.id}`);
    return caseData.id;
  } catch (error) {
    console.error('Unexpected error creating crisis case:', error.message);
    return null;
  }
}

// Function to update .env file with test user credentials
async function updateEnvFile(users) {
  try {
    console.log('\nUpdating .env file with test user credentials...');

    // Create a backup of the original .env file
    fs.copyFileSync(envPath, `${envPath}.backup`);
    console.log(`Created backup of .env file at ${envPath}.backup`);

    // Read the current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Remove existing test user credentials if they exist
    const testUserSectionStart = envContent.indexOf('\n\n# Test User Credentials');
    if (testUserSectionStart !== -1) {
      envContent = envContent.substring(0, testUserSectionStart);
    }

    // Add a section for test users
    envContent += '\n\n# Test User Credentials - DO NOT USE IN PRODUCTION\n';

    // Add each user's credentials
    users.forEach((user, index) => {
      envContent += `\n# User ${index + 1}: ${user.role.toUpperCase()}\n`;
      envContent += `TEST_USER_${index + 1}_EMAIL=${user.email}\n`;
      envContent += `TEST_USER_${index + 1}_PASSWORD=${user.password}\n`;
      envContent += `TEST_USER_${index + 1}_ROLE=${user.role}\n`;
      envContent += `TEST_USER_${index + 1}_ALGORAND_ADDRESS=${user.wallet_address}\n`;
      envContent += `TEST_USER_${index + 1}_ALGORAND_MNEMONIC="${user.algorand_mnemonic}"\n`;
      if (user.stripeCustomerId) {
        envContent += `TEST_USER_${index + 1}_STRIPE_CUSTOMER_ID=${user.stripeCustomerId}\n`;
      }
    });

    // Write the updated content back to .env
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env file with test user credentials`);

    // Also create a separate file with just the test credentials for reference
    const testCredsPath = resolve(rootPath, 'test-credentials.txt');
    let testCredsContent = '# Samoa Virtual Bankcard - Test User Credentials\n';
    testCredsContent += '# IMPORTANT: These credentials are for testing only. Do not use in production.\n\n';

    // First add the wallet information
    algorandWallets.forEach((wallet, index) => {
      testCredsContent += `# Wallet ${index + 1}\n`;
      testCredsContent += `ADDRESS=${wallet.address}\n`;
      testCredsContent += `MNEMONIC="${wallet.mnemonic}"\n\n`;
    });

    // Then add the user credentials
    users.forEach((user, index) => {
      testCredsContent += `## User ${index + 1}: ${user.role.toUpperCase()}\n`;
      testCredsContent += `Email: ${user.email}\n`;
      testCredsContent += `Password: ${user.password}\n`;
      testCredsContent += `Role: ${user.role}\n`;
      testCredsContent += `Algorand Address: ${user.wallet_address}\n`;
      testCredsContent += `Algorand Mnemonic: ${user.algorand_mnemonic}\n`;
      if (user.stripeCustomerId) {
        testCredsContent += `Stripe Customer ID: ${user.stripeCustomerId}\n`;
      }
      testCredsContent += `Mobile Money Provider: ${user.mobile_money_provider}\n`;
      testCredsContent += `Mobile Money Balance: ${user.mobile_money_balance} WST\n\n`;
    });

    fs.writeFileSync(testCredsPath, testCredsContent);
    console.log(`✅ Created test credentials reference file at ${testCredsPath}`);

    return true;
  } catch (error) {
    console.error('Error updating .env file:', error.message);
    return false;
  }
}

// Main function to create all test users
async function createAllTestUsers() {
  console.log('🚀 Creating test users in Supabase...');

  // Check if backend server is running
  try {
    await axios.get(`${API_BASE_URL}/api/test`);
    console.log('✅ Backend server is running');
  } catch (error) {
    console.error('❌ Backend server is not running. Please start the server with:');
    console.error('   cd server && npm run dev');
    console.error('   or: node server/server.js');
    process.exit(1);
  }

  const createdUsers = [];

  for (const userData of testUsers) {
    const result = await createTestUser(userData);
    if (result) {
      createdUsers.push({
        ...userData,
        id: result.id,
        stripeCustomerId: result.stripeCustomerId
      });

      // Create a crisis case for the crisis victim user
      if (userData.email === 'crisis@samoavirtualcard.com') {
        await createCrisisCase(result.id, userData.wallet_address);
      }
    }
  }

  console.log(`\n✅ Created ${createdUsers.length} test users out of ${testUsers.length} total`);

  // Update .env file with test user credentials
  await updateEnvFile(createdUsers);

  console.log('\n🎉 Test setup complete! You can now log in with these test accounts:');
  testUsers.forEach(user => {
    console.log(`- ${user.email} (${user.role.toUpperCase()}) - Password: ${user.password}`);
  });
}

// Run the main function
createAllTestUsers().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
});
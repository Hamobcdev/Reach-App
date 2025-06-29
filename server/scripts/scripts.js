#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Samoa Virtual Bankcard Backend...\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version:', nodeVersion);

// Create necessary directories
const directories = [
  'config',
  'middleware',
  'routes',
  'scripts',
  'tests',
  'logs'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('\n📝 Creating .env file from template...');
  
  const envTemplate = `# ===========================================
# SAMOA VIRTUAL BANKCARD - ENVIRONMENT SETUP
# ===========================================
# Copy this to .env and fill in your actual values

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Stripe Configuration (MUST match Bolt's parameter names)
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_API_VERSION=2023-10-16

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Blockchain Configuration
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/your-key
PRIVATE_KEY=your_wallet_private_key_here
VIRTUAL_CARD_CONTRACT_ADDRESS=0x...your_contract_address

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
ALLOWED_ORIGINS=http://localhost:5173,https://your-bolt-app.netlify.app

# Optional: IPFS for media storage
IPFS_PROJECT_ID=your_infura_ipfs_project_id
IPFS_PROJECT_SECRET=your_infura_ipfs_secret
`;

  fs.writeFileSync('.env', envTemplate);
  console.log('✅ Created .env template file');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Create basic route files
const routeFiles = [
  {
    name: 'routes/cards.js',
    content: `const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  authenticateMerchant, 
  validationSchemas, 
  handleValidationErrors,
  rateLimits 
} = require('../middleware');

// GET /api/cards/:cardId - Get card status
router.get('/:cardId', authenticateToken, async (req, res) => {
  // Implementation moved to main server.js for now
  res.status(501).json({ error: 'Not implemented in routes yet' });
});

// POST /api/cards/create - Create new virtual card
router.post('/create', 
  rateLimits.cardCreation,
  authenticateToken,
  validationSchemas.createCard,
  handleValidationErrors,
  async (req, res) => {
    // Implementation moved to main server.js for now
    res.status(501).json({ error: 'Not implemented in routes yet' });
  }
);

module.exports = router;`
  },
  {
    name: 'routes/merchants.js',
    content: `const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  authenticateMerchant, 
  validationSchemas, 
  handleValidationErrors 
} = require('../middleware');

// GET /api/merchants/profile - Get merchant profile
router.get('/profile', authenticateToken, authenticateMerchant, async (req, res) => {
  res.json({ merchant: req.merchant });
});

module.exports = router;`
  }
];

routeFiles.forEach(({ name, content }) => {
  if (!fs.existsSync(name)) {
    fs.writeFileSync(name, content);
    console.log(`📄 Created route file: ${name}`);
  }
});

// Create test files
const testContent = `const request = require('supertest');
const app = require('../server');

describe('Health Check', () => {
  test('GET /health should return OK', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });
});

describe('Virtual Cards API', () => {
  test('POST /api/cards/create should require authentication', async () => {
    const response = await request(app)
      .post('/api/cards/create')
      .send({
        userId: '123',
        amount: 10.00,
        merchantId: '456'
      })
      .expect(401);
    
    expect(response.body.error).toBe('Access token required');
  });
});`;

if (!fs.existsSync('tests/app.test.js')) {
  fs.writeFileSync('tests/app.test.js', testContent);
  console.log('📄 Created test file: tests/app.test.js');
}

// Create README for setup
const readmeContent = `# Samoa Virtual Bankcard Backend

## Quick Start

1. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your actual values
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Supabase Database**
   - Create a new Supabase project
   - Run the SQL schema from \`schema.sql\`
   - Update \`.env\` with your Supabase credentials

4. **Configure Stripe**
   - Get your Stripe test keys
   - Set up webhook endpoint: \`your-domain/api/webhooks/stripe\`
   - Update \`.env\` with Stripe credentials

5. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Bolt Integration

When deploying to Bolt, make sure to:
1. Add all environment variables manually in Bolt's UI
2. Use the exact same variable names as in \`.env\`
3. Ensure Node.js version is 18+

## API Endpoints

- \`GET /health\` - Health check
- \`POST /api/cards/create\` - Create virtual card
- \`GET /api/cards/:cardId\` - Get card status
- \`POST /api/cards/:cardId/redeem\` - Redeem card
- \`POST /api/cards/:cardId/refund\` - Refund card
- \`POST /api/webhooks/stripe\` - Stripe webhooks

## Testing

\`\`\`bash
npm test
\`\`\`

## Project Structure

\`\`\`
├── server.js              # Main server file
├── config/
│   └── stripe.js          # Stripe configuration
├── middleware/
│   └── index.js           # Authentication & validation
├── routes/
│   ├── cards.js           # Card routes
│   └── merchants.js       # Merchant routes
├── scripts/
│   └── setup.js           # Setup script
└── tests/
    └── app.test.js        # Test files
\`\`\`
`;

if (!fs.existsSync('README.md')) {
  fs.writeFileSync('README.md', readmeContent);
  console.log('📄 Created README.md');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Edit .env file with your actual API keys');
console.log('2. Set up your Supabase database using schema.sql');
console.log('3. Configure your Stripe webhooks');
console.log('4. Run: npm run dev');
console.log('\n💡 For Bolt integration:');
console.log('- Add all .env variables manually in Bolt\'s environment UI');
console.log('- Ensure variable names match exactly');
console.log('- Use Node.js 18+');

console.log('\n🔗 Useful commands:');
console.log('- npm run dev          # Start development server');
console.log('- npm test             # Run tests');
console.log('- npm run lint         # Check code style');
console.log('- npm run webhook:test # Test Stripe webhooks locally');
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Setup path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '../');
const envPath = resolve(rootPath, '.env');

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Bucket configurations
const buckets = [
  {
    id: 'kyc-documents',
    name: 'KYC Documents',
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'image/heic']
  },
  {
    id: 'profile-images',
    name: 'Profile Images',
    public: true,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'emergency-documents',
    name: 'Emergency Documents',
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']
  }
];

// Create buckets
async function createBuckets() {
  console.log('🚀 Creating Supabase storage buckets...');
  
  try {
    // Get existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }
    
    console.log(`Found ${existingBuckets.length} existing buckets`);
    
    // Create each bucket if it doesn't exist
    for (const bucket of buckets) {
      const bucketExists = existingBuckets.some(b => b.id === bucket.id);
      
      if (bucketExists) {
        console.log(`✅ Bucket '${bucket.id}' already exists`);
        continue;
      }
      
      console.log(`Creating bucket '${bucket.id}'...`);
      
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });
      
      if (error) {
        console.error(`Error creating bucket '${bucket.id}':`, error);
      } else {
        console.log(`✅ Created bucket '${bucket.id}'`);
      }
    }
    
    console.log('✅ Storage bucket setup complete!');
    return true;
  } catch (error) {
    console.error('Error creating buckets:', error);
    return false;
  }
}

// Create RLS policies for buckets
async function createRlsPolicies() {
  console.log('\n🔒 Setting up Row Level Security policies...');
  console.log('Note: This step is skipped as RLS policies should be created via migrations');
  console.log('The Storage API will use the service role key to bypass RLS');
  
  return true;
}

// Main function
async function main() {
  console.log('🔧 Setting up Supabase storage buckets...');
  
  const bucketsCreated = await createBuckets();
  if (!bucketsCreated) {
    console.error('❌ Failed to create storage buckets');
    process.exit(1);
  }
  
  const policiesCreated = await createRlsPolicies();
  if (!policiesCreated) {
    console.warn('⚠️ Failed to create RLS policies');
    // Continue anyway as we're using service role key
  }
  
  console.log('\n🎉 Supabase storage setup complete!');
  console.log('You can now upload files to the following buckets:');
  buckets.forEach(bucket => {
    console.log(`- ${bucket.id} (${bucket.public ? 'public' : 'private'})`);
  });
}

// Run the main function
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
});
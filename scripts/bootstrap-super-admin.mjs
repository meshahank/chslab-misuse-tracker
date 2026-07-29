#!/usr/bin/env node

/**
 * Bootstrap script to create or promote the first super admin
 * 
 * Usage:
 *   node scripts/bootstrap-super-admin.mjs <email> [--promote]
 * 
 * Examples:
 *   node scripts/bootstrap-super-admin.mjs admin@example.com
 *   node scripts/bootstrap-super-admin.mjs john@example.com --promote
 */

import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const shouldPromote = process.argv.includes('--promote');

if (!email) {
  console.error('Error: Email address is required');
  console.error('Usage: node scripts/bootstrap-super-admin.mjs <email> [--promote]');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bootstrapSuperAdmin() {
  try {
    // 1. Find user by email
    console.log(`\nSearching for user with email: ${email}`);
    
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`Error: No user found with email ${email}`);
      console.error('\nAvailable users:');
      users.forEach(u => console.error(`  - ${u.email} (ID: ${u.id})`));
      process.exit(1);
    }
    
    console.log(`✓ Found user: ${user.email} (ID: ${user.id})`);
    
    // 2. Check if profile exists
    const { data: existingProfile, error: readError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (readError && readError.code !== 'PGRST116') {
      throw new Error(`Failed to read profile: ${readError.message}`);
    }
    
    if (existingProfile) {
      console.log(`✓ Profile exists with role: ${existingProfile.role}`);
      
      if (shouldPromote || existingProfile.role !== 'super_admin') {
        // Update to super_admin
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'super_admin', status: 'active' })
          .eq('id', user.id);
        
        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }
        
        console.log('✓ Updated profile role to super_admin with status active');
      } else {
        console.log('✓ User is already a super_admin');
      }
    } else {
      // Create profile as super_admin
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email.split('@')[0],
          full_name: user.user_metadata?.full_name || 'Admin',
          role: 'super_admin',
          status: 'active',
        });
      
      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }
      
      console.log('✓ Created new profile with role super_admin and status active');
    }
    
    console.log(`\n✓ Bootstrap complete!`);
    console.log(`\nYou can now log in as ${email} and access the admin panel at /admins`);
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

bootstrapSuperAdmin();

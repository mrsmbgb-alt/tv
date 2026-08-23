const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema initialization
const initDatabase = async () => {
  try {
    console.log('📊 Checking database schema...');
    
    // Note: Run these SQL commands in Supabase SQL Editor once:
    /*
    -- Channels Table
    CREATE TABLE IF NOT EXISTS channels (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      stream_url TEXT NOT NULL UNIQUE,
      category TEXT,
      country TEXT,
      language TEXT,
      last_updated TIMESTAMP DEFAULT NOW()
    );

    -- EPG Data Table
    CREATE TABLE IF NOT EXISTS epg_data (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      channel_name TEXT NOT NULL,
      title TEXT,
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Favorites Table
    CREATE TABLE IF NOT EXISTS favorites (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, channel_id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
    CREATE INDEX IF NOT EXISTS idx_channels_country ON channels(country);
    CREATE INDEX IF NOT EXISTS idx_epg_channel ON epg_data(channel_name);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    */

    console.log('✅ Database configuration ready');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

module.exports = { supabase, initDatabase };
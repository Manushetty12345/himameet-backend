const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

// If it's an internal Render URL (doesn't have .render.com), do not use SSL
// If it's an external URL, use SSL
const isInternal = connectionString && !connectionString.includes('.render.com');
const useSSL = isInternal ? false : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: connectionString,
  ssl: useSSL
});

pool.connect()
  .then(async (client) => {
    console.log('✅ Connected to PostgreSQL database');
    console.log('DEBUG DATABASE_URL is defined:', !!process.env.DATABASE_URL);
    console.log('DEBUG SSL option used:', (connectionString && connectionString.includes('.render.com')) ? 'rejectUnauthorized: false' : 'false');
    
    try {
      // Auto-initialize schema if it doesn't exist
      const res = await client.query("SELECT to_regclass('public.users');");
      if (!res.rows[0].to_regclass) {
        console.log('⚠️ Users table not found. Running database initialization script...');
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, 'hima_schema_pg.sql'), 'utf8');
        await client.query(sql);
        console.log('✅ Database schema initialized successfully!');
      } else {
        console.log('✅ Database schema is already initialized.');
      }
    } catch (err) {
      console.error('❌ Error checking/initializing schema:', err.message);
    }

    // ── Seed avatars if table is empty ────────────────────────────────────────
    try {
      const { rows: avatarRows } = await client.query('SELECT COUNT(*) FROM avatars');
      if (parseInt(avatarRows[0].count) === 0) {
        const baseUrl = (process.env.APP_BASE_URL || 'https://himameet-backend.onrender.com').replace(/\/$/, '');
        const avatarSeeds = [
          // Male avatars
          { url: `${baseUrl}/public/avatars/male_1.png`,   gender: 'male',   order: 1 },
          { url: `${baseUrl}/public/avatars/male_2.png`,   gender: 'male',   order: 2 },
          { url: `${baseUrl}/public/avatars/male_3.png`,   gender: 'male',   order: 3 },
          { url: `${baseUrl}/public/avatars/male_4.png`,   gender: 'male',   order: 4 },
          { url: `${baseUrl}/public/avatars/male_5.png`,   gender: 'male',   order: 5 },
          // Female avatars
          { url: `${baseUrl}/public/avatars/female_1.png`, gender: 'female', order: 1 },
          { url: `${baseUrl}/public/avatars/female_2.png`, gender: 'female', order: 2 },
          { url: `${baseUrl}/public/avatars/female_3.png`, gender: 'female', order: 3 },
          { url: `${baseUrl}/public/avatars/female_4.png`, gender: 'female', order: 4 },
          { url: `${baseUrl}/public/avatars/female_5.png`, gender: 'female', order: 5 },
        ];
        for (const av of avatarSeeds) {
          await client.query(
            `INSERT INTO avatars (avatar_url, gender, is_active, display_order) VALUES ($1, $2, true, $3)`,
            [av.url, av.gender, av.order]
          );
        }
        console.log('✅ Seed: inserted 10 avatars (5 male + 5 female)');
      } else {
        // Fix avatar URLs that may have been inserted without /public prefix
        const baseUrl = (process.env.APP_BASE_URL || 'https://himameet-backend.onrender.com').replace(/\/$/, '');
        await client.query(`
          UPDATE avatars 
          SET avatar_url = REPLACE(avatar_url, $1 || '/avatars/', $1 || '/public/avatars/')
          WHERE avatar_url LIKE $1 || '/avatars/%'
        `, [baseUrl]);
        console.log('✅ Seed: avatars already exist, ensuring URLs are correct.');
      }
    } catch (e) {
      console.error('❌ Error seeding avatars:', e.message);
    }

    // ── Seed languages if table is empty ──────────────────────────────────────
    try {
      const { rows: langRows } = await client.query('SELECT COUNT(*) FROM languages');
      if (parseInt(langRows[0].count) === 0) {
        const languageSeeds = [
          { en: 'Hindi',     native: 'हिन्दी',    code: 'hi', order: 1 },
          { en: 'English',   native: 'English',    code: 'en', order: 2 },
          { en: 'Telugu',    native: 'తెలుగు',    code: 'te', order: 3 },
          { en: 'Tamil',     native: 'தமிழ்',     code: 'ta', order: 4 },
          { en: 'Kannada',   native: 'ಕನ್ನಡ',     code: 'kn', order: 5 },
          { en: 'Malayalam', native: 'മലയാളം',    code: 'ml', order: 6 },
          { en: 'Marathi',   native: 'मराठी',     code: 'mr', order: 7 },
          { en: 'Bengali',   native: 'বাংলা',     code: 'bn', order: 8 },
          { en: 'Gujarati',  native: 'ગુજરાતી',   code: 'gu', order: 9 },
          { en: 'Punjabi',   native: 'ਪੰਜਾਬੀ',    code: 'pa', order: 10 },
          { en: 'Odia',      native: 'ଓଡ଼ିଆ',     code: 'or', order: 11 },
          { en: 'Assamese',  native: 'অসমীয়া',   code: 'as', order: 12 },
        ];
        for (const lang of languageSeeds) {
          await client.query(
            `INSERT INTO languages (name_english, name_native, language_code, is_active, display_order) VALUES ($1, $2, $3, true, $4)`,
            [lang.en, lang.native, lang.code, lang.order]
          );
        }
        console.log('✅ Seed: inserted 12 languages');
      } else {
        // Remove any unwanted languages that may have been inserted before
        await client.query(`DELETE FROM languages WHERE language_code IN ('ur', 'mai', 'bho')`);
        console.log('✅ Seed: languages already exist, removed unwanted ones if any.');
      }
    } catch (e) {
      console.error('❌ Error seeding languages:', e.message);
    }

    // ── Seed tags / interests ─────────────────────────────────────────────────
    try {
      await client.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0');
      await client.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
      await client.query("ALTER TABLE tags ADD COLUMN IF NOT EXISTS tag_type VARCHAR(20) DEFAULT 'interest'");

      const interestSeeds = [
        { name: 'Music',        order: 1 },
        { name: 'Movies',       order: 2 },
        { name: 'Foodie',       order: 3 },
        { name: 'Travel',       order: 4 },
        { name: 'Love',         order: 5 },
        { name: 'Politics',     order: 6 },
        { name: 'Art',          order: 7 },
        { name: 'Sports',       order: 8 },
        { name: 'Photography',  order: 9 },
        { name: 'Cooking',      order: 10 },
      ];

      for (const item of interestSeeds) {
        await client.query(
          `INSERT INTO tags (name, tag_type, is_active, display_order)
           VALUES ($1, 'interest', true, $2)
           ON CONFLICT (name) DO UPDATE SET tag_type = 'interest', is_active = true, display_order = $2`,
          [item.name, item.order]
        );
      }
      console.log('✅ Seed: ensured 10 interests in tags table');
    } catch (e) {
      console.error('❌ Error seeding tags/interests:', e.message);
    }


    
    try {
      // Creator settings columns for Home feed & status
      await client.query('ALTER TABLE creator_settings ADD COLUMN IF NOT EXISTS is_voice_online BOOLEAN DEFAULT false');
      await client.query('ALTER TABLE creator_settings ADD COLUMN IF NOT EXISTS is_video_online BOOLEAN DEFAULT false');
      await client.query('ALTER TABLE creator_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
      console.log('✅ Migration: ensured creator_settings columns exist');

      await client.query('ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS receiver_deleted BOOLEAN DEFAULT false');

        await client.query(`
          CREATE TABLE IF NOT EXISTS pinned_chats (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, friend_id)
          );
        `);
        console.log('? Migration: ensured pinned_chats table exists');
  
      console.log('✅ Migration: ensured receiver_deleted column exists');

      // Admin & profile columns
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS dnd_until TIMESTAMP WITH TIME ZONE');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_password VARCHAR(100)');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT');
      await client.query('ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS voice_sample_url TEXT');
      await client.query('ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS ai_gender_score NUMERIC(5,2)');
      console.log('✅ Migration: ensured admin and profile columns exist');
      
      await client.query('ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100), ADD COLUMN IF NOT EXISTS pan_number VARCHAR(50), ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100), ADD COLUMN IF NOT EXISTS passbook_photo_url TEXT, ADD COLUMN IF NOT EXISTS pan_photo_url TEXT, ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)');
      console.log('✅ Migration: ensured extended bank_accounts columns exist');

      await client.query(`
        CREATE TABLE IF NOT EXISTS withdrawal_requests (
          id                      BIGSERIAL PRIMARY KEY,
          user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount_inr              NUMERIC(10,2) NOT NULL,
          status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
          admin_notes             TEXT,
          requested_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at            TIMESTAMP
        )
      `);
      await client.query('ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS coins_deducted BIGINT DEFAULT 0');
      await client.query('ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS conversion_rate_used NUMERIC(10,4) DEFAULT 0');
      console.log('✅ Migration: ensured withdrawal_requests table and columns exist');
      
      // Temporary fix: update existing 8/15 rates to 10/20
      try {
        await client.query(`
          UPDATE creator_settings 
          SET voice_rate_per_min = 10, video_rate_per_min = 20 
          WHERE voice_rate_per_min = 8 OR video_rate_per_min = 15
        `);
      } catch (e) {
        // ignore if table doesn't exist yet
      }
    } catch (e) {
      console.error('Error running migration:', e);
    } finally {
      client.release();
    }
  })
  .catch(err => {
    console.error('❌ PostgreSQL Connection Error:', err.message);
    console.error('DEBUG DATABASE_URL is defined:', !!process.env.DATABASE_URL);
    console.error('DEBUG Connection String:', connectionString ? connectionString.replace(/:[^:@]+@/, ':***@') : 'undefined');
  });

// Helper to mimic mysql2's [rows] = await pool.query() pattern
const originalQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
  const result = await originalQuery(text, params);
  return [result.rows, result.fields];
};

// Helper for transactions (getConnection equivalent)
pool.getConnection = async () => {
  const client = await pool.connect();
  
  client.beginTransaction = () => client.query('BEGIN');
  client.commit = () => client.query('COMMIT');
  client.rollback = () => client.query('ROLLBACK');
  client.release = client.release.bind(client);

  // Wrap client.query to return [rows] format
  const originalClientQuery = client.query.bind(client);
  client.query = async (text, params) => {
    const result = await originalClientQuery(text, params);
    return [result.rows, result.fields];
  };

  return client;
};

module.exports = pool;

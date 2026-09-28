/**
 * VYAVSAYMITRA — Supabase PostgreSQL Production Client Configuration
 * 
 * Secure initialization of Supabase client using environment variables.
 * Expected environment variables:
 * - SUPABASE_URL: Project URL (e.g. https://your-project.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for trusted server-side execution
 * 
 * SECURITY:
 * - NEVER log or print the service-role key.
 * - NEVER expose service-role key to frontend or client payloads.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

/**
 * Checks if valid Supabase configuration is present in environment variables.
 * @returns {boolean}
 */
function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    typeof SUPABASE_URL === 'string' &&
    SUPABASE_URL.startsWith('http') &&
    SUPABASE_SERVICE_ROLE_KEY &&
    typeof SUPABASE_SERVICE_ROLE_KEY === 'string' &&
    SUPABASE_SERVICE_ROLE_KEY.length > 10
  );
}

let supabase = null;

if (isSupabaseConfigured()) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  } catch (err) {
    console.warn('[DATABASE] Failed to initialize Supabase client:', err.message);
    supabase = null;
  }
}

/**
 * Returns the initialized Supabase client, or throws if not configured.
 */
function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase configuration missing');
  }
  return supabase;
}

/**
 * Performs a lightweight connectivity check against Supabase PostgreSQL.
 * Does NOT run migrations or drop/create tables.
 * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
 */
async function testSupabaseConnection() {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase configuration missing' };
  }

  try {
    const startTime = Date.now();
    // Lightweight count query on existing profiles table
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, latencyMs: Date.now() - startTime };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  getSupabaseClient,
  testSupabaseConnection,
  SUPABASE_URL
};

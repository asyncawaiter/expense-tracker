import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Get current config status for debugging
export const getSupabaseConfigStatus = () => {
  return {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '(not set)',
  };
};

// Test the actual connection to Supabase
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    configured: boolean;
    url: string;
    tablesFound?: string[];
    error?: string;
  };
}

export const testSupabaseConnection = async (): Promise<ConnectionTestResult> => {
  // First check if configured
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase is not configured',
      details: {
        configured: false,
        url: '(not set)',
        error: 'Missing environment variables: ' + 
          (!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : '') +
          (!supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : '')
      }
    };
  }

  try {
    // Try to query the categories table (should exist if schema is set up)
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (error) {
      // Check for common errors
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Connected to Supabase, but tables are not set up',
          details: {
            configured: true,
            url: supabaseUrl,
            error: 'Database tables not found. Please run the schema migration (supabase-schema.sql).'
          }
        };
      }
      
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        return {
          success: false,
          message: 'Authentication error',
          details: {
            configured: true,
            url: supabaseUrl,
            error: 'Invalid or expired API key. Check your NEXT_PUBLIC_SUPABASE_ANON_KEY.'
          }
        };
      }

      return {
        success: false,
        message: 'Connection failed',
        details: {
          configured: true,
          url: supabaseUrl,
          error: error.message
        }
      };
    }

    // Success! Also check other required tables
    const tables = ['transactions', 'income', 'budget_goals', 'smart_suggestions'];
    const missingTables: string[] = [];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (tableError && tableError.message.includes('does not exist')) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: false,
        message: 'Connected but missing some tables',
        details: {
          configured: true,
          url: supabaseUrl,
          error: `Missing tables: ${missingTables.join(', ')}. Run the schema migration.`
        }
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase!',
      details: {
        configured: true,
        url: supabaseUrl,
        tablesFound: ['categories', ...tables]
      }
    };

  } catch (err: any) {
    return {
      success: false,
      message: 'Connection error',
      details: {
        configured: true,
        url: supabaseUrl,
        error: err.message || 'Unknown error occurred'
      }
    };
  }
};

// Create client only if configured, otherwise create a dummy client that will fail gracefully
let supabase: SupabaseClient;

if (isSupabaseConfigured()) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a mock client that throws helpful errors
  supabase = {
    from: () => ({
      select: () => Promise.reject(new Error('Supabase not configured')),
      insert: () => Promise.reject(new Error('Supabase not configured')),
      update: () => Promise.reject(new Error('Supabase not configured')),
      delete: () => Promise.reject(new Error('Supabase not configured')),
      upsert: () => Promise.reject(new Error('Supabase not configured')),
    }),
  } as unknown as SupabaseClient;
}

export { supabase };

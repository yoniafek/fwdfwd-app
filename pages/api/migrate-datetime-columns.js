import { createClient } from '@supabase/supabase-js';

// Use service role key for migration (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting datetime column migration...');

    // Run the migration to change columns from timestamptz to text
    // This preserves the full ISO string with timezone offset
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE travel_steps 
          ALTER COLUMN start_datetime TYPE TEXT,
          ALTER COLUMN end_datetime TYPE TEXT;
      `
    });

    if (migrationError) {
      // If the RPC doesn't exist, try a workaround
      console.log('RPC method not available, checking current state...');
      
      // Check if columns are already TEXT by querying
      const { data: sample, error: sampleError } = await supabase
        .from('travel_steps')
        .select('start_datetime, end_datetime')
        .limit(1);
      
      if (sampleError) {
        return res.status(500).json({ 
          error: 'Failed to query table', 
          details: sampleError.message 
        });
      }

      // If we got data, the columns exist - we need to run migration manually
      return res.status(200).json({ 
        success: false,
        message: 'Migration requires manual execution in Supabase dashboard',
        instructions: [
          '1. Go to Supabase Dashboard > SQL Editor',
          '2. Run this SQL:',
          'ALTER TABLE travel_steps ALTER COLUMN start_datetime TYPE TEXT;',
          'ALTER TABLE travel_steps ALTER COLUMN end_datetime TYPE TEXT;'
        ],
        sample: sample
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Migration failed', details: error.message });
  }
}


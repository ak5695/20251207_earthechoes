
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFollows() {
  console.log('Checking follows table...');
  
  try {
    const { count, data, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .limit(5);
      
    if (error) {
      console.error('Error checking follows:', error);
    } else {
      console.log(`Follows count: ${count}`);
      console.log('Sample data:', data);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkFollows();

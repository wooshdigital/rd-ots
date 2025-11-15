import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing Supabase configuration');
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

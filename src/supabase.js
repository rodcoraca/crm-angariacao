import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vtymfigjtczgeyavdujl.supabase.co'
const supabaseKey = 'sb_publishable_Padg7Bs8OhyGxH0J_JW7sg_R4h5nkLo'

export const supabase = createClient(supabaseUrl, supabaseKey)

const { data } = await supabase
  .from('leads')
  .select('*')
  .order('created_at', { ascending: false });


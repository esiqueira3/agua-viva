import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kfalhtebjoilpnncpkbd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODA5MTAsImV4cCI6MjA5MDQ1NjkxMH0.E_PGiwbr742t6xOFYmrUUrkpSpEkxu777aD661-yv_g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('query_api', { sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'departamentos' AND column_name = 'id';" })
  // If no RPC, try direct select if possible (some instances allow it)
  // Actually I'll just check a record's ID format
  const { data: dept } = await supabase.from('departamentos').select('id').limit(1).single()
  console.log("Dept ID:", dept?.id, "Type of ID:", typeof dept?.id)
  
  const { data: userCols } = await supabase.from('usuarios_sistema').select('*').limit(1)
  console.log("Sample user data:", userCols[0])
}

check()

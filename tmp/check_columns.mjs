import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kfalhtebjoilpnncpkbd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODA5MTAsImV4cCI6MjA5MDQ1NjkxMH0.E_PGiwbr742t6xOFYmrUUrkpSpEkxu777aD661-yv_g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: cols1 } = await supabase.rpc('get_table_columns', { table_name: 'usuarios_sistema' })
  // If RPC is missing, use information_schema
  const { data: cols } = await supabase.from('usuarios_sistema').select('*').limit(1)
  console.log("Usuarios columns:", Object.keys(cols[0] || {}))
  
  const { data: depts } = await supabase.from('departamentos').select('*').limit(1)
  console.log("Departamentos columns:", Object.keys(depts[0] || {}))
}

check()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kfalhtebjoilpnncpkbd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODA5MTAsImV4cCI6MjA5MDQ1NjkxMH0.E_PGiwbr742t6xOFYmrUUrkpSpEkxu777aD661-yv_g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("--- PERFIL DO USUÁRIO ---")
  const { data: user } = await supabase.from('usuarios_sistema').select('*').eq('email', 'siqueira.estevao@gmail.com').maybeSingle()
  console.log(JSON.stringify(user, null, 2))

  console.log("\n--- PERMISSÕES DO PERFIL ADMINISTRADOR ---")
  const { data: perm } = await supabase.from('permissoes_sistema').select('*').eq('perfil', 'Administrador').maybeSingle()
  console.log(JSON.stringify(perm, null, 2))
}

check()

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // I need the service role key to update users

async function fixAdmin() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log("Checking user...")
  const { data: user, error: userError } = await supabase
    .from('usuarios_sistema')
    .select('*')
    .eq('email', 'siqueira.estevao@gmail.com')
    .maybeSingle()

  if (userError) {
    console.error("Error fetching user:", userError)
    return
  }

  console.log("Current user in DB:", user)

  console.log("Ensuring Administrador profile has full access...")
  const { error: permError } = await supabase
    .from('permissoes_sistema')
    .upsert({ 
        perfil: 'Administrador', 
        config: { all: true } 
    })

  if (permError) {
    console.error("Error updating permissions:", permError)
  } else {
    console.log("Permissions updated for Administrador.")
  }

  if (user && user.perfil !== 'Administrador') {
    console.log("Updating user profile to Administrador...")
    const { error: updateError } = await supabase
        .from('usuarios_sistema')
        .update({ perfil: 'Administrador' })
        .eq('email', 'siqueira.estevao@gmail.com')
    
    if (updateError) {
        console.error("Error updating user profile:", updateError)
    } else {
        console.log("User profile updated to Administrador in DB.")
    }
  }

  console.log("Note: The user may need to logout and login again if the Auth metadata is stale.")
}

fixAdmin()

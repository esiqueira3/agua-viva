import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://kfalhtebjoilpnncpkbd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg4MDkxMCwiZXhwIjoyMDkwNDU2OTEwfQ.LnjF5XtTK1VkL6OIFwvUO_jdXfIwgibXTK1zLVkvev0');

async function debug() {
    const { data: membro } = await supabase.from('membros').select('nome_completo, departamento_id').ilike('nome_completo', '%ESDRAS%');
    console.log('Membro encontrado:', membro);
    
    const { data: depts } = await supabase.from('departamentos').select('id, nome');
    console.log('Lista de Departamentos:', depts);
}
debug();

import { createClient } from '@supabase/supabase-js';

const s = createClient('https://kfalhtebjoilpnncpkbd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODA5MTAsImV4cCI6MjA5MDQ1NjkxMH0.E_PGiwbr742t6xOFYmrUUrkpSpEkxu777aD661-yv_g');

async function run() {
    const { data, error } = await s
        .from('departamentos')
        .select(`
            id, nome, 
            membros!lider_principal_id(nome_completo)
        `);
    console.log('Resultado do Join:', data);
    console.log('Erro do Join:', error);
}
run();

import { createClient } from '@supabase/supabase-js';

const s = createClient('https://kfalhtebjoilpnncpkbd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODA5MTAsImV4cCI6MjA5MDQ1NjkxMH0.E_PGiwbr742t6xOFYmrUUrkpSpEkxu777aD661-yv_g');

async function run() {
    const { data, error } = await s.from('departamentos').select('*');
    console.log('Dados com AnonKey:', data);
    console.log('Erro retornado:', error);
}
run();

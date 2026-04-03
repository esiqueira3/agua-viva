import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const s = createClient('https://kfalhtebjoilpnncpkbd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg4MDkxMCwiZXhwIjoyMDkwNDU2OTEwfQ.LnjF5XtTK1VkL6OIFwvUO_jdXfIwgibXTK1zLVkvev0');

async function run() {
    try {
        const { data: m } = await s.from('membros').select('nome_completo, departamento_id, status').ilike('nome_completo', '%ESDRAS%');
        const { data: d } = await s.from('departamentos').select('id, nome');
        fs.writeFileSync('debug_data.json', JSON.stringify({ membros: m, depts: d }, null, 2));
        console.log('Dados salvos em debug_data.json com sucesso!');
    } catch (e) {
        console.error('Erro ao gerar debug:', e);
    }
}
run();

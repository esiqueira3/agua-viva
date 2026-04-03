import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://kfalhtebjoilpnncpkbd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWxodGViam9pbHBubmNwa2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg4MDkxMCwiZXhwIjoyMDkwNDU2OTEwfQ.LnjF5XtTK1VkL6OIFwvUO_jdXfIwgibXTK1zLVkvev0');

async function check() {
    const { data } = await supabase.from('departamentos').select('nome');
    console.log('Departamentos atuais:', data);
}
check();

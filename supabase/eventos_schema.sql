-- Tabela de Igrejas e Filiais
CREATE TABLE public.igrejas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  is_filial BOOLEAN DEFAULT false,
  matriz_id UUID REFERENCES public.igrejas(id), -- Auto-relacionamento estrutural
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Locais de Realização dos Eventos
CREATE TABLE public.locais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE,
  descricao TEXT NOT NULL,
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela Estrela: O Hub Central de Agendamentos e Calendário
CREATE TABLE public.eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_evento DATE NOT NULL,
  hora_evento TIME NOT NULL,
  local_id UUID REFERENCES public.locais(id),
  status TEXT DEFAULT 'Agendado', -- 🔵 Agendado, 🟢 Confirmado, 🔴 Cancelado, ✅ Concluído
  
  -- Aba Organização Ligada Hierarquicamente
  departamento_id UUID REFERENCES public.departamentos(id),
  lider_responsavel_id UUID REFERENCES public.membros(id),
  equipe_envolvida JSONB DEFAULT '[]'::jsonb, -- Array de UUIDs da nossa Múltipla Escolha
  
  -- Aba Participações 🎛
  limite_participantes BOOLEAN DEFAULT false,
  quantidade_maxima INTEGER,
  link_inscricao TEXT,
  confirmacao_presenca BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitando RLS para total disponibilidade interna
ALTER TABLE public.igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Igrejas select public" ON public.igrejas FOR SELECT USING (true);
CREATE POLICY "Igrejas insert public" ON public.igrejas FOR INSERT WITH CHECK (true);
CREATE POLICY "Igrejas update public" ON public.igrejas FOR UPDATE USING (true);
CREATE POLICY "Igrejas delete public" ON public.igrejas FOR DELETE USING (true);

CREATE POLICY "Locais select public" ON public.locais FOR SELECT USING (true);
CREATE POLICY "Locais insert public" ON public.locais FOR INSERT WITH CHECK (true);
CREATE POLICY "Locais update public" ON public.locais FOR UPDATE USING (true);
CREATE POLICY "Locais delete public" ON public.locais FOR DELETE USING (true);

CREATE POLICY "Eventos select public" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Eventos insert public" ON public.eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Eventos update public" ON public.eventos FOR UPDATE USING (true);
CREATE POLICY "Eventos delete public" ON public.eventos FOR DELETE USING (true);

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

-- Habilitando RLS
ALTER TABLE public.igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS SEGURAS: IGREJAS
CREATE POLICY "Leitura geral igrejas" ON public.igrejas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins gerem igrejas" ON public.igrejas FOR ALL TO authenticated USING (public.check_is_admin());

-- POLÍTICAS SEGURAS: LOCAIS
CREATE POLICY "Leitura geral locais" ON public.locais FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins gerem locais" ON public.locais FOR ALL TO authenticated USING (public.check_is_admin());

-- POLÍTICAS SEGURAS: EVENTOS
CREATE POLICY "Publico lê eventos" ON public.eventos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins e Lideres gerem eventos" ON public.eventos FOR ALL TO authenticated USING (true);

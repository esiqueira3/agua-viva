-- Tabela de Departamentos Básicos (sem FK estrita para evitar dependência circular inicial)
CREATE TABLE public.departamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  status BOOLEAN DEFAULT true, -- true = ativo, false = inativo
  lider_principal_id UUID,     -- será FK na hora de consultar
  vice_lider_id UUID,          -- será FK
  tipo_departamento TEXT NOT NULL, -- Ministério, Grupo, Célula, Administrativo
  publico_alvo TEXT NOT NULL,      -- Crianças, Jovens, Casais, Geral
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Membros com as 6 Abas do PRD
CREATE TABLE public.membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula TEXT UNIQUE NOT NULL, -- gerada via client (ex: IGR-000142)
  user_id UUID REFERENCES auth.users(id), -- se o membro tiver login no Supabase
  
  -- Aba 1: Dados Pessoais
  nome_completo TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  sexo TEXT NOT NULL,
  estado_civil TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  nacionalidade TEXT DEFAULT 'Brasileira',
  naturalidade TEXT,
  
  -- Aba 2: Contato
  telefone_principal TEXT NOT NULL,
  email TEXT,
  endereco_cep TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  
  -- Aba 3: Eclesiásticos
  data_conversao DATE,
  data_batismo DATE,
  local_batismo TEXT,
  tipo_membro TEXT NOT NULL, -- Membro, Congregado, Visitante
  igreja_origem TEXT,
  data_entrada DATE,
  departamento_id UUID REFERENCES public.departamentos(id), -- vínculo (Ministério primário)
  cargo_funcao TEXT,
  
  -- Aba 4: Familiar
  nome_conjuge TEXT,
  responsavel_menor TEXT,
  -- Filhos podem ser armazenados no futuro em uma tabela separada `membros_filhos(membro_id, nome, idade)`
  -- ou array jsonb
  filhos JSONB, 
  
  -- Aba 5: Admin
  observacoes_gerais TEXT,
  foto_url TEXT,
  status BOOLEAN DEFAULT true,

  -- Aba 6: Opcionais
  necessidades_especiais TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitando politicas (RLS) abertas por enquanto.
-- Quando o modulo Auth ficar robusto com roles, alteramos
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departamentos sao publicos para selects" ON public.departamentos FOR SELECT USING (true);
CREATE POLICY "Departamentos aceitam inserts de qualquer um (temporario)" ON public.departamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Departamentos alteracoes" ON public.departamentos FOR UPDATE USING (true);

CREATE POLICY "Membros sao publicos para selects" ON public.membros FOR SELECT USING (true);
CREATE POLICY "Membros aceitam inserts" ON public.membros FOR INSERT WITH CHECK (true);
CREATE POLICY "Membros aceitam alteracoes" ON public.membros FOR UPDATE USING (true);

-- Criar Storage Bucket para Fotos de Perfil
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true);
CREATE POLICY "Fotos sao publicas" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Qualquer usuario logado insere" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'authenticated');

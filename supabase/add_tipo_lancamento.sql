-- Adiciona a coluna de tipo para diferenciar lançamentos manuais
ALTER TABLE public.inscricoes ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Inscrição';

-- Comentário para documentação:
-- Valores possíveis: 'Inscrição', 'Cantina', 'Oferta', 'Dizimo'

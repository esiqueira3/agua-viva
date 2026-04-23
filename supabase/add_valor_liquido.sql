
-- Adiciona a coluna valor_liquido na tabela de inscricoes
-- Este valor representa o que realmente cai na conta após as taxas do Mercado Pago
ALTER TABLE public.inscricoes ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10,2);

-- Comentário para documentação
COMMENT ON COLUMN public.inscricoes.valor_liquido IS 'Valor líquido recebido após taxas (Mercado Pago)';

-- Atualizar registros existentes (opcional, assume líquido = pago para manuais ou onde não se sabe)
-- UPDATE public.inscricoes SET valor_liquido = valor_pago WHERE valor_liquido IS NULL;

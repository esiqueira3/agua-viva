-- SQL para adicionar os novos campos da aba Familiar
ALTER TABLE public.membros 
ADD COLUMN IF NOT EXISTS nome_pai TEXT,
ADD COLUMN IF NOT EXISTS nome_mae TEXT,
ADD COLUMN IF NOT EXISTS familiar_outro TEXT;

-- O campo 'filhos' já existe no schema original como JSONB, 
-- então não precisamos criá-lo, apenas garantir que está lá.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='membros' AND column_name='filhos') THEN
        ALTER TABLE public.membros ADD COLUMN filhos JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

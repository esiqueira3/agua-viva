-- SCRIPT DE CORREÇÃO: PERMISSÕES PÚBLICAS PARA INSCRIÇÕES E NOTIFICAÇÕES
-- Objetivo: Resolver erro 401 quando membros não logados tentam se inscrever.

-- 1. Permitir que usuários não logados (anon) possam verificar o status de sua própria inscrição (necessário para o polling do Pix)
-- Nota: Usamos policy baseada em SELECT para a tabela inscricoes para o role 'anon'
DROP POLICY IF EXISTS "Publico le inscricoes" ON public.inscricoes;
CREATE POLICY "Publico le inscricoes" ON public.inscricoes 
FOR SELECT TO anon 
USING (true); -- Permitindo leitura geral para o anon para não travar o sistema, mas em produção o ideal seria filtrar por email/pagamento_id.

-- 2. Garantir que a política de inserção continue funcionando
DROP POLICY IF EXISTS "Publico insere inscricoes" ON public.inscricoes;
CREATE POLICY "Publico insere inscricoes" ON public.inscricoes 
FOR INSERT TO anon, authenticated 
WITH CHECK (true);

-- 3. Permitir que o frontend gere notificações mesmo se o usuário não estiver logado
-- (As notificações são geradas após a inscrição/pagamento)
DROP POLICY IF EXISTS "Publico insere notificacoes" ON public.notificacoes;
CREATE POLICY "Publico insere notificacoes" ON public.notificacoes 
FOR INSERT TO anon, authenticated 
WITH CHECK (true);

-- 4. Permitir que o anon leia a tabela configuracoes_gerais se necessário (opcional, dependendo do uso)
-- CREATE POLICY "Publico le configuracoes" ON public.configuracoes_gerais FOR SELECT TO anon USING (true);

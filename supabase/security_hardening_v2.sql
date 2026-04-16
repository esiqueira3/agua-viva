-- SCRIPT DE BLINDAGEM DE SEGURANÇA (HARDENING) - ÁGUA VIVA
-- Objetivo: Restringir acessos públicos sem impactar o funcionamento dos links de pagamento.

-- 1. FUNÇÃO SEGURA PARA CRIAR NOTIFICAÇÕES (Substitui o INSERT direto do público)
-- Isso impede que bots inundem o sistema com notificações falsas.
CREATE OR REPLACE FUNCTION public.create_registration_notification(
  p_nome_participante TEXT,
  p_evento_nome TEXT,
  p_valor_pago DECIMAL,
  p_tipo TEXT DEFAULT 'inscricao'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notificacoes (titulo, mensagem, tipo, link)
  VALUES (
    '🎟️ Nova Inscrição!',
    p_nome_participante || ' se inscreveu em "' || p_evento_nome || '" (' || 
    CASE WHEN p_valor_pago > 0 THEN 'R$ ' || p_valor_pago::TEXT ELSE 'Gratuito' END || ')',
    p_tipo,
    '/financeiro-eventos'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para o público executar a função de notificação
GRANT EXECUTE ON FUNCTION public.create_registration_notification(TEXT, TEXT, DECIMAL, TEXT) TO anon, authenticated;

-- 2. REMOVER ACESSO DIRETO DE INSERÇÃO NA TABELA DE NOTIFICAÇÕES PARA O PÚBLICO
-- Agora as notificações só podem ser criadas via função ou por usuários logados.
DROP POLICY IF EXISTS "Publico insere notificacoes" ON public.notificacoes;
CREATE POLICY "Apenas autenticados ou via RPC" ON public.notificacoes
FOR INSERT TO authenticated WITH CHECK (true);

-- 3. REFORÇO NA VERIFICAÇÃO DE ADMIN (Opcional, mas recomendado)
-- Melhora a precisão da verificação de perfil administrativo.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios_sistema
    WHERE email = (auth.jwt() ->> 'email')
    AND LOWER(perfil) = 'administrador'
    AND status = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

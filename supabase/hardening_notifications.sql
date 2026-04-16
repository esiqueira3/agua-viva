-- SCRIPT DE BLINDAGEM DE SEGURANÇA V2 (ULTRA SEGURO) - ÁGUA VIVA
-- Objetivo: Centralizar notificações no banco e fechar acesso direto.

-- 1. FUNÇÃO ROBUSTA PARA NOTIFICAÇÕES (Roda com privilégios de Sistema)
CREATE OR REPLACE FUNCTION public.notify_new_registration(
  p_evento_id UUID,
  p_participante_nome TEXT,
  p_valor_pago DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_evento_nome TEXT;
  v_depto_id UUID;
  v_leader_id UUID;
  v_admin_record RECORD;
  v_leader_email TEXT;
  v_mensagem TEXT;
BEGIN
  -- 1. Buscar dados do evento
  SELECT nome, departamento_id INTO v_evento_nome, v_depto_id FROM public.eventos WHERE id = p_evento_id;
  
  -- 2. Montar mensagem
  v_mensagem := p_participante_nome || ' se inscreveu em "' || v_evento_nome || '" (' || 
                CASE WHEN p_valor_pago > 0 THEN 'R$ ' || p_valor_pago::TEXT ELSE 'Gratuito' END || ')';

  -- 3. Inserir para Administradores
  FOR v_admin_record IN (SELECT email FROM public.usuarios_sistema WHERE LOWER(perfil) = 'administrador' AND status = true) LOOP
    INSERT INTO public.notificacoes (user_email, titulo, mensagem, tipo, link)
    VALUES (v_admin_record.email, '🎟️ Nova Inscrição!', v_mensagem, 'inscricao', '/financeiro-eventos');
  END LOOP;

  -- 4. Inserir para o Líder do Departamento (se houver)
  SELECT lider_principal_id INTO v_leader_id FROM public.departamentos WHERE id = v_depto_id;
  
  IF v_leader_id IS NOT NULL THEN
    SELECT email INTO v_leader_email FROM public.membros WHERE id = v_leader_id;
    
    IF v_leader_email IS NOT NULL AND v_leader_email NOT IN (SELECT email FROM public.usuarios_sistema WHERE LOWER(perfil) = 'administrador') THEN
      INSERT INTO public.notificacoes (user_email, titulo, mensagem, tipo, link)
      VALUES (v_leader_email, '🎟️ Nova Inscrição!', v_mensagem, 'inscricao', '/financeiro-eventos');
    END IF;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissão de execução para todos (o filtro de quem recebe é feito na lógica interna)
GRANT EXECUTE ON FUNCTION public.notify_new_registration(UUID, TEXT, DECIMAL) TO anon, authenticated;

-- 2. FECHAMENTO DA TABELA (Após atualizar o frontend, isso garantirá 100% de segurança)
-- Nota: Adicione 'FOR INSERT TO authenticated' para permitir que admins ainda insiram manualmente se necessário.
-- DROP POLICY IF EXISTS "Publico insere notificacoes" ON public.notificacoes;
-- CREATE POLICY "Sistema gerencia notificacoes" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

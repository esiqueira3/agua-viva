-- SCRIPT DE CORREÇÃO DE RLS PARA LIDERANÇA
-- Objetivo: Permitir que perfis de "Liderança" visualizem inscrições e saques dos seus eventos/departamentos.

-- 1. DROP das políticas restritivas anteriores (opcional se for usar CREATE OR REPLACE, mas no Postgres/Supabase é melhor dropar e recriar)
DROP POLICY IF EXISTS "Admins full access inscricoes" ON public.inscricoes;
DROP POLICY IF EXISTS "Lideres leem inscricoes de seus eventos" ON public.inscricoes;

-- 2. NOVA POLÍTICA PARA INSCRIÇÕES (SELECT)
-- Admins continuam vendo tudo
-- Lideres veem apenas se o evento_id pertencer a ele ou ao departamento dele
CREATE POLICY "Admins e Lideres leem inscricoes" ON public.inscricoes
FOR SELECT TO authenticated
USING (
  public.check_is_admin() OR
  EXISTS (
    SELECT 1 FROM public.eventos e
    LEFT JOIN public.departamentos d ON e.departamento_id = d.id
    WHERE e.id = public.inscricoes.evento_id
    AND (
      -- É líder do evento diretamente
      e.lider_responsavel_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      OR 
      -- É líder do departamento do evento
      d.lider_principal_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      OR
      d.vice_lider_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
    )
  )
);

-- Mantém a política de inserção pública para QR Code/Links
DROP POLICY IF EXISTS "Publico insere inscricoes" ON public.inscricoes;
CREATE POLICY "Publico insere inscricoes" ON public.inscricoes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. POLÍTICA PARA SAQUES (SELECT)
DROP POLICY IF EXISTS "Admins full access saques" ON public.saques_eventos;
CREATE POLICY "Admins e Lideres leem saques" ON public.saques_eventos
FOR SELECT TO authenticated
USING (
  public.check_is_admin() OR
  EXISTS (
    SELECT 1 FROM public.eventos e
    LEFT JOIN public.departamentos d ON e.departamento_id = d.id
    WHERE e.id = public.saques_eventos.evento_id
    AND (
      e.lider_responsavel_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      OR 
      d.lider_principal_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      OR
      d.vice_lider_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
    )
  )
);

-- Permissões de escrita (INSERT/UPDATE/DELETE) continuam restritas a Admins (por padrão se não houver política permitindo)
-- Mas se quisermos que o líder também possa lançar manual ou registrar saque, precisamos de políticas de INSERT.
-- O FinanceiroEventos.jsx tem botões de "LANÇAR MANUAL" e "REGISTRAR SAQUE".
-- Se o líder puder fazer isso, adicionamos:

CREATE POLICY "Lideres inserem inscricoes de seus eventos" ON public.inscricoes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = public.inscricoes.evento_id
    AND (
      e.lider_responsavel_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      OR 
      e.departamento_id IN (
        SELECT d.id FROM public.departamentos d
        WHERE d.lider_principal_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
        OR d.vice_lider_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Lideres inserem saques de seus eventos" ON public.saques_eventos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = public.saques_eventos.evento_id
    AND (
      e.lider_responsavel_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      OR 
      e.departamento_id IN (
        SELECT d.id FROM public.departamentos d
        WHERE d.lider_principal_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
        OR d.vice_lider_id IN (SELECT id FROM public.membros WHERE user_id = auth.uid())
      )
    )
  )
);

-- Admin tem acesso total (esquecido no SELECT acima, mas garantido pelo check_is_admin no USING)
-- Adicionando políticas full para Admin para garantir que eles não percam acesso a nada
CREATE POLICY "Admins full access inscricoes" ON public.inscricoes FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins full access saques" ON public.saques_eventos FOR ALL TO authenticated USING (public.check_is_admin());

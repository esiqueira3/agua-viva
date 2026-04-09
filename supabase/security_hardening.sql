-- SCRIPT DE SEGURANÇA ÁGUA VIVA - HARDENING RLS COMPLETO
-- Este arquivo documenta as políticas aplicadas para resolver as vulnerabilidades de acesso público.

-----------------------------------------------------------
-- 1. FUNÇÃO DE VERIFICAÇÃO DE ADMINISTRADOR
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios_sistema
    WHERE email = (auth.jwt() ->> 'email')
    AND LOWER(perfil) = 'administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-----------------------------------------------------------
-- 2. HABILITAR RLS EM TODAS AS TABELAS
-----------------------------------------------------------
ALTER TABLE public.config_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_gerais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saques_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------
-- 3. POLÍTICAS DE ACESSO
-----------------------------------------------------------

-- CONFIG_GLOBAL (Critico: Contém Tokens Mercado Pago)
CREATE POLICY "Admins full access config_global" ON public.config_global FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Public read MP_PUBLIC_KEY" ON public.config_global FOR SELECT TO anon, authenticated USING (chave = 'MP_PUBLIC_KEY');

-- FINANCEIRO
CREATE POLICY "Admins full access financeiro_dept" ON public.financeiro_departamentos FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins full access pagamentos" ON public.pagamentos_eventos FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins full access saques" ON public.saques_eventos FOR ALL TO authenticated USING (public.check_is_admin());

-- USUARIOS E PERMISSOES
CREATE POLICY "Admins full access usuarios" ON public.usuarios_sistema FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Users read own profile" ON public.usuarios_sistema FOR SELECT TO authenticated USING (email = (auth.jwt() ->> 'email'));
CREATE POLICY "Admins full access permissoes" ON public.permissoes_sistema FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Autenticados leem permissoes" ON public.permissoes_sistema FOR SELECT TO authenticated USING (true);

-- MEMBROS E INSCRIÇÕES
CREATE POLICY "Admins full access membros" ON public.membros FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Publico insere membros" ON public.membros FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Autenticados leem membros" ON public.membros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access inscricoes" ON public.inscricoes FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Publico insere inscricoes" ON public.inscricoes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- EVENTOS E GERAL
CREATE POLICY "Public read eventos" ON public.eventos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read depto" ON public.departamentos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read igrejas" ON public.igrejas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read locais" ON public.locais FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read mural" ON public.mural_avisos FOR SELECT TO anon, authenticated USING (true);

-- ADMIN GERAL
CREATE POLICY "Admins gerem depto" ON public.departamentos FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins gerem igrejas_admin" ON public.igrejas FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins gerem locais_admin" ON public.locais FOR ALL TO authenticated USING (public.check_is_admin());

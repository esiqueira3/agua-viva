-- CORREÇÃO DO LOOP DE ACEITE DO TERMO
-- Permite que usuários autenticados marquem o aceite do termo sem precisar de permissões de administrador.

CREATE OR REPLACE FUNCTION public.registra_aceite_termo()
RETURNS VOID AS $$
BEGIN
  UPDATE public.usuarios_sistema
  SET 
    aceite_termo = true,
    data_aceite = now()
  WHERE email = auth.jwt() ->> 'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão de execução
GRANT EXECUTE ON FUNCTION public.registra_aceite_termo() TO authenticated;

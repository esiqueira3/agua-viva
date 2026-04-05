import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PermissionsContext = createContext()

export function PermissionsProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [membroId, setMembroId] = useState(null)
  const [meusDepartamentos, setMeusDepartamentos] = useState([])

  const [userProfile, setUserProfile] = useState('Liderança')
  const [userNome, setUserNome] = useState('')

  useEffect(() => {
    // 1. Escuta mudanças na sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadAllPermissions(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        loadAllPermissions(session.user)
      } else {
        setUser(null)
        setPermissions(null)
        setMembroId(null)
        setMeusDepartamentos([])
        setUserProfile('Liderança')
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadAllPermissions(currentUser) {
    setLoading(true)
    const email = currentUser.email?.toLowerCase().trim()
    
    try {
      // 1. Busca perfil do usuário na nossa tabela (Fonte da Verdade)
      const { data: userData } = await supabase
        .from('usuarios_sistema')
        .select('nome, perfil, departamentos_vinculados')
        .eq('email', email)
        .maybeSingle()

      // Prioriza a tabela usuarios_sistema, senão usa o metadata, senão fallback para Liderança
      const perfil = userData?.perfil || currentUser.user_metadata?.perfil || 'Liderança'
      setUserProfile(perfil)
      setUserNome(userData?.nome || currentUser.user_metadata?.nome || 'Usuário')
      
      const deptoVinc = userData?.departamentos_vinculados || []

      console.log(`Carregando perfil: ${perfil} para ${email}`)

      // 2. Busca o Mapa de Permissões para o Perfil (Busca Insensível a Maiúsculas/Minúsculas)
      const { data: permData } = await supabase
        .from('permissoes_sistema')
        .select('config')
        .ilike('perfil', perfil)
        .maybeSingle()

      if (permData) {
        setPermissions(permData.config)
      } else {
        // Fallback: se for Admin e não tiver config, dá acesso total
        if (perfil.toLowerCase() === 'administrador') {
           setPermissions({ all: true })
        } else {
           setPermissions({ menu_home: true })
        }
      }

      // 3. Busca a ficha de Membro (para saber QUEM o usuário é)
      const { data: membro } = await supabase
        .from('membros')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      let finalDeptoIds = [...deptoVinc]

      if (membro) {
        setMembroId(membro.id)

        // 4. Busca Departamentos onde é Líder ou Vice
        const { data: depts } = await supabase
          .from('departamentos')
          .select('id')
          .or(`lider_principal_id.eq.${membro.id},vice_lider_id.eq.${membro.id}`)
        
        if (depts) {
          const idsFromDepts = depts.map(d => d.id)
          // Union de IDs (sem duplicatas)
          finalDeptoIds = [...new Set([...finalDeptoIds, ...idsFromDepts])]
        }
      }
      
      setMeusDepartamentos(finalDeptoIds)

    } catch (err) {
      console.error("Erro ao carregar motor de acessos:", err)
    } finally {
      setLoading(false)
    }
  }

  // Função utilitária para checar permissão
  const canAccess = (resource) => {
    if (!permissions) return false
    if (permissions.all === true) return true
    return !!permissions[resource]
  }

  // Se for administrador master, tem passe livre em tudo
  const isAdmin = userProfile.toLowerCase() === 'administrador' || permissions?.all === true

  return (
    <PermissionsContext.Provider value={{ 
      user, 
      permissions, 
      canAccess, 
      loading, 
      membroId, 
      meusDepartamentos,
      isLeader: meusDepartamentos.length > 0,
      isAdmin,
      userProfile,
      userNome
    }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

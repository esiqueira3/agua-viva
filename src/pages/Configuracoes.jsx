import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'

export default function Configuracoes() {
  const [isDark, setIsDark] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [globalConfigs, setGlobalConfigs] = useState({
    id: 1,
    url_capa_login: '',
    slogan_login: '',
    subtexto_login: ''
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user?.user_metadata?.avatar_url) {
         setAvatarUrl(user.user_metadata.avatar_url)
      }

      // Verificação robusta de Admin (Meta + Banco)
      const metaPerfil = user?.user_metadata?.perfil?.toLowerCase() || ''
      const isMetaAdmin = metaPerfil === 'administrador' || metaPerfil === 'admin'
      
      let isDbAdmin = false
      if (user?.email) {
        const { data: uData } = await supabase
          .from('usuarios_sistema')
          .select('perfil')
          .eq('email', user.email)
          .maybeSingle()
        
        if (uData) {
          const dbPerfil = uData.perfil?.toLowerCase() || ''
          isDbAdmin = dbPerfil === 'administrador' || dbPerfil === 'admin'
        }
      }

      setIsAdmin(isMetaAdmin || isDbAdmin)

      const { data: gData } = await supabase.from('configuracoes_gerais').select('*').eq('id', 1).single()
      if (gData) {
        setGlobalConfigs(gData)
      }
    }
    loadData()
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  const handleSaveAvatar = async () => {
     setLoading(true)
     const { error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
     setLoading(false)
     if (!error) {
        alert("🟢 Foto de perfil atualizada!\nAtualize a página do navegador para ver a mudança.")
     } else {
        alert("❌ Erro ao salvar foto: " + error.message)
     }
  }

  const handleSaveGlobal = async () => {
    setLoadingGlobal(true)
    const { error } = await supabase.from('configuracoes_gerais').upsert({
      id: 1,
      url_capa_login: globalConfigs.url_capa_login,
      slogan_login: globalConfigs.slogan_login,
      subtexto_login: globalConfigs.subtexto_login,
      updated_at: new Date().toISOString()
    })
    
    setLoadingGlobal(false)
    if (!error) {
       alert("🎉 Configurações do sistema atualizadas com sucesso!")
    } else {
       alert("❌ Erro ao salvar configs: " + error.message)
    }
  }

  const inputClass = "w-full p-3 text-sm bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 dark:border-slate-600 border border-outline-variant/20 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 sm:px-0">
      <PageHeader 
        title="Configurações do Sistema" 
        description="Ajustes de interface, parâmetros e conta."
        icon="settings"
      />
      
      {/* Seção Pessoal */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-lg font-black text-primary mb-6 flex items-center gap-2">
           <span className="material-symbols-outlined font-black">person</span> Perfil &amp; Identidade
        </h3>
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center p-6 bg-surface-container-low/40 rounded-2xl border border-outline-variant/5">
           <div className="w-20 h-20 rounded-full flex items-center justify-center bg-white shadow-lg overflow-hidden flex-shrink-0 border-4 border-white">
              {avatarUrl ? (
                 <img src={avatarUrl} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                 <span className="material-symbols-outlined text-5xl text-primary/30">account_circle</span>
              )}
           </div>
           <div className="w-full space-y-3">
              <div>
                 <p className="font-black text-on-surface text-base">Sua Foto de Perfil</p>
                 <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Link de imagem .jpg ou .png</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                 <input 
                   type="url" 
                   placeholder="https://suafoto.com/perfil.jpg" 
                   value={avatarUrl}
                   onChange={(e) => setAvatarUrl(e.target.value)}
                   className={`flex-1 ${inputClass}`}
                 />
                 <button 
                    onClick={handleSaveAvatar}
                    disabled={loading}
                    className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-95"
                 >
                    {loading ? '...' : 'Atualizar Foto'}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Seção Administrador: Personalização Global */}
      {isAdmin && (
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h3 className="text-lg font-black text-primary mb-6 flex items-center gap-2">
             <span className="material-symbols-outlined font-black">brush</span> Personalização do Sistema (Adm)
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 bg-surface-container-low/40 rounded-2xl border border-outline-variant/5">
             <div className="space-y-4">
                <div>
                   <label className="text-xs font-black text-on-surface-variant/70 dark:text-white uppercase tracking-widest mb-1 block">Capa da Tela de Login (URL)</label>
                   <input 
                      type="url" 
                      value={globalConfigs.url_capa_login} 
                      onChange={e => setGlobalConfigs({...globalConfigs, url_capa_login: e.target.value})}
                      placeholder="https://exemplo.com/fundo-igreja.jpg"
                      className={inputClass}
                   />
                </div>
                <div>
                   <label className="text-xs font-black text-on-surface-variant/70 dark:text-white uppercase tracking-widest mb-1 block">Slogan Principal (Boas-vindas)</label>
                   <input 
                      type="text" 
                      value={globalConfigs.slogan_login} 
                      onChange={e => setGlobalConfigs({...globalConfigs, slogan_login: e.target.value})}
                      placeholder="Ex: Água Viva - Do primeiro contato..."
                      className={inputClass}
                   />
                </div>
                <div>
                   <label className="text-xs font-black text-on-surface-variant/70 dark:text-white uppercase tracking-widest mb-1 block">Subtexto (Descrição Curta)</label>
                   <textarea 
                      rows={2}
                      value={globalConfigs.subtexto_login} 
                      onChange={e => setGlobalConfigs({...globalConfigs, subtexto_login: e.target.value})}
                      placeholder="Ex: Conecte sua comunidade através da tecnologia e fé."
                      className={`${inputClass} resize-none`}
                   />
                </div>
                <button 
                    onClick={handleSaveGlobal}
                    disabled={loadingGlobal}
                    className="w-full py-4 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                 >
                    {loadingGlobal ? 'Salvando...' : 'Aplicar Alterações Visuais ao Sistema'}
                 </button>
             </div>
             <div className="hidden lg:flex flex-col gap-3">
                <p className="text-xs font-black text-on-surface-variant/40 uppercase text-center italic">Pré-visualização da Capa</p>
                <div className="flex-1 rounded-2xl overflow-hidden border-2 border-dashed border-outline-variant/20 flex items-center justify-center bg-white dark:bg-slate-800">
                   {globalConfigs.url_capa_login ? (
                      <img src={globalConfigs.url_capa_login} className="w-full h-full object-cover" alt="Preview" />
                   ) : (
                      <span className="material-symbols-outlined text-4xl text-outline/30 font-black">image</span>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Aparência Básica */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm mt-6">
        <h3 className="text-lg font-black text-primary mb-6 flex items-center gap-2">
           <span className="material-symbols-outlined font-black">palette</span> Aparência Visual
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 bg-surface-container-low/40 rounded-2xl border border-outline-variant/5">
           <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark ? 'bg-slate-800 text-tertiary-fixed-dim' : 'bg-white text-primary'}`}>
                 <span className="material-symbols-outlined text-3xl font-black">{isDark ? 'dark_mode' : 'light_mode'}</span>
              </div>
              <div>
                 <p className="font-black text-on-surface text-base">Esquema de Cores do Painel</p>
                 <p className="text-sm text-on-surface-variant font-medium">Alterne entre os modos Claro e Escuro.</p>
              </div>
           </div>
           
           <label className="relative inline-flex items-center cursor-pointer ml-4">
             <input type="checkbox" className="sr-only peer" checked={isDark} onChange={toggleTheme} />
             <div className="w-16 h-8 bg-outline-variant/40 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-[200%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
           </label>
        </div>
      </div>
    </div>
  )
}

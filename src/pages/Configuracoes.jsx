import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'

export default function Configuracoes() {
  const [isDark, setIsDark] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.avatar_url) {
         setAvatarUrl(user.user_metadata.avatar_url)
      }
    }
    loadUser()
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
        alert("🟢 Foto de perfil atualizada com sucesso!\nAtualize essa página do navegador para ver o botão flutuante mudar.")
     } else {
        alert("❌ Erro ao salvar foto: " + error.message)
     }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title="Configurações do Sistema" 
        description="Ajustes de interface, parâmetros e conta."
        icon="settings"
      />
      
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-6">Identidade & Conta</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
           <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-inner overflow-hidden flex-shrink-0 border-2 border-primary/20">
                 {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto" className="w-full h-full object-cover" />
                 ) : (
                    <span className="material-symbols-outlined text-4xl text-primary/50">account_circle</span>
                 )}
              </div>
              <div className="w-full max-w-md space-y-2">
                 <div>
                    <p className="font-bold text-on-surface text-sm">Foto de Perfil (Via URL Link Externo)</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">Use um endereço direto de imagem .jpg ou .png</p>
                 </div>
                 <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="https://suafoto.com/perfil.jpg" 
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="flex-1 p-2 text-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button 
                       onClick={handleSaveAvatar}
                       disabled={loading}
                       className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                       {loading ? '...' : 'Salvar'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-primary mb-6">Aparência Visual</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${isDark ? 'bg-slate-800 text-tertiary-fixed-dim' : 'bg-white text-primary'}`}>
                 <span className="material-symbols-outlined text-3xl">{isDark ? 'dark_mode' : 'light_mode'}</span>
              </div>
              <div>
                 <p className="font-bold text-on-surface">Modo de Exibição / Tema</p>
                 <p className="text-sm text-on-surface-variant">Alterna entre as versões Clara e Escura (Dark Mode) do painel.</p>
              </div>
           </div>
           
           <label className="relative inline-flex items-center cursor-pointer ml-4">
             <input type="checkbox" className="sr-only peer" checked={isDark} onChange={toggleTheme} />
             <div className="w-14 h-7 bg-outline-variant/60 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
           </label>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function TopNavBar({ toggleSidebar, isCollapsed }) {
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.avatar_url) {
         setAvatarUrl(user.user_metadata.avatar_url)
      }
    }
    loadUser()
  }, [])
  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/20 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleSidebar} 
          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary/20"
        >
          <span className="material-symbols-outlined">{isCollapsed ? 'menu_open' : 'menu'}</span>
        </button>
        <div className="relative ml-4 hidden md:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant">search</span>
          <input 
            type="text" 
            placeholder="Buscar qualquer coisa..." 
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-container w-64 transition-all outline-none" 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-outline-variant/30">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-primary font-headline">Admin</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Online</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-tertiary-fixed bg-surface-variant flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
               <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
               <span className="material-symbols-outlined text-outline">person</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

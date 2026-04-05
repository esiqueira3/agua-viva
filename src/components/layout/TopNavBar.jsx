import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { usePermissions } from '../../context/PermissionsContext'

export default function TopNavBar({ toggleSidebar, isCollapsed }) {
  const { userNome, userProfile, isAdmin, loading } = usePermissions()
  const [showMenu, setShowMenu] = useState(false)
  
  // Estados da Busca Global
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ membros: [], eventos: [], departamentos: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Motor da Busca Global (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch(searchQuery)
      } else {
        setSearchResults({ membros: [], eventos: [], departamentos: [] })
        setShowSearch(false)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const handleSearch = async (query) => {
    setIsSearching(true)
    setShowSearch(true)
    
    // Consultas em paralelo para máxima velocidade
    // Se não for admin, não busca na tabela de membros (REPETIÇÃO DO FILTRO RBAC)
    const queries = [
       isAdmin 
         ? supabase.from('membros').select('id, nome_completo').ilike('nome_completo', `%${query}%`).limit(5)
         : Promise.resolve({ data: [] }),
       supabase.from('eventos').select('id, nome').ilike('nome', `%${query}%`).limit(5),
       supabase.from('departamentos').select('id, nome').ilike('nome', `%${query}%`).limit(5)
    ]

    const [resMembros, resEventos, resDepts] = await Promise.all(queries)

    setSearchResults({
      membros: resMembros.data || [],
      eventos: resEventos.data || [],
      departamentos: resDepts.data || []
    })
    setIsSearching(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }
  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/20 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleSidebar} 
          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary/20"
        >
          <span className="material-symbols-outlined">{isCollapsed ? 'menu_open' : 'menu'}</span>
        </button>
        <div className="relative ml-4 hidden md:block group">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined transition-colors ${searchQuery ? 'text-primary' : 'text-outline-variant'}`}>
            {isSearching ? 'sync' : 'search'}
          </span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar membro, evento, setor..." 
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-container w-64 md:w-80 transition-all outline-none" 
          />

          {/* Resultado da Busca (Dropdown) */}
          {showSearch && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-outline-variant/10 py-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px]">
               {isSearching ? (
                  <p className="px-6 py-4 text-xs font-bold text-slate-400 animate-pulse italic">Vasculhando registros...</p>
               ) : (
                  <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-2 space-y-4">
                     
                     {/* Seção Membros */}
                     {searchResults.membros.length > 0 && (
                        <div>
                           <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary/60 border-b border-primary/10 mb-1">Pessoas em Foco</p>
                           {searchResults.membros.map(m => (
                              <button key={m.id} onClick={() => {window.location.href=`/membros/editar/${m.id}`; setShowSearch(false); setSearchQuery('')}} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-primary/5 transition-colors text-left group">
                                 <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors">person</span>
                                 <span className="text-sm font-bold text-on-surface">{m.nome_completo}</span>
                              </button>
                           ))}
                        </div>
                     )}

                     {/* Seção Eventos */}
                     {searchResults.eventos.length > 0 && (
                        <div>
                           <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-tertiary-fixed-dim/60 border-b border-tertiary-fixed-dim/10 mb-1">Eventos Ativos</p>
                           {searchResults.eventos.map(e => (
                              <button key={e.id} onClick={() => {window.location.href=`/eventos/editar/${e.id}`; setShowSearch(false); setSearchQuery('')}} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-tertiary-fixed-dim/5 transition-colors text-left group">
                                 <span className="material-symbols-outlined text-tertiary-fixed-dim/40 group-hover:text-tertiary-fixed-dim transition-colors">festival</span>
                                 <span className="text-sm font-bold text-on-surface">{e.nome}</span>
                              </button>
                           ))}
                        </div>
                     )}

                     {/* Seção Departamentos */}
                     {searchResults.departamentos.length > 0 && (
                        <div>
                           <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-600/60 border-b border-amber-600/10 mb-1">Ministérios</p>
                           {searchResults.departamentos.map(d => (
                              <button key={d.id} onClick={() => {window.location.href=`/departamentos/editar/${d.id}`; setShowSearch(false); setSearchQuery('')}} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-amber-600/5 transition-colors text-left group">
                                 <span className="material-symbols-outlined text-amber-600/40 group-hover:text-amber-600 transition-colors">account_tree</span>
                                 <span className="text-sm font-bold text-on-surface">{d.nome}</span>
                              </button>
                           ))}
                        </div>
                     )}

                     {searchResults.membros.length === 0 && searchResults.eventos.length === 0 && searchResults.departamentos.length === 0 && (
                        <div className="p-6 text-center">
                           <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">find_in_page</span>
                           <p className="text-xs font-bold text-slate-400 italic">Nenhum resultado para "{searchQuery}"</p>
                        </div>
                     )}
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
        
        <div className="relative pl-6 border-l border-outline-variant/30">
          <button 
             onClick={() => setShowMenu(!showMenu)}
             className="flex items-center gap-3 hover:bg-surface-container-low p-1.5 rounded-2xl transition-all active:scale-95 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary font-headline">{userNome}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">{userProfile}</p>
            </div>
            <div className={`w-10 h-10 rounded-full border-2 bg-surface-variant flex items-center justify-center overflow-hidden transition-all ${showMenu ? 'border-primary ring-4 ring-primary/10' : 'border-tertiary-fixed'}`}>
              <span className="material-symbols-outlined text-outline">person</span>
            </div>
          </button>

          {showMenu && (
            <>
              {/* Overlay invisível para fechar ao clicar fora */}
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
              
              <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-outline-variant/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-outline-variant/10 md:hidden">
                    <p className="text-xs font-bold text-primary truncate">{userNome}</p>
                  </div>
                 <button 
                    onClick={() => { setShowMenu(false); window.location.href = '/configuracoes' }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                 >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                    Configurações
                 </button>
                 <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                 >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Sair do Sistema
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

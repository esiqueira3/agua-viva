import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { usePermissions } from '../../context/PermissionsContext'

export default function TopNavBar({ toggleSidebar, isCollapsed }) {
  const { userNome, userProfile, isAdmin, loading, user, userAvatar } = usePermissions()
  const [showMenu, setShowMenu] = useState(false)
  
  // Estados da Busca Global
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ membros: [], eventos: [], departamentos: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])

  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const helpRef = useRef(null)
  const notifRef = useRef(null)
  
  // Efeito para fechar ao clicar fora ou apertar ESC
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false)
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelpMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowMenu(false)
        setShowSearch(false)
        setShowHelpMenu(false)
        setShowNotifications(false)
      }
    }

    if (showMenu || showSearch || showHelpMenu || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showMenu, showSearch, showHelpMenu, showNotifications])

  // Busca Notificações
  useEffect(() => {
    async function loadNotifications() {
      if (!user) return
      
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .or(`user_email.eq.${user.email},user_email.is.null`)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) setNotificacoes(data)
    }

    loadNotifications()

    // Real-time
    const subscription = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        const newNotif = payload.new
        if (!newNotif.user_email || newNotif.user_email === user?.email) {
          setNotificacoes(prev => [newNotif, ...prev].slice(0, 10))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user])

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

  const [showReleaseNotes, setShowReleaseNotes] = useState(false)

  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/20 shadow-sm transition-all duration-300">
      
      {/* MODAL DE RELEASE NOTES (NOVIDADES) */}
      {showReleaseNotes && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm transition-all duration-500" onClick={() => setShowReleaseNotes(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-outline-variant/10 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300 my-auto flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4 flex justify-between items-start bg-white dark:bg-slate-900 sticky top-0 z-20">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">Lançamento</span>
                     <span className="text-[10px] font-black text-on-surface-variant/40">20 de Abril, 2026</span>
                  </div>
                  <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase leading-none">Release Notes <span className="text-primary italic">v1.0</span></h2>
               </div>
               <button onClick={() => setShowReleaseNotes(false)} className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-outline">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar space-y-8">
               <div className="p-6 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white shadow-xl shadow-primary/20">
                  <p className="text-lg font-bold leading-tight">"O Água Viva agora é 1.0 Oficial! Saímos da fase BETA com um motor financeiro blindado e visual ultra-moderno."</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5">
                     <span className="material-symbols-outlined text-primary mb-3">payments</span>
                     <h4 className="font-black text-xs uppercase tracking-tight text-on-surface mb-2">Motor Financeiro 2.0</h4>
                     <p className="text-[11px] font-bold text-on-surface-variant/70 leading-relaxed">Cálculo dinâmico inteligente para PIX e Cartão, garantindo o valor líquido exato para a igreja.</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5">
                     <span className="material-symbols-outlined text-green-500 mb-3">security</span>
                     <h4 className="font-black text-xs uppercase tracking-tight text-on-surface mb-2">Blindagem de Segurança</h4>
                     <p className="text-[11px] font-bold text-on-surface-variant/70 leading-relaxed">Proteção contra manipulação de preços servidorside e auditoria de aceite de termos por colaborador.</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5">
                     <span className="material-symbols-outlined text-amber-500 mb-3">grid_view</span>
                     <h4 className="font-black text-xs uppercase tracking-tight text-on-surface mb-2">Interface em Cards</h4>
                     <p className="text-[11px] font-bold text-on-surface-variant/70 leading-relaxed">Controle de acessos e usuários totalmente remodelado com visual ultra-rápido e intuitivo.</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5">
                     <span className="material-symbols-outlined text-blue-500 mb-3">ad_units</span>
                     <h4 className="font-black text-xs uppercase tracking-tight text-on-surface mb-2">Otimização Mobile</h4>
                     <p className="text-[11px] font-bold text-on-surface-variant/70 leading-relaxed">Gestão financeira e de inscritos redesenhada para iPhones e Androids com foco em usabilidade.</p>
                  </div>
               </div>

               <div className="space-y-3 pb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Outras Melhorias</p>
                  <ul className="space-y-2">
                     <li className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Performance: Carregamento de Dashboards 40% mais rápido.
                     </li>
                     <li className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Exportação: Novo motor de geração de PDF e Excel para inscritos.
                     </li>
                  </ul>
               </div>
            </div>

            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-center">
               <button onClick={() => setShowReleaseNotes(false)} className="px-10 py-4 bg-on-surface text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">Começar a Usar v1.0</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button 
          onClick={toggleSidebar} 
          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary/20"
        >
          <span className="material-symbols-outlined">{isCollapsed ? 'menu_open' : 'menu'}</span>
        </button>
        <div ref={searchRef} className="relative ml-4 hidden md:block group">
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
        {/* Sino de Notificações */}
        <div ref={notifRef} className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showNotifications ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[23px]" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
            {!loading && notificacoes.filter(n => !n.lida).length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-outline-variant/10 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
               <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
                  <p className="text-xs font-black text-on-surface uppercase tracking-tight">Notificações</p>
                  <button 
                    onClick={async () => {
                      await supabase.from('notificacoes').update({ lida: true }).or(`user_email.eq.${user.email},user_email.is.null`)
                      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
                    }}
                    className="text-[10px] font-black text-primary uppercase hover:underline"
                  >
                    Marcar tudo como lida
                  </button>
               </div>
               
               <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {notificacoes.length === 0 ? (
                     <div className="p-8 text-center opacity-30">
                        <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nada por agora</p>
                     </div>
                  ) : (
                     notificacoes.map(n => (
                        <button 
                          key={n.id} 
                          onClick={async () => {
                             if(!n.lida) await supabase.from('notificacoes').update({ lida: true }).eq('id', n.id)
                             setNotificacoes(prev => prev.map(nt => nt.id === n.id ? { ...nt, lida: true } : nt))
                             if(n.link) window.location.href = n.link
                          }}
                          className={`w-full p-4 border-b border-outline-variant/5 text-left transition-colors hover:bg-surface-container-low flex items-start gap-3 relative ${!n.lida ? 'bg-primary/5' : ''}`}
                        >
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                             n.tipo === 'aniversario' ? 'bg-pink-100 text-pink-600' :
                             n.tipo === 'inscricao' ? 'bg-emerald-100 text-emerald-600' :
                             n.tipo === 'mural' ? 'bg-orange-100 text-orange-600' :
                             'bg-blue-100 text-blue-600'
                           }`}>
                              <span className="material-symbols-outlined text-[18px]">
                                {n.tipo === 'aniversario' ? 'cake' : 
                                 n.tipo === 'inscricao' ? 'payments' : 
                                 n.tipo === 'mural' ? 'campaign' : 
                                 'info'}
                              </span>
                           </div>
                           <div className="min-w-0 pr-2">
                              <p className={`text-xs font-black text-on-surface leading-tight truncate ${!n.lida ? 'text-primary' : ''}`}>{n.titulo}</p>
                              <p className="text-[11px] font-bold text-on-surface-variant/70 leading-snug mt-1 line-clamp-2">{n.mensagem}</p>
                              <p className="text-[9px] font-black uppercase text-on-surface-variant/30 mt-1.5">
                                 {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString('pt-BR')}
                              </p>
                           </div>
                           {!n.lida && (
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full"></div>
                           )}
                        </button>
                     ))
                  )}
               </div>
               
               <div className="p-3 border-t border-outline-variant/10 text-center bg-surface-container-lowest">
                  <button className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest hover:text-primary transition-colors">Ver todas as notificações</button>
               </div>
            </div>
          )}
        </div>

        <div ref={helpRef} className="relative">
          <button 
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showHelpMenu ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          {showHelpMenu && (
            <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-outline-variant/10 p-5 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <p className="text-xs font-black text-on-surface uppercase tracking-tight">Avadora System</p>
                  <p className="text-[10px] font-bold text-primary">Versão 1.0 Oficial</p>
                </div>
              </div>
              
              <div className="space-y-1 pt-3 border-t border-outline-variant/10">
                <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest mb-2">Suporte & Novidades</p>
                
                <button 
                  onClick={() => { setShowHelpMenu(false); setShowReleaseNotes(true); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all text-left group border border-primary/10"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary animate-pulse">campaign</span>
                  <span className="text-xs font-black text-primary uppercase">O que há de novo?</span>
                </button>

                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors text-left group">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">description</span>
                  <span className="text-xs font-bold text-on-surface">Guia do Usuário</span>
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors text-left group">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">support_agent</span>
                  <span className="text-xs font-bold text-on-surface">Suporte Técnico</span>
                </button>
              </div>

               <div className="mt-4 pt-4 border-t border-outline-variant/10">
                  <p className="text-[9px] text-on-surface-variant/30 font-black uppercase text-center tracking-tighter">Orgulhosamente servindo à <br/> Comunidade Água Viva.</p>
               </div>
            </div>
          )}
        </div>
        
        <div ref={menuRef} className="relative pl-6 border-l border-outline-variant/30">
          <button 
             onClick={() => setShowMenu(!showMenu)}
             className="flex items-center gap-3 hover:bg-surface-container-low p-1.5 rounded-2xl transition-all active:scale-95 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary font-headline">{userNome}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">{userProfile}</p>
            </div>
            <div className={`w-10 h-10 rounded-full border-2 bg-surface-variant flex items-center justify-center overflow-hidden transition-all ${showMenu ? 'border-primary ring-4 ring-primary/10' : 'border-tertiary-fixed'}`}>
              {userAvatar ? (
                <img src={userAvatar} alt={userNome} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-outline">person</span>
              )}
            </div>
          </button>

          {showMenu && (
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
          )}
        </div>
      </div>
    </header>
  )
}

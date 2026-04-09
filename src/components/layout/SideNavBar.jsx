import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePermissions } from '../../context/PermissionsContext'

export default function SideNavBar({ isCollapsed }) {
  const [isFinanceiroExpanded, setIsFinanceiroExpanded] = useState(false)
  const [isMembrosExpanded, setIsMembrosExpanded] = useState(false)
  const [isUsuariosExpanded, setIsUsuariosExpanded] = useState(false)
  const [isCalendarioExpanded, setIsCalendarioExpanded] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { canAccess, isAdmin } = usePermissions()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }
  
  const navItems = [
    { name: 'Home', path: '/home', icon: 'home', perm: 'menu_home', section: 'general' },
    { type: 'divider' },
    { type: 'label', text: 'Administrativo', icon: 'business_center', section: 'admin' },
    { name: 'Igrejas', path: '/igrejas', icon: 'church', perm: 'menu_igrejas', section: 'admin' },
    { name: 'Departamentos', path: '/departamentos', icon: 'account_tree', perm: 'menu_departamentos', section: 'admin' },
    { name: 'Locais', path: '/locais', icon: 'location_on', perm: 'menu_locais', section: 'admin' },
    { name: 'Membros', path: '/membros', icon: 'person_add', perm: 'menu_membros', section: 'admin' },
    { type: 'divider' },
    { type: 'label', text: 'Programações', icon: 'event_available', section: 'prog' },
    { name: 'Eventos', path: '/eventos', icon: 'theater_comedy', perm: 'menu_eventos', section: 'prog' },
    { name: 'Calendário', path: '/calendario', icon: 'calendar_month', perm: 'menu_calendario', section: 'prog' },
    { type: 'divider' },
    { type: 'label', text: 'Financeiro', icon: 'payments', section: 'fin' },
    { name: 'Financeiro', path: '/financeiro-eventos', icon: 'monetization_on', perm: 'menu_financeiro', section: 'fin' },
    { type: 'divider' },
    { type: 'label', text: 'Sistema & Suporte', icon: 'construction', section: 'sys' },
    { name: 'Configurações', path: '/configuracoes', icon: 'settings', perm: 'menu_configuracoes', section: 'sys' },
    { name: 'Usuários', path: '/usuarios', icon: 'admin_panel_settings', perm: 'menu_usuarios', section: 'sys' }
  ]

  const getSectionStyles = (section) => {
    switch (section) {
      case 'admin': return { 
        gradient: 'from-blue-700 via-indigo-500 to-sky-400',
        glow: 'shadow-indigo-500/20',
        active: 'text-indigo-600 bg-indigo-500/10 border-indigo-500',
        label: 'text-indigo-600/70 dark:text-indigo-400/70'
      }
      case 'prog': return { 
        gradient: 'from-purple-600 via-fuchsia-500 to-pink-400',
        glow: 'shadow-fuchsia-500/20',
        active: 'text-fuchsia-600 bg-fuchsia-500/10 border-fuchsia-500',
        label: 'text-fuchsia-600/70 dark:text-fuchsia-400/70'
      }
      case 'fin': return { 
        gradient: 'from-emerald-600 via-teal-500 to-cyan-400',
        glow: 'shadow-emerald-500/20',
        active: 'text-emerald-600 bg-emerald-500/10 border-emerald-500',
        label: 'text-emerald-600/70 dark:text-emerald-400/70'
      }
      case 'sys': return { 
        gradient: 'from-amber-600 via-orange-500 to-yellow-500',
        glow: 'shadow-amber-500/20',
        active: 'text-amber-600 bg-amber-500/10 border-amber-500',
        label: 'text-amber-600/70 dark:text-amber-400/70'
      }
      default: return { 
        gradient: 'from-blue-700 via-cyan-500 to-emerald-400',
        glow: 'shadow-blue-500/10',
        active: 'text-primary bg-primary/10 border-primary',
        label: 'text-slate-600 dark:text-slate-400'
      }
    }
  }

  // Filtra itens baseados em permissões
  const filteredNavItems = navItems.filter(item => {
    if (item.type === 'divider' || item.type === 'label') return true
    
    if (item.name === 'Membros') {
       return canAccess('menu_membros') || canAccess('menu_membros_link') || canAccess('menu_membros_certificados')
    }
    if (item.name === 'Financeiro') {
       return canAccess('menu_financeiro')
    }
    return canAccess(item.perm)
  })

  // Remove divisores consecutivos ou no início/fim após o filtro (simplificado)
  const finalNavItems = filteredNavItems.filter((item, idx, arr) => {
    if (item.type === 'divider') {
      if (idx === 0 || idx === arr.length - 1) return false
      if (arr[idx + 1]?.type === 'divider') return false
    }
    if (item.type === 'label') {
      // O rótulo só aparece se algum item no bloco seguinte (até o próximo divider) for visível
      let hasVisibleItemInBlock = false
      for (let i = idx + 1; i < arr.length; i++) {
        if (arr[i].type === 'divider' || arr[i].type === 'label') break
        if (arr[i].name === 'Financeiro' && canAccess('menu_financeiro')) {
          hasVisibleItemInBlock = true
          break
        }
        if (arr[i].perm && canAccess(arr[i].perm)) {
           hasVisibleItemInBlock = true
           break
        }
      }
      return hasVisibleItemInBlock
    }
    return true
  })

  const isActive = (path) => location.pathname === path

  return (
    <aside className={`h-screen transition-all duration-500 fixed left-0 top-0 flex flex-col border-r border-white/10 dark:border-slate-800/20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl z-50 overflow-hidden ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'w-64 translate-x-0'}`}>
      
      {/* Luz Ambiente de Fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20 transition-opacity">
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="flex flex-col h-full py-6 overflow-hidden relative z-10">
        <div className={`mb-8 flex flex-col items-center justify-center w-full transition-all select-none min-h-[64px] shrink-0`}>
          <Link to="/home" className="flex flex-col items-center hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <img 
               src="/logo.png" 
               alt="Logo Água Viva" 
               className={`dark:hidden object-contain transition-all duration-300 drop-shadow-sm ${isCollapsed ? 'w-10 h-10' : 'w-[140px] max-h-12'}`}
            />
            <img 
               src="/logo_branco.png" 
               alt="Logo Água Viva" 
               className={`hidden dark:block object-contain transition-all duration-300 drop-shadow-sm ${isCollapsed ? 'w-10 h-10' : 'w-[140px] max-h-12'}`}
            />
            {!isCollapsed && (
               <p className="text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-black mt-1 text-center">
                 Gestão Inteligente
               </p>
            )}
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-4 h-full">
          <nav className="space-y-1.5 px-3">
            {finalNavItems.map((item, idx) => {
              const styles = getSectionStyles(item.section)

              if (item.type === 'divider') {
                return <div key={`div-${idx}`} className="my-5 mx-6 border-t border-slate-200/50 dark:border-white/5" />
              }

              if (item.type === 'label') {
                if (isCollapsed) return null
                return (
                  <div key={`lab-${idx}`} className="px-5 pt-4 pb-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-700">
                    {item.icon && (
                      <span className={`material-symbols-outlined text-[15px] ${styles.label}`} style={{ fontWeight: 'bold' }}>
                        {item.icon}
                      </span>
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.label}`}>
                      {item.text}
                    </span>
                  </div>
                )
              }

              const itemIsActive = isActive(item.path) || (item.name === 'Usuários' && location.pathname.includes('/usuarios'))

              return (
                <div key={item.path || item.name} className="relative group px-1">
                  {/* Glow Active Background (Efeito Pill) */}
                  {itemIsActive && !isCollapsed && (
                    <div className={`absolute inset-y-0 -left-3 w-1.5 rounded-r-full bg-gradient-to-b ${styles.gradient} shadow-[0_0_15px_rgba(var(--color-primary),0.5)]`} />
                  )}

                  <Link
                    to={canAccess(item.perm) ? item.path : '#'}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-300 rounded-2xl relative overflow-hidden ${
                      itemIsActive 
                        ? `text-on-surface ring-1 ring-white/10 shadow-lg ${isCollapsed ? '' : styles.active}` 
                        : 'text-slate-500/70 dark:text-slate-400/60 hover:text-primary dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                    } ${item.perm && !canAccess(item.perm) ? 'cursor-default opacity-50' : ''}`}
                    onClick={(e) => {
                      if (item.perm && !canAccess(item.perm)) {
                        e.preventDefault()
                        if (item.name === 'Membros') setIsMembrosExpanded(!isMembrosExpanded)
                      }
                    }}
                    title={isCollapsed ? item.name : ''}
                  >
                    <div className={`shrink-0 p-[1.5px] rounded-full bg-gradient-to-tr ${styles.gradient} ${styles.glow} active:scale-90 transition-all duration-500`}>
                      <div className={`w-8 h-8 flex items-center justify-center ${itemIsActive ? 'bg-transparent text-white' : 'bg-white dark:bg-slate-950'} rounded-full transition-colors duration-500`}>
                        <span className={`material-symbols-outlined text-[18px] transition-all duration-700 ease-in-out group-hover:rotate-[360deg] ${itemIsActive ? 'scale-110' : ''}`}>
                          {item.icon}
                        </span>
                      </div>
                    </div>
                    {!isCollapsed && <span className={`whitespace-nowrap flex-1 transition-colors duration-300 ${itemIsActive ? 'font-black tracking-tight' : 'font-bold'}`}>{item.name}</span>}
                    
                    {!isCollapsed && (item.name === 'Financeiro' || item.name === 'Membros' || item.name === 'Calendário' || item.name === 'Usuários') && (
                      <div 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (item.name === 'Financeiro') setIsFinanceiroExpanded(!isFinanceiroExpanded)
                          if (item.name === 'Membros') setIsMembrosExpanded(!isMembrosExpanded)
                          if (item.name === 'Calendário') setIsCalendarioExpanded(!isCalendarioExpanded)
                          if (item.name === 'Usuários') setIsUsuariosExpanded(!isUsuariosExpanded)
                        }}
                        className="p-1 flex items-center justify-center border border-slate-300/30 dark:border-white/10 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
                      >
                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-500 ${
                          (item.name === 'Financeiro' && isFinanceiroExpanded) || 
                          (item.name === 'Membros' && isMembrosExpanded) ||
                          (item.name === 'Calendário' && isCalendarioExpanded) ||
                          (item.name === 'Usuários' && isUsuariosExpanded)
                          ? 'rotate-180' : ''
                        }`}>
                          expand_more
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Submenus com identidades de cor */}
                  {item.name === 'Financeiro' && !isCollapsed && isFinanceiroExpanded && (
                     <div className="ml-11 mt-1 space-y-1 border-l border-emerald-500/20 pl-2">
                        {canAccess('menu_financeiro_mp') && (
                          <Link 
                            to="/financeiro/mercado-pago"
                            className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              location.pathname === '/financeiro/mercado-pago'
                                ? 'text-emerald-600 bg-emerald-500/10 shadow-sm'
                                : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/5'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">api</span>
                            API MERCADO PAGO
                          </Link>
                        )}
                     </div>
                  )}

                  {item.name === 'Membros' && !isCollapsed && isMembrosExpanded && (
                     <div className="ml-11 mt-1 space-y-1 border-l border-indigo-500/20 pl-2">
                        {[{to: "/membros/link-publico", label: "LINK PÚBLICO", perm: 'menu_membros_link', icon: 'public'},
                          {to: "/membros/pre-cadastro", label: "PRÉ-CADASTRO", perm: 'menu_membros_pre_cadastro', icon: 'how_to_reg'},
                          {to: "/membros/certificados", label: "CERTIFICADOS", perm: 'menu_membros_certificados', icon: 'workspace_premium'}
                        ].map(sub => canAccess(sub.perm) && (
                          <Link 
                            key={sub.to}
                            to={sub.to}
                            className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              location.pathname.includes(sub.to)
                                ? 'text-indigo-600 bg-indigo-500/10 shadow-sm'
                                : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/5'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{sub.icon}</span>
                            {sub.label}
                          </Link>
                        ))}
                     </div>
                  )}

                  {item.name === 'Calendário' && !isCollapsed && (isCalendarioExpanded || location.pathname === '/agenda') && (
                     <div className="ml-11 mt-1 space-y-1 border-l border-fuchsia-500/20 pl-2">
                        {canAccess('menu_calendario_publico') && (
                          <Link 
                            to="/agenda"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              location.pathname === '/agenda'
                                ? 'text-fuchsia-600 bg-fuchsia-500/10 shadow-sm'
                                : 'text-slate-400 hover:text-fuchsia-500 hover:bg-fuchsia-500/5'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">public</span>
                            AGENDA PÚBLICA
                          </Link>
                        )}
                     </div>
                  )}

                  {item.name === 'Usuários' && isAdmin && !isCollapsed && isUsuariosExpanded && (
                     <div className="ml-11 mt-1 space-y-1 border-l border-amber-500/20 pl-2">
                        <Link 
                          to="/usuarios/gestao-acessos"
                          className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                            location.pathname === '/usuarios/gestao-acessos'
                              ? 'text-amber-600 bg-amber-500/10 shadow-sm'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">security</span>
                          GESTÃO DE PERFIS
                        </Link>
                     </div>
                  )}
                </div>
              )
            })}
          </nav>
          
          <div className="mt-auto px-4 space-y-2 pt-8 shrink-0 relative">
            <button
              onClick={handleLogout}
              title={isCollapsed ? 'Sair' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3.5 text-slate-500 dark:text-slate-400 hover:text-error font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-error/10 dark:hover:bg-error/20 group transition-all duration-300 ring-1 ring-transparent hover:ring-error/20`}
            >
              <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-orange-400 shadow-lg shadow-red-500/10 active:scale-90 transition-all duration-500">
                <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-950 rounded-full group-hover:bg-transparent group-hover:text-white transition-colors duration-500">
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]">logout</span> 
                </div>
              </div>
              {!isCollapsed && <span>Sair do Sistema</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

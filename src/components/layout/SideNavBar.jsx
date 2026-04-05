import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePermissions } from '../../context/PermissionsContext'

export default function SideNavBar({ isCollapsed }) {
  const [isFinanceiroExpanded, setIsFinanceiroExpanded] = useState(false)
  const [isMembrosExpanded, setIsMembrosExpanded] = useState(false)
  const [isUsuariosExpanded, setIsUsuariosExpanded] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { canAccess, isAdmin } = usePermissions()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }
  
  const navItems = [
    { name: 'Início', path: '/home', icon: 'home', perm: 'menu_home' },
    { name: 'Departamentos', path: '/departamentos', icon: 'account_tree', perm: 'menu_departamentos' },
    { name: 'Membros', path: '/membros', icon: 'person_add', perm: 'menu_membros' },
    { name: 'Igrejas', path: '/igrejas', icon: 'church', perm: 'menu_igrejas' },
    { name: 'Locais', path: '/locais', icon: 'location_on', perm: 'menu_locais' },
    { name: 'Eventos', path: '/eventos', icon: 'theater_comedy', perm: 'menu_eventos' },
    { name: 'Financeiro', path: '/financeiro-eventos', icon: 'monetization_on', perm: 'menu_financeiro' },
    { name: 'Calendário', path: '/calendario', icon: 'calendar_month', perm: 'menu_calendario' }
  ]

  // Filtra itens baseados em permissões
  const filteredNavItems = navItems.filter(item => {
    // Se o menu de Membros está inativo, mas um submenu está ativo, ainda mostramos o item pai
    // Mas no caso solicitado, Membros (Inativo), então só mostramos se canAccess('menu_membros') 
    // ou se algum dos filhos essenciais estiver ativo e quisermos permitir acesso parcial.
    // O usuário disse: Membros (Inativo) mas Link Publico (Ativo) e Certificados (Ativo).
    // Então para o item "Membros" aparecer, basta que o PAI ou algum FILHO seja permitido.
    if (item.name === 'Membros') {
       return canAccess('menu_membros') || canAccess('menu_membros_link') || canAccess('menu_membros_certificados')
    }
    if (item.name === 'Financeiro') {
       return canAccess('menu_financeiro')
    }
    return canAccess(item.perm)
  })

  const isActive = (path) => location.pathname === path

  return (
    <aside className={`h-screen transition-all duration-300 fixed left-0 top-0 flex flex-col border-r border-slate-200/20 bg-slate-50 dark:bg-slate-950 z-50 overflow-hidden ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'w-64 translate-x-0'}`}>
      <div className="flex flex-col h-full py-6 overflow-hidden">
        <div className={`mb-8 flex flex-col items-center justify-center w-full transition-all select-none min-h-[64px] shrink-0`}>
          <Link to="/home" className="flex flex-col items-center hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <img 
               src="/logo.png" 
               alt="Logo Água Viva" 
               className={`object-contain transition-all duration-300 drop-shadow-sm ${isCollapsed ? 'w-10 h-10' : 'w-[140px] max-h-12'}`}
            />
            {!isCollapsed && (
               <p className="text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/80 font-bold mt-1 text-center">
                 Gestão Inteligente
               </p>
            )}
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-4 h-full">
          <nav className="space-y-1 px-3">
            {filteredNavItems.map((item) => (
              <div key={item.path}>
                <Link
                  to={canAccess(item.perm) ? item.path : '#'}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-200 rounded-xl ${
                    isActive(item.path)
                      ? 'text-primary border-l-4 border-tertiary-fixed-dim bg-primary/10 dark:bg-primary/20 scale-[0.99] font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                  } ${!canAccess(item.perm) ? 'cursor-default' : ''}`}
                  onClick={(e) => {
                    if (!canAccess(item.perm)) {
                      e.preventDefault()
                      if (item.name === 'Membros') setIsMembrosExpanded(!isMembrosExpanded)
                    }
                  }}
                  title={isCollapsed ? item.name : ''}
                >
                  <span className={`material-symbols-outlined ${isActive(item.path) ? 'text-primary' : ''}`}>
                     {item.icon}
                  </span>
                  {!isCollapsed && <span className="whitespace-nowrap flex-1">{item.name}</span>}
                  
                  {!isCollapsed && (item.name === 'Financeiro' || item.name === 'Membros') && (
                    <div 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (item.name === 'Financeiro') setIsFinanceiroExpanded(!isFinanceiroExpanded)
                        if (item.name === 'Membros') setIsMembrosExpanded(!isMembrosExpanded)
                      }}
                      className="p-1 hover:bg-slate-300/30 dark:hover:bg-white/10 rounded-md transition-all cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${
                        (item.name === 'Financeiro' && isFinanceiroExpanded) || (item.name === 'Membros' && isMembrosExpanded) ? 'rotate-180' : ''
                      }`}>
                        expand_more
                      </span>
                    </div>
                  )}
                </Link>

                {/* Submenu para Financeiro */}
                {item.name === 'Financeiro' && !isCollapsed && isFinanceiroExpanded && (
                   <div className="ml-9 mt-1 space-y-1">
                      {canAccess('menu_financeiro_mp') && (
                        <Link 
                          to="/financeiro/mercado-pago"
                          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            location.pathname === '/financeiro/mercado-pago'
                              ? 'text-primary bg-primary/10 dark:bg-primary/20'
                              : 'text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">api</span>
                          API MERCADO PAGO
                        </Link>
                      )}
                   </div>
                )}

                {/* Submenu para Membros */}
                {item.name === 'Membros' && !isCollapsed && isMembrosExpanded && (
                   <div className="ml-9 mt-1 space-y-1">
                      {canAccess('menu_membros_pre_cadastro') && (
                        <Link 
                          to="/membros/pre-cadastro"
                          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            location.pathname === '/membros/pre-cadastro'
                              ? 'text-primary bg-primary/10 dark:bg-primary/20'
                              : 'text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                          PRÉ-CADASTRO
                        </Link>
                      )}
                      
                      {canAccess('menu_membros_link') && (
                        <Link 
                          to="/membros/link-publico"
                          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            location.pathname === '/membros/link-publico'
                              ? 'text-primary bg-primary/10 dark:bg-primary/20'
                              : 'text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">public</span>
                          LINK PÚBLICO
                        </Link>
                      )}

                      {canAccess('menu_membros_certificados') && (
                        <Link 
                          to="/membros/certificados"
                          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            location.pathname.includes('/membros/certificados')
                              ? 'text-primary bg-primary/10 dark:bg-primary/20'
                              : 'text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                          CERTIFICADOS
                        </Link>
                      )}
                   </div>
                )}
              </div>
            ))}
          </nav>
          
          <div className="mt-auto px-3 space-y-1 pt-6 shrink-0">
            {canAccess('menu_configuracoes') && (
              <Link
                to="/configuracoes"
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-200 rounded-xl ${
                  isActive('/configuracoes')
                    ? 'text-primary border-l-4 border-tertiary-fixed-dim bg-primary/10 dark:bg-primary/20 scale-[0.99] font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
                title={isCollapsed ? 'Configurações' : ''}
              >
                <span className={`material-symbols-outlined ${isActive('/configuracoes') ? 'text-primary' : ''}`}>settings</span>
                {!isCollapsed && <span className="whitespace-nowrap">Configurações</span>}
              </Link>
            )}

            {canAccess('menu_usuarios') && (
              <div className="flex flex-col gap-1">
                <Link
                  to="/usuarios"
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-200 rounded-xl ${
                    isActive('/usuarios') || (location.pathname.includes('/usuarios') && !location.pathname.includes('gestao-acessos'))
                      ? 'text-primary border-l-4 border-tertiary-fixed-dim bg-primary/10 dark:bg-primary/20 scale-[0.99] font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                  title={isCollapsed ? 'Usuários' : ''}
                >
                  <span className={`material-symbols-outlined ${isActive('/usuarios') ? 'text-primary' : ''}`}>admin_panel_settings</span>
                  {!isCollapsed && <span className="whitespace-nowrap flex-1">Usuários</span>}
                  
                  {isAdmin && !isCollapsed && (
                    <div 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsUsuariosExpanded(!isUsuariosExpanded)
                      }}
                      className="p-1 hover:bg-slate-300/30 dark:hover:bg-white/10 rounded-md transition-all cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${
                        isUsuariosExpanded ? 'rotate-180' : ''
                      }`}>
                        expand_more
                      </span>
                    </div>
                  )}
                </Link>

                {isAdmin && !isCollapsed && isUsuariosExpanded && (
                   <Link 
                     to="/usuarios/gestao-acessos"
                     className={`ml-9 flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                       location.pathname === '/usuarios/gestao-acessos'
                         ? 'text-primary bg-primary/10'
                         : 'text-slate-500 hover:text-primary dark:hover:text-white hover:bg-white/5'
                     }`}
                   >
                     <span className="material-symbols-outlined text-[16px]">security</span>
                     GESTÃO DE PERFIS
                   </Link>
                )}
              </div>
            )}

            <button
              onClick={handleLogout}
              title={isCollapsed ? 'Sair' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-error font-body text-sm font-semibold rounded-xl hover:bg-error/10 dark:hover:bg-error/20`}
            >
              <span className="material-symbols-outlined">logout</span> 
              {!isCollapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

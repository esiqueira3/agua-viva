import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SideNavBar({ isCollapsed }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }
  
  const navItems = [
    { name: 'Início', path: '/home', icon: 'home' },
    { name: 'Departamentos', path: '/departamentos', icon: 'account_tree' },
    { name: 'Membros', path: '/membros', icon: 'person_add' },
    { name: 'Igrejas', path: '/igrejas', icon: 'church' },
    { name: 'Locais', path: '/locais', icon: 'location_on' },
    { name: 'Eventos', path: '/eventos', icon: 'theater_comedy' },
    { name: 'Calendário', path: '/calendario', icon: 'calendar_month' }
  ]

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
          <nav className="space-y-2 px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-200 rounded-xl ${
                  isActive(item.path)
                    ? 'text-primary border-l-4 border-tertiary-fixed-dim bg-primary-fixed/50 scale-[0.99] font-bold'
                    : 'text-slate-500 hover:text-primary hover:bg-surface-container-low'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <span className={`material-symbols-outlined ${isActive(item.path) ? 'text-primary' : ''}`}>
                   {item.icon}
                </span>
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto px-3 space-y-1 pt-6 shrink-0">
            <Link
              to="/configuracoes"
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-200 rounded-xl ${
                isActive('/configuracoes')
                  ? 'text-primary border-l-4 border-tertiary-fixed-dim bg-primary-fixed/50 scale-[0.99] font-bold'
                  : 'text-slate-500 hover:text-primary hover:bg-surface-container-low'
              }`}
              title={isCollapsed ? 'Configurações' : ''}
            >
              <span className={`material-symbols-outlined ${isActive('/configuracoes') ? 'text-primary' : ''}`}>settings</span>
              {!isCollapsed && <span className="whitespace-nowrap">Configurações</span>}
            </Link>
            <Link
              to="/usuarios"
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 font-body text-sm font-semibold transition-all duration-200 rounded-xl ${
                isActive('/usuarios') || location.pathname.includes('/usuarios')
                  ? 'text-primary border-l-4 border-tertiary-fixed-dim bg-primary-fixed/50 scale-[0.99] font-bold'
                  : 'text-slate-500 hover:text-primary hover:bg-surface-container-low'
              }`}
              title={isCollapsed ? 'Controle de Acesso' : ''}
            >
              <span className={`material-symbols-outlined ${isActive('/usuarios') || location.pathname.includes('/usuarios') ? 'text-primary' : ''}`}>admin_panel_settings</span>
              {!isCollapsed && <span className="whitespace-nowrap">Controle de Acesso</span>}
            </Link>
            <button
              onClick={handleLogout}
              title={isCollapsed ? 'Sair' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-slate-500 hover:text-error font-body text-sm font-semibold rounded-xl hover:bg-error/10`}
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

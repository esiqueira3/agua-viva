import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import SideNavBar from './SideNavBar'
import TopNavBar from './TopNavBar'
import TermoAceiteModal from '../TermoAceiteModal'
import { usePermissions } from '../../context/PermissionsContext'

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768)
  const [showReadOnlyTermo, setShowReadOnlyTermo] = useState(false)
  const { userAceite, loading, user } = usePermissions()

  return (
    <div className="flex bg-slate-100 dark:bg-background min-h-screen overflow-hidden">
      {/* Bloqueio por Termo de Aceite (Primeiro acesso) */}
      {!userAceite && !loading && user && <TermoAceiteModal />}

      {/* Visualização de Termos (Via Rodapé) */}
      {showReadOnlyTermo && <TermoAceiteModal readOnly={true} onClose={() => setShowReadOnlyTermo(false)} />}

      <SideNavBar isCollapsed={isCollapsed} />
      
      {/* Overlay Mobile */}
      {!isCollapsed && (
        <div 
           className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
           onClick={() => setIsCollapsed(true)}
        />
      )}

      <main className={`${isCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'} transition-all duration-300 flex-1 flex flex-col w-full min-w-0`}>
        <TopNavBar toggleSidebar={() => setIsCollapsed(!isCollapsed)} isCollapsed={isCollapsed} />
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">
          <Outlet />
        </div>
        <footer className="px-8 py-6 border-t border-outline-variant/5 grid grid-cols-1 md:grid-cols-3 items-center gap-4 mt-auto">
          {/* Espaçador Esquerdo para centralização perfeita */}
          <div className="hidden md:block"></div>

          <div className="text-center">
            <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] select-none">
              Avadora System ® - 2026
            </p>
          </div>

          <div className="text-center md:text-right">
            <button 
              onClick={() => setShowReadOnlyTermo(true)}
              className="text-[10px] font-black text-primary/40 hover:text-primary uppercase tracking-[0.1em] transition-colors"
            >
              Termo de Uso
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}

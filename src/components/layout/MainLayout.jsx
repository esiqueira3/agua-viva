import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import SideNavBar from './SideNavBar'
import TopNavBar from './TopNavBar'
import TermoAceiteModal from '../TermoAceiteModal'
import { usePermissions } from '../../context/PermissionsContext'

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768)
  const { userAceite, loading, user } = usePermissions()

  return (
    <div className="flex bg-slate-100 dark:bg-background min-h-screen overflow-hidden">
      {/* Bloqueio por Termo de Aceite */}
      {!userAceite && !loading && user && <TermoAceiteModal />}

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
      </main>
    </div>
  )
}

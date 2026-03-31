import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import SideNavBar from './SideNavBar'
import TopNavBar from './TopNavBar'

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768)

  return (
    <div className="flex bg-background min-h-screen overflow-hidden">
      <SideNavBar isCollapsed={isCollapsed} />
      
      {/* Overlay Mobile */}
      {!isCollapsed && (
        <div 
           className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
           onClick={() => setIsCollapsed(true)}
        />
      )}

      <main className={`${isCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'} transition-all duration-300 flex-1 flex flex-col w-full`}>
        <TopNavBar toggleSidebar={() => setIsCollapsed(!isCollapsed)} isCollapsed={isCollapsed} />
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

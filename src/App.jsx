import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Departamentos from './pages/Departamentos'
import CadastroDepartamento from './pages/CadastroDepartamento'
import Membros from './pages/Membros'
import CadastroMembro from './pages/CadastroMembro'
import Locais from './pages/Locais'
import CadastroLocal from './pages/CadastroLocal'
import Igrejas from './pages/Igrejas'
import CadastroIgreja from './pages/CadastroIgreja'
import Eventos from './pages/Eventos'
import CadastroEvento from './pages/CadastroEvento'
import Calendario from './pages/Calendario'
import Configuracoes from './pages/Configuracoes'
import Usuarios from './pages/Usuarios'
import CadastroUsuario from './pages/CadastroUsuario'
import InscricaoEvento from './pages/InscricaoEvento'
import FinanceiroEventos from './pages/FinanceiroEventos'
import ConfigMercadoPago from './pages/ConfigMercadoPago'
import MembrosPreCadastro from './pages/MembrosPreCadastro'
import LinkPublicoMembros from './pages/LinkPublicoMembros'
import InscricaoMembro from './pages/InscricaoMembro'
import CertificadosHome from './pages/CertificadosHome'
import CertificadoApresentacao from './pages/CertificadoApresentacao'
import CertificadoBatismo from './pages/CertificadoBatismo'
import GestaoAcessos from './pages/GestaoAcessos'
import CalendarioPublico from './pages/CalendarioPublico'
import Obrigado from './pages/Obrigado'
import { useEffect } from 'react'

import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PermissionsProvider } from './context/PermissionsContext'

function App() {
  // Restaura o Dark Mode global na inicialização garantindo persistência sem piscar
  // Exceção: páginas públicas sempre ficam em modo claro
  useEffect(() => {
    const publicPaths = ['/agenda', '/inscrever', '/obrigado', '/inscricao/']
    const isPublicPage = publicPaths.some(p => window.location.pathname.startsWith(p))
    
    if (isPublicPage) {
      document.documentElement.classList.remove('dark')
      return
    }

    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
       document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <PermissionsProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Dashboard />} />
          
          <Route path="/departamentos" element={<ProtectedRoute permission="menu_departamentos"><Departamentos /></ProtectedRoute>} />
          <Route path="/departamentos/novo" element={<ProtectedRoute permission="menu_departamentos"><CadastroDepartamento /></ProtectedRoute>} />
          <Route path="/departamentos/editar/:id" element={<ProtectedRoute permission="menu_departamentos"><CadastroDepartamento /></ProtectedRoute>} />
          
          <Route path="/membros" element={<ProtectedRoute permission="menu_membros"><Membros /></ProtectedRoute>} />
          <Route path="/membros/novo" element={<ProtectedRoute permission="menu_membros"><CadastroMembro /></ProtectedRoute>} />
          <Route path="/membros/editar/:id" element={<ProtectedRoute permission="menu_membros"><CadastroMembro /></ProtectedRoute>} />
          <Route path="/membros/pre-cadastro" element={<ProtectedRoute permission="menu_membros_pre_cadastro"><MembrosPreCadastro /></ProtectedRoute>} />
          <Route path="/membros/link-publico" element={<ProtectedRoute permission="menu_membros_link"><LinkPublicoMembros /></ProtectedRoute>} />
          <Route path="/membros/certificados" element={<ProtectedRoute permission="menu_membros_certificados"><CertificadosHome /></ProtectedRoute>} />
          <Route path="/membros/certificados/apresentacao" element={<ProtectedRoute permission="menu_membros_certificados"><CertificadoApresentacao /></ProtectedRoute>} />
          <Route path="/membros/certificados/batismo" element={<ProtectedRoute permission="menu_membros_certificados"><CertificadoBatismo /></ProtectedRoute>} />
          
          <Route path="/usuarios" element={<ProtectedRoute permission="menu_usuarios"><Usuarios /></ProtectedRoute>} />
          <Route path="/usuarios/novo" element={<ProtectedRoute permission="menu_usuarios"><CadastroUsuario /></ProtectedRoute>} />
          <Route path="/usuarios/editar/:id" element={<ProtectedRoute permission="menu_usuarios"><CadastroUsuario /></ProtectedRoute>} />
          <Route path="/usuarios/gestao-acessos" element={<ProtectedRoute permission="all"><GestaoAcessos /></ProtectedRoute>} />

          <Route path="/locais" element={<ProtectedRoute permission="menu_locais"><Locais /></ProtectedRoute>} />
          <Route path="/locais/novo" element={<ProtectedRoute permission="menu_locais"><CadastroLocal /></ProtectedRoute>} />
          <Route path="/locais/editar/:id" element={<ProtectedRoute permission="menu_locais"><CadastroLocal /></ProtectedRoute>} />
          
          <Route path="/igrejas" element={<ProtectedRoute permission="menu_igrejas"><Igrejas /></ProtectedRoute>} />
          <Route path="/igrejas/novo" element={<ProtectedRoute permission="menu_igrejas"><CadastroIgreja /></ProtectedRoute>} />
          <Route path="/igrejas/editar/:id" element={<ProtectedRoute permission="menu_igrejas"><CadastroIgreja /></ProtectedRoute>} />
          
          <Route path="/eventos" element={<ProtectedRoute permission="menu_eventos"><Eventos /></ProtectedRoute>} />
          <Route path="/eventos/novo" element={<ProtectedRoute permission="menu_eventos"><CadastroEvento /></ProtectedRoute>} />
          <Route path="/eventos/editar/:id" element={<ProtectedRoute permission="menu_eventos"><CadastroEvento /></ProtectedRoute>} />
          
          <Route path="/calendario" element={<ProtectedRoute permission="menu_calendario"><Calendario /></ProtectedRoute>} />
          <Route path="/financeiro-eventos" element={<ProtectedRoute permission="menu_financeiro"><FinanceiroEventos /></ProtectedRoute>} />
          <Route path="/financeiro/mercado-pago" element={<ProtectedRoute permission="menu_financeiro_mp"><ConfigMercadoPago /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute permission="menu_configuracoes"><Configuracoes /></ProtectedRoute>} />
        </Route>
        
        {/* Rotas Públicas */}
        <Route path="/inscricao/:id" element={<InscricaoEvento />} />
        <Route path="/inscrever" element={<InscricaoMembro />} />
        <Route path="/agenda" element={<CalendarioPublico />} />
        <Route path="/obrigado" element={<Obrigado />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </PermissionsProvider>
)
}

export default App

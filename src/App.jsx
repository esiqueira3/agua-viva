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
import { useEffect } from 'react'

function App() {
  // Restaura o Dark Mode global na inicialização garantindo persistência sem piscar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
       document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Dashboard />} />
          
          <Route path="/departamentos" element={<Departamentos />} />
          <Route path="/departamentos/novo" element={<CadastroDepartamento />} />
          <Route path="/departamentos/editar/:id" element={<CadastroDepartamento />} />
          
          <Route path="/membros" element={<Membros />} />
          <Route path="/membros/novo" element={<CadastroMembro />} />
          <Route path="/membros/editar/:id" element={<CadastroMembro />} />
          <Route path="/membros/pre-cadastro" element={<MembrosPreCadastro />} />
          <Route path="/membros/link-publico" element={<LinkPublicoMembros />} />
          <Route path="/membros/certificados" element={<CertificadosHome />} />
          <Route path="/membros/certificados/apresentacao" element={<CertificadoApresentacao />} />
          <Route path="/membros/certificados/batismo" element={<CertificadoBatismo />} />
          
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/usuarios/novo" element={<CadastroUsuario />} />
          <Route path="/usuarios/editar/:id" element={<CadastroUsuario />} />

          <Route path="/locais" element={<Locais />} />
          <Route path="/locais/novo" element={<CadastroLocal />} />
          <Route path="/locais/editar/:id" element={<CadastroLocal />} />
          
          <Route path="/igrejas" element={<Igrejas />} />
          <Route path="/igrejas/novo" element={<CadastroIgreja />} />
          <Route path="/igrejas/editar/:id" element={<CadastroIgreja />} />
          
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/eventos/novo" element={<CadastroEvento />} />
          <Route path="/eventos/editar/:id" element={<CadastroEvento />} />
          
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/financeiro-eventos" element={<FinanceiroEventos />} />
          <Route path="/financeiro/mercado-pago" element={<ConfigMercadoPago />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
        
        {/* Rotas Públicas */}
        <Route path="/inscricao/:id" element={<InscricaoEvento />} />
        <Route path="/inscrever" element={<InscricaoMembro />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

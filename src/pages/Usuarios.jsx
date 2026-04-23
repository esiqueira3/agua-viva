import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { ControlBar } from '../components/ui/ControlBar'
import { Pagination } from '../components/ui/Pagination'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../context/PermissionsContext'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('usuarios_view_mode') || 'grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const navigate = useNavigate()
  const { startImpersonation, user: currentUser } = usePermissions()

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    localStorage.setItem('usuarios_view_mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    async function fetchUsuarios() {
      const { data, error } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error && data) setUsuarios(data)
      setLoading(false)
    }
    fetchUsuarios()
  }, [])

  const handleDelete = async (row) => {
    if(window.confirm(`ATENÇÃO: Você está cortando o acesso de ${row.nome} ao sistema.\n\nO E-mail ${row.email} não conseguirá mais efetuar login ou receber códigos OTP.\n\nConfirmar bloqueio e exclusão de ficha?`)) {
      setLoading(true)
      const { error } = await supabase.from('usuarios_sistema').delete().eq('id', row.id)
      
      if (error) {
        alert("❌ Erro ao excluir do banco de dados:\n\n" + error.message)
        setLoading(false)
      } else {
        setUsuarios(prev => prev.filter(u => u.id !== row.id))
        setLoading(false)
        alert("✅ Usuário excluído com sucesso!")
      }
    }
  }

  const handleToggleStatus = async (row) => {
    const newStatus = !row.status
    const { error } = await supabase.from('usuarios_sistema').update({ status: newStatus }).eq('id', row.id)
    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === row.id ? { ...u, status: newStatus } : u))
    } else {
      alert("❌ Erro ao alterar status:\n\n" + error.message)
    }
  }

  const getPerfilBadge = (perfil) => {
    const p = (perfil || '').toLowerCase()
    if (p === 'administrador') return 'bg-violet-900 text-white border-violet-950 shadow-md shadow-violet-900/20'
    if (p === 'liderança') return 'bg-pink-500 text-white border-pink-600 shadow-md shadow-pink-500/20'
    if (p === 'secretaria') return 'bg-blue-50 text-blue-700 border-blue-200/60'
    if (p === 'financeiro') return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
  }

  const columns = [
    { label: 'Colaborador', key: 'nome', render: (row) => (
       <div className="py-1">
         <p className="font-black text-primary text-sm tracking-tight leading-tight mb-1">{row.nome}</p>
         <p className={`text-[9px] px-2.5 py-1 rounded-lg inline-block font-black uppercase tracking-[0.08em] border transition-all duration-300 ${getPerfilBadge(row.perfil)}`}>
           {row.perfil || 'Usuário'}
         </p>
       </div>
    )},
    { label: 'E-mail Integrado', key: 'email', render: (row) => (
       <div className="py-1">
         <span className="text-on-surface-variant font-semibold text-xs">{row.email}</span>
         <div className="flex items-center gap-1.5 mt-1.5 text-green-600/80">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <p className="text-[9px] font-bold uppercase tracking-widest">Autenticador Ativo</p>
         </div>
       </div>
    )},
    { label: 'Contato', key: 'telefone', render: (row) => <span className="font-mono text-xs text-on-surface">{row.telefone || 'Não Informado'}</span> },
    { label: 'Aceite', key: 'data_aceite', render: (row) => (
       <div className="py-1">
         {row.aceite_termo ? (
           <div className="flex flex-col">
             <div className="flex items-center gap-1 text-green-600 mb-0.5">
                <span className="material-symbols-outlined text-[14px] font-bold">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Aceito</span>
             </div>
             <span className="text-[9px] font-bold text-on-surface-variant/60">
                {row.data_aceite ? new Date(row.data_aceite).toLocaleString('pt-BR') : '--'}
             </span>
           </div>
         ) : (
           <div className="flex items-center gap-1 text-amber-500">
              <span className="material-symbols-outlined text-[14px] font-bold">history</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
           </div>
         )}
       </div>
    )},
    { label: 'Status', key: 'status', render: (row) => (
      <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" className="sr-only peer" checked={row.status} onChange={() => handleToggleStatus(row)} />
        <div className="w-9 h-5 bg-outline-variant/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
        <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex gap-1 items-center">
          {row.status ? 'Ativo' : 'Inativo'}
        </span>
      </label>
    )},
    { label: 'Simular', key: 'impersonate', render: (row) => (
       <button 
         onClick={() => row.email !== currentUser?.email && startImpersonation(row.email)}
         disabled={row.email === currentUser?.email}
         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${
           row.email === currentUser?.email 
             ? 'opacity-20 grayscale cursor-not-allowed' 
             : 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95'
         }`}
         title="Simular Acesso deste Usuário"
       >
         <span className="material-symbols-outlined text-[16px]">visibility</span>
         Simular
       </button>
    )}
  ]

  const filteredUsuarios = usuarios.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.perfil?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title="Controle de Acessos" 
        description="Gestão de painel e e-mails oficiais de membros da equipe (Whitelist)."
        icon="admin_panel_settings"
        buttonLabel="Novo Usuário"
        buttonLink="/usuarios/novo"
      />

      <ControlBar 
        searchPlaceholder="Buscar colaboradores..."
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFiltersClick={() => alert("Filtros em breve!")}
      />
      
      {loading ? (
        <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span></div>
      ) : viewMode === 'list' ? (
        <Table columns={columns} data={paginatedUsuarios} onDelete={handleDelete} onEdit={(row) => navigate(`/usuarios/editar/${row.id}`)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {paginatedUsuarios.map(u => {
             const initials = (u.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
             return (
                <div key={u.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                   {/* HEADER DO CARD */}
                   <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/10 ${getPerfilBadge(u.perfil)}`}>
                            {initials}
                         </div>
                         <div>
                            <h3 className="font-black text-on-surface tracking-tight uppercase text-sm leading-tight">{u.nome}</h3>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{u.perfil || 'Usuário'}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-1">
                         <button onClick={() => navigate(`/usuarios/editar/${u.id}`)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                            <span className="material-symbols-outlined text-lg">edit</span>
                         </button>
                         <button onClick={() => handleDelete(u)} className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all">
                            <span className="material-symbols-outlined text-lg">delete</span>
                         </button>
                         {u.email !== currentUser?.email && (
                            <button 
                              onClick={() => startImpersonation(u.email)} 
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                              title="Simular Acesso"
                            >
                               <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                         )}
                      </div>
                   </div>

                   {/* INFO DE CONTATO */}
                   <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                         <span className="material-symbols-outlined text-primary text-lg">alternate_email</span>
                         <span className="text-xs font-bold text-on-surface-variant truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                         <span className="material-symbols-outlined text-primary text-lg">phone_iphone</span>
                         <span className="text-xs font-bold text-on-surface-variant font-mono">{u.telefone || 'Sem telefone'}</span>
                      </div>
                   </div>

                   {/* STATUS DE ACEITE (RESPONSIVO MODO FINANCEIRO) */}
                   <div className="pt-4 border-t border-outline-variant/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Aceite do Termo</p>
                         {u.aceite_termo ? (
                            <div className="text-right">
                               <div className="flex items-center gap-1 text-green-600 justify-end">
                                  <span className="material-symbols-outlined text-[14px] font-bold">check_circle</span>
                                  <span className="text-[10px] font-black uppercase tracking-widest">Concluído</span>
                                </div>
                               <p className="text-[9px] font-bold text-on-surface-variant/40">{u.data_aceite ? new Date(u.data_aceite).toLocaleString('pt-BR') : '--'}</p>
                            </div>
                         ) : (
                            <div className="flex items-center gap-1 text-amber-500">
                               <span className="material-symbols-outlined text-[14px] font-bold">pending</span>
                               <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
                            </div>
                         )}
                      </div>

                      <div className="flex items-center justify-between bg-surface-container-highest/20 p-3 rounded-2xl border border-outline-variant/10">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${u.status ? 'text-green-600' : 'text-on-surface-variant/40'}`}>
                            {u.status ? 'Conta Ativa' : 'Conta Inativa'}
                         </span>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={u.status} onChange={() => handleToggleStatus(u)} />
                            <div className="w-9 h-5 bg-outline-variant/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                         </label>
                      </div>
                   </div>
                </div>
             )
          })}
        </div>
      )}

      {!loading && (
        <Pagination 
          totalItems={filteredUsuarios.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}


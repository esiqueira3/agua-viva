import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
    )}
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Controle de Acessos" 
        description="Gestão de painel e e-mails oficiais de membros da equipe (Whitelist)."
        icon="admin_panel_settings"
        buttonLabel="Novo"
        buttonLink="/usuarios/novo"
      />
      
      {loading ? (
        <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span></div>
      ) : (
        <Table columns={columns} data={usuarios} onDelete={handleDelete} onEdit={(row) => navigate(`/usuarios/editar/${row.id}`)} />
      )}
    </div>
  )
}

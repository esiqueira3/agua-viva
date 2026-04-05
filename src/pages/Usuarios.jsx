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

  const columns = [
    { label: 'Colaborador', key: 'nome', render: (row) => (
       <div>
         <p className="font-bold text-primary">{row.nome}</p>
         <p className="text-[10px] text-tertiary-fixed-dim bg-tertiary-container/50 px-2 py-0.5 rounded inline-block mt-1 font-black uppercase tracking-widest">{row.perfil || 'Usuário'}</p>
       </div>
    )},
    { label: 'E-mail Integrado', key: 'email', render: (row) => (
       <div>
         <span className="text-on-surface-variant font-medium">{row.email}</span>
         <p className="text-[9px] text-green-600/80 font-bold uppercase tracking-widest mt-1">✓ Autenticador Ativo</p>
       </div>
    )},
    { label: 'Contato', key: 'telefone', render: (row) => <span className="font-mono text-xs text-on-surface">{row.telefone || 'Não Informado'}</span> },
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

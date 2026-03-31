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
      await supabase.from('usuarios_sistema').delete().eq('id', row.id)
      setUsuarios(prev => prev.filter(u => u.id !== row.id))
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

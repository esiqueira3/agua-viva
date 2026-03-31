import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Membros() {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchMembros() {
      const { data, error } = await supabase
        .from('membros')
        .select(`
          id, nome_completo, telefone_principal, email, matricula, status, tipo_membro,
          departamentos ( nome )
        `)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setMembros(data)
      }
      setLoading(false)
    }
    fetchMembros()
  }, [])

  const handleDelete = async (row) => {
    if(window.confirm(`Tem certeza que deseja excluir o membro: ${row.nome_completo}?`)) {
      await supabase.from('membros').delete().eq('id', row.id)
      setMembros(prev => prev.filter(m => m.id !== row.id))
    }
  }

  const handleToggleStatus = async (row) => {
    const newStatus = !row.status
    const { error } = await supabase.from('membros').update({ status: newStatus }).eq('id', row.id)
    if (!error) {
      setMembros(prev => prev.map(m => m.id === row.id ? { ...m, status: newStatus } : m))
    } else {
      alert("❌ Erro ao alterar status:\n\n" + error.message)
    }
  }

  const columns = [
    { label: 'Matrícula', key: 'matricula', render: (row) => <span className="font-mono text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded">{row.matricula}</span> },
    { label: 'Nome', key: 'nome_completo', render: (row) => <span className="font-bold text-primary">{row.nome_completo}</span> },
    { label: 'Tipo', key: 'tipo_membro', render: (row) => <span className="text-xs font-semibold uppercase">{row.tipo_membro}</span> },
    { label: 'Departamento', key: 'departamento', render: (row) => row.departamentos?.nome || '-' },
    { label: 'Contato', key: 'telefone_principal', render: (row) => <span className="text-secondary tracking-wider text-sm">{row.telefone_principal}</span> },
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
        title="Membros" 
        description="Cadastro dos membros da igreja."
        icon="groups"
        buttonLabel="Novo"
        buttonLink="/membros/novo"
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
           <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : (
        <Table 
          columns={columns} 
          data={membros} 
          onDelete={handleDelete}
          onEdit={(row) => navigate(`/membros/editar/${row.id}`)}
        />
      )}
    </div>
  )
}

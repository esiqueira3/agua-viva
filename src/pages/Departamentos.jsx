import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchDepartamentos() {
      const { data, error } = await supabase
        .from('departamentos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setDepartamentos(data)
      }
      setLoading(false)
    }
    fetchDepartamentos()
  }, [])

  const handleDelete = async (row) => {
    if(window.confirm(`Tem certeza que deseja excluir o departamento: ${row.nome}?`)) {
      await supabase.from('departamentos').delete().eq('id', row.id)
      setDepartamentos(prev => prev.filter(d => d.id !== row.id))
    }
  }

  const handleToggleStatus = async (row) => {
    const newStatus = !row.status
    const { error } = await supabase.from('departamentos').update({ status: newStatus }).eq('id', row.id)
    if (!error) {
      setDepartamentos(prev => prev.map(m => m.id === row.id ? { ...m, status: newStatus } : m))
    } else {
      alert("❌ Erro ao alterar status:\n\n" + error.message)
    }
  }

  const columns = [
    { label: 'Nome', key: 'nome', render: (row) => <span className="font-bold text-primary">{row.nome}</span> },
    { label: 'Tipo', key: 'tipo_departamento', render: (row) => <span className="bg-surface-container text-primary text-[10px] uppercase font-bold px-2 py-1 rounded">{row.tipo_departamento}</span> },
    { label: 'Público', key: 'publico_alvo' },
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
        title="Departamentos" 
        description="Gestão das áreas e congregações da sua igreja."
        icon="account_tree"
        buttonLabel="Novo"
        buttonLink="/departamentos/novo"
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
           <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : (
        <Table 
          columns={columns} 
          data={departamentos} 
          onDelete={handleDelete}
          onEdit={(row) => navigate(`/departamentos/editar/${row.id}`)}
        />
      )}
    </div>
  )
}

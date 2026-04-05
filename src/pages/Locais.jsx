import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Locais() {
  const [locais, setLocais] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchLocais() {
      const { data, error } = await supabase
        .from('locais')
        .select('*')
        .order('codigo', { ascending: true })
      
      if (!error && data) setLocais(data)
      setLoading(false)
    }
    fetchLocais()
  }, [])

  const handleDelete = async (row) => {
    if(window.confirm(`Tem certeza que deseja excluir o local: ${row.descricao}?`)) {
      setLoading(true)
      const { error } = await supabase.from('locais').delete().eq('id', row.id)
      
      if (error) {
        alert("❌ Erro ao excluir do banco de dados:\n\n" + error.message)
        setLoading(false)
      } else {
        setLocais(prev => prev.filter(m => m.id !== row.id))
        setLoading(false)
        alert("✅ Local excluído com sucesso!")
      }
    }
  }

  const handleToggleStatus = async (row) => {
    const newStatus = !row.status
    const { error } = await supabase.from('locais').update({ status: newStatus }).eq('id', row.id)
    if (!error) {
      setLocais(prev => prev.map(m => m.id === row.id ? { ...m, status: newStatus } : m))
    } else {
      alert("❌ Erro ao alterar status:\n\n" + error.message)
    }
  }

  const columns = [
    { label: 'Código', key: 'codigo', render: (row) => <span className="font-mono text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded">{row.codigo || 'S/N'}</span> },
    { label: 'Descrição / Nome do Espaço', key: 'descricao', render: (row) => <span className="font-bold text-primary">{row.descricao}</span> },
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
        title="Locais e Salas" 
        description="Gerencie os auditórios e salas de estudo onde rolam os eventos."
        icon="location_on"
        buttonLabel="Novo"
        buttonLink="/locais/novo"
      />
      
      {loading ? (
        <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span></div>
      ) : (
        <Table columns={columns} data={locais} onDelete={handleDelete} onEdit={(row) => navigate(`/locais/editar/${row.id}`)} />
      )}
    </div>
  )
}

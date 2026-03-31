import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Igrejas() {
  const [igrejas, setIgrejas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchIgrejas() {
      const { data, error } = await supabase
        .from('igrejas')
        .select('*, matriz:matriz_id(descricao)')
        .order('created_at', { ascending: false })
      
      if (error) {
         setLoading(false)
         alert("❌ Ocorreu um erro na busca:\n\n" + error.message)
         return
      }
      
      if (data) setIgrejas(data)
      setLoading(false)
    }
    fetchIgrejas()
  }, [])

  const handleDelete = async (row) => {
    if(window.confirm(`Tem certeza que deseja excluir a igreja: ${row.descricao}?`)) {
      await supabase.from('igrejas').delete().eq('id', row.id)
      setIgrejas(prev => prev.filter(m => m.id !== row.id))
    }
  }

  const handleToggleStatus = async (row) => {
    const newStatus = !row.status
    const { error } = await supabase.from('igrejas').update({ status: newStatus }).eq('id', row.id)
    if (!error) {
      setIgrejas(prev => prev.map(m => m.id === row.id ? { ...m, status: newStatus } : m))
    } else {
      alert("❌ Erro ao alterar status:\n\n" + error.message)
    }
  }

  const columns = [
    { label: 'Unidade', key: 'codigo', render: (row) => <span className="font-mono text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded">{row.codigo || 'S/N'}</span> },
    { label: 'Nome', key: 'descricao', render: (row) => <span className="font-bold text-primary">{row.descricao}</span> },
    { label: 'Tipo', key: 'is_filial', render: (row) => row.is_filial ? <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded uppercase">Filial</span> : <span className="bg-tertiary-fixed text-tertiary-container text-xs font-bold px-2 py-1 rounded uppercase">Matriz SEDE</span>},
    { label: 'Vinculação (Matriz)', key: 'matriz', render: (row) => row.matriz?.descricao || '-' },
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
        title="Igrejas / Filiais" 
        description="Gestão da sede e da arvore hierárquica ministerial."
        icon="church"
        buttonLabel="Novo"
        buttonLink="/igrejas/novo"
      />
      
      {loading ? (
        <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span></div>
      ) : (
        <Table columns={columns} data={igrejas} onDelete={handleDelete} onEdit={(row) => navigate(`/igrejas/editar/${row.id}`)} />
      )}
    </div>
  )
}

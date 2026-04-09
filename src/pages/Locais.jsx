import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { ControlBar } from '../components/ui/ControlBar'
import { Pagination } from '../components/ui/Pagination'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Locais() {
  const [locais, setLocais] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('locais_view_mode') || 'list')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const navigate = useNavigate()

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    localStorage.setItem('locais_view_mode', viewMode)
  }, [viewMode])

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

  const filteredLocais = locais.filter(l => 
    l.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedLocais = filteredLocais.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-1">
      <PageHeader 
        title="Locais e Salas" 
        description="Gerencie os auditórios e salas de estudo onde rolam os eventos."
        icon="location_on"
        buttonLabel="Novo"
        buttonLink="/locais/novo"
      />

      <ControlBar 
        searchPlaceholder="Buscar locais ou salas..."
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFiltersClick={() => alert("Filtros em breve!")}
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
          <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : viewMode === 'list' ? (
        <Table columns={columns} data={paginatedLocais} onDelete={handleDelete} onEdit={(row) => navigate(`/locais/editar/${row.id}`)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {paginatedLocais.map(local => (
              <div 
                key={local.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                 <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                 
                 <div className="relative z-10 space-y-5">
                    <div className="flex items-start justify-between">
                       <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/locais/editar/${local.id}`)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button onClick={() => handleDelete(local)} className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                       </div>
                    </div>

                    <div>
                       <p className="font-mono text-[10px] font-black text-primary/60 mb-1 uppercase tracking-tighter">
                          Código: {local.codigo || 'S/N'}
                       </p>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                          {local.descricao}
                       </h3>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={local.status} onChange={() => handleToggleStatus(local)} />
                          <div className="w-9 h-5 bg-outline-variant/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                          <span className={`ml-2 text-[10px] font-black uppercase tracking-widest ${local.status ? 'text-green-600' : 'text-slate-400'}`}>
                            {local.status ? 'Ativo' : 'Inativo'}
                          </span>
                       </label>

                       <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-sm">room_preferences</span>
                       </div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}

      {!loading && (
        <Pagination 
          totalItems={filteredLocais.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

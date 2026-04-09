import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { ControlBar } from '../components/ui/ControlBar'
import { Pagination } from '../components/ui/Pagination'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Igrejas() {
  const [igrejas, setIgrejas] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('igrejas_view_mode') || 'list')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const navigate = useNavigate()

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    localStorage.setItem('igrejas_view_mode', viewMode)
  }, [viewMode])

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
      setLoading(true)
      const { error } = await supabase.from('igrejas').delete().eq('id', row.id)
      
      if (error) {
        alert("❌ Erro ao excluir do banco de dados:\n\n" + error.message)
        setLoading(false)
      } else {
        setIgrejas(prev => prev.filter(m => m.id !== row.id))
        setLoading(false)
        alert("✅ Igreja excluída com sucesso!")
      }
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

  // Filtro de busca local
  const filteredIgrejas = igrejas.filter(i => 
    i.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedIgrejas = filteredIgrejas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Igrejas / Filiais" 
        description="Gestão da sede e da árvore hierárquica ministerial."
        icon="church"
        buttonLabel="Novo"
        buttonLink="/igrejas/novo"
      />

      <ControlBar 
        searchPlaceholder="Buscar por nome ou código..."
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFiltersClick={() => alert("Em breve: Filtros avançados!")}
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
          <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : viewMode === 'list' ? (
        <Table columns={columns} data={paginatedIgrejas} onDelete={handleDelete} onEdit={(row) => navigate(`/igrejas/editar/${row.id}`)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {paginatedIgrejas.map(igreja => (
              <div 
                key={igreja.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                 {/* Luz Ambiente Interna */}
                 <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                 
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                       <div className={`p-3 rounded-2xl bg-gradient-to-br transition-all duration-500 ${igreja.status ? 'from-primary/10 to-primary/20 text-primary' : 'from-slate-100 to-slate-200 text-slate-400'}`}>
                          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <button 
                            onClick={() => navigate(`/igrejas/editar/${igreja.id}`)}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          >
                             <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(igreja)}
                            className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                             <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                       </div>
                    </div>

                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-[9px] font-black text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded uppercase tracking-tighter">
                            {igreja.codigo || 'S/N'}
                          </p>
                          {igreja.is_filial ? (
                            <span className="bg-blue-500/10 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Filial</span>
                          ) : (
                            <span className="bg-amber-600/10 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Matriz Sede</span>
                          )}
                       </div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                          {igreja.descricao}
                       </h3>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                       <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm opacity-50">account_tree</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                             {igreja.matriz?.descricao || 'Unidade Independente'}
                          </span>
                       </div>

                       <div className="flex items-center justify-between pt-2">
                          <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="sr-only peer" checked={igreja.status} onChange={() => handleToggleStatus(igreja)} />
                            <div className="w-9 h-5 bg-outline-variant/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            <span className={`ml-2 text-[10px] font-black uppercase tracking-widest flex gap-1 items-center transition-colors ${igreja.status ? 'text-green-600' : 'text-slate-400'}`}>
                              {igreja.status ? 'Ativo' : 'Inativo'}
                            </span>
                          </label>

                          <div className="flex -space-x-1.5 opacity-40">
                             <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900" />
                             <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}

      {!loading && (
        <Pagination 
          totalItems={filteredIgrejas.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

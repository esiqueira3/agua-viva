import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { ControlBar } from '../components/ui/ControlBar'
import { Pagination } from '../components/ui/Pagination'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('departamentos_view_mode') || 'list')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const navigate = useNavigate()

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    localStorage.setItem('departamentos_view_mode', viewMode)
  }, [viewMode])

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
      setLoading(true)
      const { error } = await supabase.from('departamentos').delete().eq('id', row.id)
      
      if (error) {
        alert("❌ Erro ao excluir do banco de dados:\n\n" + error.message)
        setLoading(false)
      } else {
        setDepartamentos(prev => prev.filter(d => d.id !== row.id))
        setLoading(false)
        alert("✅ Departamento excluído com sucesso!")
      }
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
    { label: 'Nome', key: 'nome', render: (row) => (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: row.cor || '#3B82F6' }}
        />
        <span className="font-bold text-primary">{row.nome}</span>
      </div>
    )},
    { label: 'Cor', key: 'cor', render: (row) => (
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg shadow-sm border border-white/60"
          style={{ backgroundColor: row.cor || '#3B82F6' }}
        />
        <span className="font-mono text-[11px] font-bold text-on-surface-variant">
          {(row.cor || '#3B82F6').toUpperCase()}
        </span>
      </div>
    )},
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

  const filteredDepartamentos = departamentos.filter(d => 
    d.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tipo_departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedDepartamentos = filteredDepartamentos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-1">
      <PageHeader 
        title="Departamentos" 
        description="Gestão das áreas e congregações da sua igreja."
        icon="account_tree"
        buttonLabel="Novo"
        buttonLink="/departamentos/novo"
      />

      <ControlBar 
        searchPlaceholder="Buscar departamentos..."
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
        <Table 
          columns={columns} 
          data={paginatedDepartamentos} 
          onDelete={handleDelete}
          onEdit={(row) => navigate(`/departamentos/editar/${row.id}`)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {paginatedDepartamentos.map(dept => (
              <div 
                key={dept.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                 <div 
                   className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"
                   style={{ backgroundColor: dept.cor || '#3B82F6' }}
                 />
                 
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                       <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${dept.cor || '#3B82F6'}, ${dept.cor ? dept.cor + 'dd' : '#2563EB'})` }}
                       >
                          <span className="material-symbols-outlined text-3xl">hub</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/departamentos/editar/${dept.id}`)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button onClick={() => handleDelete(dept)} className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                       </div>
                    </div>

                    <div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
                          {dept.tipo_departamento || 'Departamento'}
                       </span>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                          {dept.nome}
                       </h3>
                       <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.cor || '#3B82F6' }} />
                          <span className="font-mono text-[10px] font-bold text-on-surface-variant/40">{(dept.cor || '#3B82F6').toUpperCase()}</span>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                       <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm opacity-50">groups</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                             Público: {dept.publico_alvo || 'Geral'}
                          </span>
                       </div>

                       <div className="flex items-center justify-between pt-1">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={dept.status} onChange={() => handleToggleStatus(dept)} />
                            <div className="w-9 h-5 bg-outline-variant/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            <span className={`ml-2 text-[10px] font-black uppercase tracking-widest ${dept.status ? 'text-green-600' : 'text-slate-400'}`}>
                              {dept.status ? 'Ativo' : 'Inativo'}
                            </span>
                          </label>
                       </div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}

      {!loading && (
        <Pagination 
          totalItems={filteredDepartamentos.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

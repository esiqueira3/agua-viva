import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { ControlBar } from '../components/ui/ControlBar'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Membros() {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterFaixaEtaria, setFilterFaixaEtaria] = useState('')
  const [filterEscolaridade, setFilterEscolaridade] = useState('')
  const [filterCPF, setFilterCPF] = useState('')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('membros_view_mode') || 'list')
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem('membros_view_mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    async function fetchMembros() {
      const { data, error } = await supabase
        .from('membros')
        .select(`
          id, nome_completo, telefone_principal, email, matricula, status, tipo_membro,
          idade, faixa_etaria, escolaridade, cpf, departamentos ( nome )
        `)
        .order('nome_completo', { ascending: true })
      
      if (!error && data) {
        setMembros(data)
      }
      setLoading(false)
    }
    fetchMembros()
  }, [])

  // Lógica de Filtragem (Computed)
  const membrosFiltrados = membros.filter(m => {
    const matchesNome = m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === '' || m.tipo_membro === filterTipo
    const matchesFaixa = filterFaixaEtaria === '' || m.faixa_etaria === filterFaixaEtaria
    const matchesEscolaridade = filterEscolaridade === '' || m.escolaridade === filterEscolaridade
    const matchesCPF = filterCPF === '' || (m.cpf && m.cpf.replace(/\D/g, '').includes(filterCPF.replace(/\D/g, '')))
    return matchesNome && matchesTipo && matchesFaixa && matchesEscolaridade && matchesCPF
  })

  const handleDelete = async (row) => {
    if(window.confirm(`Tem certeza que deseja excluir o membro: ${row.nome_completo}?`)) {
      setLoading(true)
      const { error } = await supabase.from('membros').delete().eq('id', row.id)
      
      if (error) {
        alert("❌ Erro ao excluir do banco de dados:\n\n" + error.message)
        setLoading(false)
      } else {
        setMembros(prev => prev.filter(m => m.id !== row.id))
        setLoading(false)
        alert("✅ Membro excluído com sucesso!")
      }
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
    { label: 'Perfil', key: 'faixa_etaria', render: (row) => (
      <div className="flex flex-col">
        <span className="text-xs font-black text-on-surface-variant leading-none">{row.faixa_etaria || '-'}</span>
        <span className="text-[10px] font-bold text-tertiary-fixed-dim italic">{row.idade ? `${row.idade} anos` : ''}</span>
      </div>
    )},
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

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterTipo('')
    setFilterFaixaEtaria('')
    setFilterEscolaridade('')
    setFilterCPF('')
  }

  const hasActiveFilters = searchTerm || filterTipo || filterFaixaEtaria || filterEscolaridade || filterCPF

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        buttonLabel="Novo"
        buttonLink="/membros/novo"
      />

      <ControlBar 
        searchPlaceholder="Buscar membros por nome..."
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showFilters={true}
        onFiltersClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
      >
        <div className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 whitespace-nowrap">
           {membrosFiltrados.length} MEMBROS
        </div>
      </ControlBar>

      {/* GAVETA DE FILTROS AVANÇADOS */}
      {showFiltersDrawer && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4 duration-500 mb-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">filter_alt</span>
              Filtros Avançados
            </h4>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Membro</label>
              <select 
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs"
              >
                <option value="">Todos</option>
                <option value="Membro">Membro</option>
                <option value="Congregado">Congregado</option>
                <option value="Afastado">Afastado</option>
                <option value="Visitante">Visitante</option>
                <option value="Pastor">Pastor</option>
                <option value="Pastor Presidente">Pastor Presidente</option>
                <option value="Vice Presidente">Vice Presidente</option>
                <option value="Diretoria">Diretoria</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Faixa Etária</label>
              <select 
                value={filterFaixaEtaria}
                onChange={(e) => setFilterFaixaEtaria(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs"
              >
                <option value="">Todas</option>
                <option value="Criança">Criança (0-11 anos)</option>
                <option value="Adolescente">Adolescente (12-17 anos)</option>
                <option value="Jovem">Jovem (18-29 anos)</option>
                <option value="Adulto">Adulto (30-59 anos)</option>
                <option value="Idoso(a)">Idoso(a) (60+)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Escolaridade</label>
              <select 
                value={filterEscolaridade}
                onChange={(e) => setFilterEscolaridade(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs"
              >
                <option value="">Todas</option>
                <option value="Educação Infantil">Educação Infantil</option>
                <option value="Ensino Fundamental">Ensino Fundamental</option>
                <option value="Ensino Médio">Ensino Médio</option>
                <option value="Ensino Superior - Tecnólogo">Superior - Tecnólogo</option>
                <option value="Ensino Superior - Licenciatura">Superior - Licenciatura</option>
                <option value="Ensino Superior - Bacharelado">Superior - Bacharelado</option>
                <option value="Ensino Superior - Especialização (Pós-graduação / MBA)">Especialização</option>
                <option value="Ensino Superior - Mestrado">Mestrado</option>
                <option value="Ensino Superior - Doutorado">Doutorado</option>
                <option value="Ensino Superior - PhD">PhD</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
              <input 
                type="text" 
                placeholder="000.000.000-00" 
                value={filterCPF}
                onChange={(e) => setFilterCPF(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs"
              />
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center p-12">
           <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : viewMode === 'list' ? (
        <Table 
          columns={columns} 
          data={membrosFiltrados} 
          onDelete={handleDelete}
          onEdit={(row) => navigate(`/membros/editar/${row.id}`)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
           {membrosFiltrados.map(membro => (
              <div 
                key={membro.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden"
              >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
                 
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="relative">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br transition-all duration-500 ${membro.status ? 'from-primary to-primary-fixed-dim' : 'from-slate-300 to-slate-400'}`}>
                             <span className="material-symbols-outlined text-3xl">person</span>
                          </div>
                          {membro.status && (
                             <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[10px] text-white font-black">check</span>
                             </div>
                          )}
                       </div>
                       <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/membros/editar/${membro.id}`)} className="p-2.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(membro)} className="p-2.5 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                       </div>
                    </div>

                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                             {membro.matricula || 'SEM MATRIC.'}
                          </span>
                          <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                             {membro.tipo_membro || 'Membro'}
                          </span>
                       </div>
                       <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate group-hover:text-primary transition-colors">
                          {membro.nome_completo}
                       </h3>
                       <p className="text-[11px] font-bold text-slate-400 leading-none mt-1">
                          {membro.faixa_etaria} • {membro.idade ? `${membro.idade} anos` : 'Idade não inf.'}
                       </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                       <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm opacity-50">hub</span>
                          <span className="text-[11px] font-bold truncate">{membro.departamentos?.nome || 'Sem Departamento'}</span>
                       </div>
                       <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm opacity-50">call</span>
                          <span className="text-[11px] font-bold tracking-wider">{membro.telefone_principal || 'Sem Telefone'}</span>
                       </div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  )
}

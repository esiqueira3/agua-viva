import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Membros() {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterFaixaEtaria, setFilterFaixaEtaria] = useState('')
  const [filterEscolaridade, setFilterEscolaridade] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchMembros() {
      const { data, error } = await supabase
        .from('membros')
        .select(`
          id, nome_completo, telefone_principal, email, matricula, status, tipo_membro,
          idade, faixa_etaria, escolaridade, departamentos ( nome )
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
    return matchesNome && matchesTipo && matchesFaixa && matchesEscolaridade
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
  }

  const hasActiveFilters = searchTerm || filterTipo || filterFaixaEtaria || filterEscolaridade

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Membros" 
        description="Cadastro dos membros da igreja."
        icon="groups"
        buttonLabel="Novo"
        buttonLink="/membros/novo"
      />

      {/* BARRA DE FILTROS */}
      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-4 shadow-sm">
        {/* Linha 1: busca + tipo */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1 flex-1 w-full">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Buscar por Nome</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-xl">search</span>
              <input 
                type="text" 
                placeholder="Ex: João Silva..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:placeholder-slate-400 border border-outline-variant/30 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-52">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Tipo de Membro</label>
            <select 
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600 border border-outline-variant/30 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-on-surface"
            >
              <option value="">Todos os Tipos</option>
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
        </div>

        {/* Linha 2: Faixa Etária + Escolaridade + Totalizador */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1 w-full md:w-52">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">
              <span className="material-symbols-outlined text-[12px] align-middle mr-1">person</span>
              Faixa Etária
            </label>
            <select 
              value={filterFaixaEtaria}
              onChange={(e) => setFilterFaixaEtaria(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600 border border-outline-variant/30 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-on-surface"
            >
              <option value="">Todas as Faixas</option>
              <option value="Criança">Criança (0-11 anos)</option>
              <option value="Adolescente">Adolescente (12-17 anos)</option>
              <option value="Jovem">Jovem (18-29 anos)</option>
              <option value="Adulto">Adulto (30-59 anos)</option>
              <option value="Idoso(a)">Idoso(a) (60+)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 w-full">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">
              <span className="material-symbols-outlined text-[12px] align-middle mr-1">school</span>
              Escolaridade
            </label>
            <select 
              value={filterEscolaridade}
              onChange={(e) => setFilterEscolaridade(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600 border border-outline-variant/30 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-on-surface"
            >
              <option value="">Todas as Escolaridades</option>
              <option value="Educação Infantil">Educação Infantil</option>
              <option value="Ensino Fundamental">Ensino Fundamental</option>
              <option value="Ensino Médio">Ensino Médio</option>
              <option value="Ensino Superior - Tecnólogo">Superior - Tecnólogo</option>
              <option value="Ensino Superior - Licenciatura">Superior - Licenciatura</option>
              <option value="Ensino Superior - Bacharelado">Superior - Bacharelado</option>
              <option value="Ensino Superior - Especialização (Pós-graduação / MBA)">Especialização (Pós-Grad / MBA)</option>
              <option value="Ensino Superior - Mestrado">Mestrado</option>
              <option value="Ensino Superior - Doutorado">Doutorado</option>
              <option value="Ensino Superior - PhD">PhD</option>
              <option value="Nenhum">Nenhum</option>
            </select>
          </div>
          <div className="flex items-end gap-3 shrink-0">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2.5 rounded-lg transition-colors border border-red-200"
              >
                <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                Limpar
              </button>
            )}
            <div className="text-[10px] font-black text-on-surface-variant/40 uppercase bg-surface-container-lowest px-3 py-3 rounded-lg border border-outline-variant/10 whitespace-nowrap">
              {membrosFiltrados.length} resultado{membrosFiltrados.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
           <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : (
        <Table 
          columns={columns} 
          data={membrosFiltrados} 
          onDelete={handleDelete}
          onEdit={(row) => navigate(`/membros/editar/${row.id}`)}
        />
      )}
    </div>
  )
}

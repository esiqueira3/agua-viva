import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEventos() {
      const { data, error } = await supabase
        .from('eventos')
        .select(`
          id, nome, data_evento, hora_evento, status, pago,
          departamentos ( nome ), locais ( descricao )
        `)
        .order('data_evento', { ascending: true })
      
      if (!error && data) setEventos(data)
      setLoading(false)
    }
    fetchEventos()
  }, [])

  const handleDelete = async (row) => {
    if(window.confirm(`Cancelar e Excluir o evento: ${row.nome}?`)) {
      setLoading(true)
      const { error } = await supabase.from('eventos').delete().eq('id', row.id)
      
      if (error) {
        alert("❌ Erro ao excluir do banco de dados:\n\n" + error.message)
        setLoading(false)
      } else {
        setEventos(prev => prev.filter(m => m.id !== row.id))
        setLoading(false)
        alert("✅ Evento excluído com sucesso!")
      }
    }
  }

  const copyInscricaoLink = (id) => {
    const url = `${window.location.origin}/inscricao/${id}`
    navigator.clipboard.writeText(url)
    alert("✅ Link de Inscrição copiado para a área de transferência!")
  }

  // Faróis PRD
  const getStatusBadge = (status) => {
    const map = {
      'Agendado': { color: 'bg-blue-100 text-blue-700', farol: '🔵' },
      'Confirmado': { color: 'bg-green-100 text-green-700', farol: '🟢' },
      'Cancelado': { color: 'bg-red-100 text-red-700', farol: '🔴' },
      'Concluído': { color: 'bg-slate-100 text-slate-700', farol: '✅' },
    }
    const st = map[status] || map['Agendado']
    return <span className={`${st.color} px-2 py-1 text-xs font-bold rounded uppercase whitespace-nowrap`}>{st.farol} {status}</span>
  }

  const columns = [
    { label: 'Data', key: 'data_evento', render: (row) => {
        const d = new Date(row.data_evento + 'T00:00:00')
        return <span className="font-bold text-on-surface-variant text-xs">{d.toLocaleDateString('pt-BR')}</span>
    }},
    { label: 'Hora', key: 'hora_evento', render: (row) => <span className="font-mono text-xs">{row.hora_evento.substring(0,5)}</span> },
    { label: 'Nome do Evento', key: 'nome', render: (row) => <span className="font-bold text-primary">{row.nome}</span> },
    { label: 'Local', key: 'local', render: (row) => row.locais?.descricao || '-' },
    { label: 'Setor', key: 'departamentos', render: (row) => row.departamentos?.nome || '-' },
    { label: 'Status', key: 'status', render: (row) => getStatusBadge(row.status) },
    { label: 'Ações Rápidas', key: 'actions', render: (row) => (
       <div className="flex items-center gap-2">
          {row.pago && (
            <>
              <button onClick={() => copyInscricaoLink(row.id)} title="Copiar Link de Inscrição" className="p-2 rounded-lg bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all">
                 <span className="material-symbols-outlined text-[18px]">link</span>
              </button>
              <button onClick={() => navigate('/financeiro-eventos')} title="Ver Financeiro" className="p-2 rounded-lg bg-surface-container-high text-tertiary-fixed-dim hover:bg-tertiary-fixed-dim hover:text-white transition-all">
                 <span className="material-symbols-outlined text-[18px]">monetization_on</span>
              </button>
            </>
          )}
       </div>
    )}
  ]

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-1">
      <PageHeader 
        title="Gestão de Eventos" 
        description="Cronograma das atividades oficiais da igreja."
        icon="theater_comedy"
        buttonLabel="Novo"
        buttonLink="/eventos/novo"
      />
      
      {loading ? (
        <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span></div>
      ) : (
        <Table columns={columns} data={eventos} onDelete={handleDelete} onEdit={(row) => navigate(`/eventos/editar/${row.id}`)} />
      )}
    </div>
  )
}

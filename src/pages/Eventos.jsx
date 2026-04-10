import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Table } from '../components/ui/Table'
import { ControlBar } from '../components/ui/ControlBar'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../context/PermissionsContext'

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('eventos_view_mode') || 'list')
  const [searchTerm, setSearchTerm] = useState('')
  const [qrModalData, setQrModalData] = useState(null) // Novo estado para o QR Code
  const navigate = useNavigate()
  const { canAccess, membroId, meusDepartamentos, isAdmin, loading: loadingPermissions } = usePermissions()

  useEffect(() => {
    async function fetchEventos() {
      setLoading(true)
      let query = supabase
        .from('eventos')
        .select(`
          id, nome, data_evento, data_fim, hora_evento, status, pago,
          departamentos ( id, nome ), locais ( descricao ),
          lider_responsavel_id
        `)

      // APLICAÇÃO DO FILTRO DE SEGURANÇA (RBAC)
      if (canAccess('menu_eventos_filtro_lider') && !isAdmin) {
        // O líder vê eventos onde ele é o responsável OU do departamento dele
        const filters = []
        if (membroId) filters.push(`lider_responsavel_id.eq.${membroId}`)
        if (meusDepartamentos.length > 0) {
          filters.push(`departamento_id.in.(${meusDepartamentos.join(',')})`)
        }

        if (filters.length > 0) {
          query = query.or(filters.join(','))
        } else {
          // Se é líder mas não tem nada vinculado, não vê nada (proteção contra "buraco")
          setEventos([])
          setLoading(false)
          return
        }
      }

      const { data, error } = await query.order('data_evento', { ascending: true })
      
      if (!error && data) {
        setEventos(data)
      } else if (error) {
        console.error("Erro ao buscar eventos:", error)
      }
      setLoading(false)
    }
    
    // Aguarda o carregamento inicial do contexto de permissões
    if (!loadingPermissions) {
       fetchEventos()
    }
  }, [membroId, isAdmin, meusDepartamentos, loadingPermissions])

  useEffect(() => {
    localStorage.setItem('eventos_view_mode', viewMode)
  }, [viewMode])

  const filteredEventos = (eventos || []).filter(e => 
    e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.locais?.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.departamentos?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        const dstart = new Date(row.data_evento + 'T00:00:00')
        const dfim = row.data_fim ? new Date(row.data_fim + 'T00:00:00') : null
        
        if (dfim && row.data_fim !== row.data_evento) {
           return (
             <div className="flex flex-col">
                <span className="font-bold text-primary text-[10px] uppercase tracking-tighter">Intervalo</span>
                <span className="font-bold text-on-surface-variant text-xs">
                   {dstart.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} a {dfim.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                </span>
             </div>
           )
        }
        return <span className="font-bold text-on-surface-variant text-xs">{dstart.toLocaleDateString('pt-BR')}</span>
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
              <button 
                onClick={() => setQrModalData({ id: row.id, nome: row.nome })} 
                title="Ver QR Code de Inscrição" 
                className="p-2 rounded-lg bg-surface-container-high text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
              >
                 <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
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

      <ControlBar 
        searchPlaceholder="Buscar eventos, locais ou setores..."
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFiltersClick={() => alert("Filtros em breve!")}
      />
      
      {loading ? (
        <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span></div>
      ) : viewMode === 'list' ? (
        <Table columns={columns} data={filteredEventos} onDelete={handleDelete} onEdit={(row) => navigate(`/eventos/editar/${row.id}`)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
           {filteredEventos.map(evento => {
              const dstart = new Date(evento.data_evento + 'T00:00:00')
              const statusInfo = {
                'Agendado': { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'calendar_today' },
                'Confirmado': { color: 'text-green-600', bg: 'bg-green-50', icon: 'check_circle' },
                'Cancelado': { color: 'text-red-600', bg: 'bg-red-50', icon: 'cancel' },
                'Concluído': { color: 'text-slate-600', bg: 'bg-slate-100', icon: 'task_alt' },
              }[evento.status] || { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'calendar_today' }

              return (
                <div 
                  key={evento.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden relative"
                >
                   <div className={`absolute top-0 right-0 w-32 h-32 ${statusInfo.bg} opacity-20 blur-3xl rounded-full -mr-16 -mt-16`} />
                   
                   <div className="relative z-10 space-y-4">
                      <div className="flex items-start justify-between">
                         <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                            <span className="text-[10px] font-black uppercase text-primary/60">{dstart.toLocaleDateString('pt-BR', { month: 'short' }).replace('.','')}</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{dstart.getDate()}</span>
                         </div>

                         <div className="flex items-center gap-1">
                             {evento.pago && (
                               <>
                                 <button onClick={() => copyInscricaoLink(evento.id)} title="Copiar Link" className="p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-all">
                                    <span className="material-symbols-outlined text-[18px]">link</span>
                                 </button>
                                 <button 
                                   onClick={() => setQrModalData({ id: evento.id, nome: evento.nome })} 
                                   title="Ver QR Code" 
                                   className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                 >
                                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                                 </button>
                               </>
                             )}
                            <button onClick={() => navigate(`/eventos/editar/${evento.id}`)} className="p-2.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                               <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => handleDelete(evento)} className="p-2.5 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                               <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                         </div>
                      </div>

                      <div>
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} text-[9px] font-black uppercase tracking-widest mb-2`}>
                            <span className="material-symbols-outlined text-xs">{statusInfo.icon}</span>
                            {evento.status}
                         </div>
                         <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">
                            {evento.nome}
                         </h3>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Onde</p>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                               <span className="material-symbols-outlined text-sm">location_on</span>
                               <span className="text-[11px] font-bold truncate">{evento.locais?.descricao || '-'}</span>
                            </div>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Setor</p>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                               <span className="material-symbols-outlined text-sm">hub</span>
                               <span className="text-[11px] font-bold truncate">{evento.departamentos?.nome || '-'}</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                         <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {evento.hora_evento.substring(0,5)}h
                         </div>
                         {evento.pago && (
                           <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-[9px] font-black">
                              <span className="material-symbols-outlined text-xs">payments</span>
                              PAGO
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              )
           })}
        </div>
      )}

       {/* Modal do QR Code */}
       {qrModalData && (
         <div 
           className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
           onClick={() => setQrModalData(null)}
         >
           <div 
             className="bg-white rounded-[2.5rem] max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
             onClick={e => e.stopPropagation()}
           >
             <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-2xl font-bold">qr_code_2</span>
                   <h3 className="font-extrabold text-lg uppercase tracking-tight">QR Code de Inscrição</h3>
                </div>
                <button 
                  onClick={() => setQrModalData(null)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
             </div>

             <div className="p-10 flex flex-col items-center space-y-6">
                <div className="text-center space-y-1">
                   <h4 className="text-slate-900 font-black text-xl leading-tight">{qrModalData.nome}</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aponte a câmera para se inscrever</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-100 shadow-inner">
                   <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/inscricao/' + qrModalData.id)}`} 
                      alt="QR Code"
                      className="w-48 h-48 rounded-xl"
                   />
                </div>

                <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-3">
                   <button 
                     onClick={() => {
                        const url = `${window.location.origin}/inscricao/${qrModalData.id}`;
                        navigator.clipboard.writeText(url);
                        alert("✅ Link de Inscrição copiado!");
                     }}
                     className="w-full py-4 bg-slate-100 hover:bg-primary/10 text-slate-600 hover:text-primary rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                   >
                      <span className="material-symbols-outlined text-sm">link</span>
                      Copiar Link Direto
                   </button>
                   <button 
                     onClick={() => setQrModalData(null)}
                     className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20"
                   >
                      Fechar
                   </button>
                </div>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}

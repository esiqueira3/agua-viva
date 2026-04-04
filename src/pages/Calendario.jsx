import { useState, useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG = {
  'Agendado':   { color: '#3B82F6', icon: 'schedule',       badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Confirmado': { color: '#10B981', icon: 'check_circle',    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'Cancelado':  { color: '#EF4444', icon: 'cancel',          badge: 'bg-red-100 text-red-700 border-red-200' },
  'Concluído':  { color: '#94A3B8', icon: 'task_alt',        badge: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export default function Calendario() {
  const [allEvents, setAllEvents] = useState([])    // todos os eventos brutos
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [filterStatus, setFilterStatus] = useState('') // '' = todos
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEventos() {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, departamentos ( tipo_departamento, publico_alvo, cor ), locais ( descricao )')
      
      if (error) {
         console.error("Erro calendário:", error)
         setLoading(false)
         return
      }

      if (data) {
         const palette = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#14B8A6', '#F97316', '#6366F1']
         
         const fcEvents = data.flatMap(ev => {
            const hash = ev.id ? String(ev.id).charCodeAt(0) + String(ev.id).charCodeAt(ev.id.length - 1) : 0
            const colorIndex = hash % palette.length
            const isConcluido = ev.status === 'Concluído'
            const isCancelado = ev.status === 'Cancelado'
            
            // Prioridade: cor do departamento > cor do status > paleta aleatória
            let bgColor = ev.departamentos?.cor || STATUS_CONFIG[ev.status]?.color || palette[colorIndex]
            
            const results = []
            const [y, m, d] = ev.data_evento.split('-')
            const baseDate = new Date(y, m - 1, d)
            const freq = ev.frequencia || 'nao_repetir'

            let limit = 1
            if (freq === 'diario') limit = 365
            if (freq === 'semanal') limit = 52
            if (freq === 'mensal') limit = 24
            if (freq === 'anual') limit = 5

            for (let i = 0; i < limit; i++) {
               const loopDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
               
               if (freq === 'diario') loopDate.setDate(loopDate.getDate() + i)
               if (freq === 'semanal') loopDate.setDate(loopDate.getDate() + (i * 7))
               if (freq === 'mensal') loopDate.setMonth(loopDate.getMonth() + i)
               if (freq === 'anual') loopDate.setFullYear(loopDate.getFullYear() + i)

               const yyyy = loopDate.getFullYear()
               const mm = String(loopDate.getMonth() + 1).padStart(2, '0')
               const dd = String(loopDate.getDate()).padStart(2, '0')
               const formattedDate = `${yyyy}-${mm}-${dd}`
               const dtStart = ev.hora_evento ? `${formattedDate}T${ev.hora_evento}` : formattedDate
               const horaLabel = ev.hora_evento ? ev.hora_evento.substring(0, 5) : ''

               results.push({
                  id: `${ev.id}_${i}`,
                  title: horaLabel ? `${horaLabel} ${ev.nome}` : ev.nome,
                  start: dtStart,
                  backgroundColor: bgColor,
                  borderColor: 'transparent',
                  textColor: '#FFFFFF',
                  display: 'block',
                  classNames: [
                    ...(isConcluido || isCancelado ? ['fc-event-faded'] : []),
                    ...(isConcluido ? ['fc-event-concluido'] : []),
                  ],
                  extendedProps: { 
                     status: ev.status,
                     nome_original: ev.nome,
                     data_formatada: `${dd}/${mm}/${yyyy}`,
                     hora_formatada: ev.hora_evento ? ev.hora_evento.substring(0,5) : 'O dia todo',
                     local: ev.locais?.descricao || 'Local não informado',
                     original_id: ev.id,
                     link_inscricao: ev.link_inscricao,
                     link_pagamento_mp: ev.link_pagamento_mp,
                     pago: ev.pago,
                     mostrar_link_calendario: ev.mostrar_link_calendario !== false
                  }
               })
            }
            return results
         })
         setAllEvents(fcEvents)
      }
      setLoading(false)
    }
    fetchEventos()
  }, [])

  // Filtragem reativa por status
  const filteredEvents = useMemo(() => {
    if (!filterStatus) return allEvents
    return allEvents.filter(e => e.extendedProps.status === filterStatus)
  }, [allEvents, filterStatus])

  // Estatísticas do mês atual
  const stats = useMemo(() => {
    const now = new Date()
    const mesAtual = now.getMonth()
    const anoAtual = now.getFullYear()
    const doMes = allEvents.filter(e => {
      const d = new Date(e.start)
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
    })
    const s = { total: 0, Agendado: 0, Confirmado: 0, Concluído: 0, Cancelado: 0 }
    doMes.forEach(e => {
      const status = e.extendedProps.status
      s.total++
      if (s[status] !== undefined) s[status]++
    })
    return s
  }, [allEvents])

  const handleDateClick = () => navigate('/eventos/novo')

  const handleEventClick = (arg) => {
    if (arg.event.extendedProps.status === 'Concluído') return
    setSelectedEvent(arg.event)
  }

  const statusCount = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key, cfg, count: stats[key] || 0
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      <PageHeader 
        title="Calendário Eclesiástico" 
        description="Acompanhe todas as programações mensais e semanais organizadas por departamento."
        icon="calendar_month"
      />

      {/* BARRA DE ESTATÍSTICAS + FILTROS */}
      {!loading && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Estatísticas do mês */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 mr-2">Este mês:</span>
              <span className="text-[11px] font-black text-on-surface bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/20">
                {stats.total} evento{stats.total !== 1 ? 's' : ''}
              </span>
              {statusCount.filter(s => s.count > 0).map(({ key, cfg, count }) => (
                <span key={key} className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.badge} flex items-center gap-1`}>
                  <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
                  {count} {key}
                </span>
              ))}
            </div>

            {/* Filtros por status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Filtrar:</span>
              <button
                onClick={() => setFilterStatus('')}
                className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all ${
                  !filterStatus
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-white dark:bg-slate-800 text-on-surface-variant border-outline-variant/30 hover:border-primary/40 hover:text-primary'
                }`}
              >
                Todos
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                  className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                    filterStatus === key
                      ? 'text-white border-transparent shadow-md'
                      : 'bg-white dark:bg-slate-800 text-on-surface-variant border-outline-variant/30 hover:text-on-surface'
                  }`}
                  style={filterStatus === key ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
                >
                  <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl">refresh</span>
          <p className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Carregando eventos...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden custom-calendar">
           <FullCalendar
             plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
             initialView="dayGridMonth"
             headerToolbar={{
               left: 'prev,next today',
               center: 'title',
               right: 'dayGridMonth,timeGridWeek,timeGridDay'
             }}
             locale="pt-br"
             buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
             }}
             events={filteredEvents}
             dateClick={handleDateClick}
             eventClick={handleEventClick}
             height="auto"
             dayMaxEvents={3}
             moreLinkText={(n) => `+${n} mais`}
             displayEventTime={false}
             eventClassNames={(arg) => {
               const status = arg.event.extendedProps.status
               if (status === 'Concluído' || status === 'Cancelado') {
                 return ['cursor-default', 'opacity-50']
               }
               return ['cursor-pointer']
             }}
           />
        </div>
      )}

      {/* LEGENDA */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Legenda:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cfg.color }} />
              <span className="text-[10px] font-bold text-on-surface-variant">{key}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2 border-l border-outline-variant/20 pl-3">
            <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50">touch_app</span>
            <span className="text-[10px] font-bold text-on-surface-variant/50">Clique em um dia para criar evento</span>
          </div>
        </div>
      )}

      {/* MODAL */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelectedEvent(null)}
        >
           <div
             className="bg-surface-container-lowest w-full max-w-sm rounded-[28px] shadow-2xl relative overflow-hidden"
             onClick={e => e.stopPropagation()}
           >
             {/* Faixa colorida no topo */}
             <div
               className="h-2 w-full"
               style={{ backgroundColor: STATUS_CONFIG[selectedEvent.extendedProps.status]?.color || '#3B82F6' }}
             />

             <div className="p-6">
               <button onClick={() => setSelectedEvent(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-red-50 hover:text-red-500 transition-colors">
                 <span className="material-symbols-outlined text-[18px]">close</span>
               </button>
               
               {/* Título + status */}
               <div className="flex items-start gap-3 mt-1 mb-5 pr-8">
                 <div
                   className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm mt-0.5"
                   style={{ backgroundColor: STATUS_CONFIG[selectedEvent.extendedProps.status]?.color || '#3B82F6' }}
                 >
                   <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                     {STATUS_CONFIG[selectedEvent.extendedProps.status]?.icon || 'event'}
                   </span>
                 </div>
                 <div>
                   <h3 className="font-black text-xl leading-tight text-on-surface">
                     {selectedEvent.extendedProps.nome_original}
                   </h3>
                   <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border mt-1 inline-block ${STATUS_CONFIG[selectedEvent.extendedProps.status]?.badge}`}>
                     {selectedEvent.extendedProps.status}
                   </span>
                 </div>
               </div>

               {/* Infos */}
               <div className="space-y-2">
                 <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl">
                   <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                   <div>
                     <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Data e Hora</p>
                     <p className="font-bold text-on-surface text-sm">{selectedEvent.extendedProps.data_formatada} • {selectedEvent.extendedProps.hora_formatada}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl">
                   <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                   <div>
                     <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Local</p>
                     <p className="font-bold text-on-surface text-sm line-clamp-2">{selectedEvent.extendedProps.local}</p>
                   </div>
                 </div>
               </div>

               {/* Ações */}
               <div className="mt-5 flex flex-col gap-2">
                 {selectedEvent.extendedProps.mostrar_link_calendario &&
                  (selectedEvent.extendedProps.link_inscricao || selectedEvent.extendedProps.link_pagamento_mp || selectedEvent.extendedProps.pago) && (
                   <button 
                     onClick={() => {
                       const link = selectedEvent.extendedProps.link_inscricao || 
                                    selectedEvent.extendedProps.link_pagamento_mp || 
                                    `${window.location.origin}/inscricao/${selectedEvent.extendedProps.original_id}`
                       if (link.startsWith('http')) {
                         window.open(link, '_blank')
                       } else {
                         navigate(`/inscricao/${selectedEvent.extendedProps.original_id}`)
                       }
                     }}
                     className="w-full px-6 py-3.5 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 animate-pulse-glow"
                     style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)' }}
                   >
                     <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                       {selectedEvent.extendedProps.pago ? 'payments' : 'link'}
                     </span>
                     {selectedEvent.extendedProps.pago ? 'REALIZAR INSCRIÇÃO' : 'LINK DE INSCRIÇÃO'}
                   </button>
                 )}

                 <div className="flex gap-2">
                   <button
                     onClick={() => navigate(`/eventos/editar/${selectedEvent.extendedProps.original_id}`)}
                     className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wide text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
                   >
                     <span className="material-symbols-outlined text-[16px]">edit</span>
                     Editar
                   </button>
                   <button
                     onClick={() => setSelectedEvent(null)}
                     className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wide text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors"
                   >
                     Fechar
                   </button>
                 </div>
               </div>
             </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%   { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
        .animate-pulse-glow { animation: pulse-glow 1.8s infinite; }

        .fc-event-concluido { cursor: default !important; }

        /* Toolbar */
        .custom-calendar .fc-toolbar { padding: 20px 20px 10px; }
        .custom-calendar .fc-toolbar-title {
          font-family: 'Manrope', sans-serif;
          font-weight: 900;
          font-size: 1.25rem;
          color: #011549;
          text-transform: uppercase;
          letter-spacing: -0.02em;
        }
        .dark .custom-calendar .fc-toolbar-title {
          color: #b5c4ff;
        }

        .custom-calendar .fc-button {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 11px;
          border-radius: 8px !important;
          padding: 6px 14px !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none !important;
          transition: all 0.15s ease;
        }
        .custom-calendar .fc-button-primary {
          background-color: #011549 !important;
          color: white !important;
        }
        .dark .custom-calendar .fc-button-primary {
          background-color: #1e293b !important;
        }

        .custom-calendar .fc-button-primary:hover {
          background-color: #1e3a8a !important;
          transform: translateY(-1px);
        }
        .dark .custom-calendar .fc-button-primary:hover {
          background-color: #334155 !important;
        }

        .custom-calendar .fc-button-active,
        .custom-calendar .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #e6c364 !important;
          color: #241a00 !important;
        }

        /* Grade */
        .custom-calendar .fc-theme-standard .fc-scrollgrid { border: none; }
        .custom-calendar .fc-theme-standard td, 
        .custom-calendar .fc-theme-standard th { border-color: rgba(0,0,0,0.06); }
        .dark .custom-calendar .fc-theme-standard td,
        .dark .custom-calendar .fc-theme-standard th { border-color: rgba(255,255,255,0.1); }

        .custom-calendar .fc-col-header-cell { 
          padding: 10px 0 !important;
          background: #f8fafc;
        }
        .dark .custom-calendar .fc-col-header-cell {
          background: #1e293b;
        }

        .custom-calendar .fc-col-header-cell-cushion {
          font-family: 'Manrope', sans-serif;
          font-weight: 900;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #64748b;
          text-decoration: none !important;
        }
        .dark .custom-calendar .fc-col-header-cell-cushion {
          color: #94a3b8;
        }

        /* Número do dia */
        .custom-calendar .fc-daygrid-day-number {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 12px;
          color: #334155;
          text-decoration: none !important;
          padding: 6px 8px;
        }
        .dark .custom-calendar .fc-daygrid-day-number {
          color: #cbd5e1;
        }

        .custom-calendar .fc-day-today { background: rgba(1, 21, 73, 0.04) !important; }
        .dark .custom-calendar .fc-day-today { background: rgba(181, 196, 255, 0.05) !important; }

        .custom-calendar .fc-day-today .fc-daygrid-day-number {
          background-color: #011549;
          color: white;
          border-radius: 8px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dark .custom-calendar .fc-day-today .fc-daygrid-day-number {
          background-color: #b5c4ff;
          color: #011549;
        }

        .custom-calendar .fc-day:hover { background: rgba(1, 21, 73, 0.02) !important; }
        .dark .custom-calendar .fc-day:hover { background: rgba(255, 255, 255, 0.03) !important; }

        /* Eventos */
        .custom-calendar .fc-event {
          cursor: pointer;
          border-radius: 6px !important;
          padding: 1px 6px !important;
          font-family: 'Manrope', sans-serif;
          font-size: 10px !important;
          font-weight: 800 !important;
          border: none !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .custom-calendar .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .custom-calendar .fc-event-faded { opacity: 0.45 !important; }
        .custom-calendar .fc-more-link {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 10px;
          color: #011549;
          background: rgba(1,21,73,0.06);
          padding: 1px 6px;
          border-radius: 4px;
          text-decoration: none !important;
        }
        .dark .custom-calendar .fc-more-link {
          color: #b5c4ff;
          background: rgba(181,196,255,0.1);
        }
        .custom-calendar .fc-more-link:hover { background: rgba(1,21,73,0.12); }
        .dark .custom-calendar .fc-more-link:hover { background: rgba(181,196,255,0.2); }
      `}</style>
    </div>
  )
}

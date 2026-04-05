import { useState, useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG = {
  'Agendado':   { color: '#3B82F6', icon: 'schedule',       badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Confirmado': { color: '#10B981', icon: 'check_circle',    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'Cancelado':  { color: '#EF4444', icon: 'cancel',          badge: 'bg-red-100 text-red-700 border-red-200' },
  'Concluído':  { color: '#94A3B8', icon: 'task_alt',        badge: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export default function CalendarioPublico() {
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEventos() {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, departamentos ( tipo_departamento, publico_alvo, cor ), locais ( descricao )')
      
      if (error) {
         console.error("Erro calendário público:", error)
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
               
               let dtEnd = dtStart
               if (freq === 'nao_repetir' && ev.data_fim && ev.data_fim !== ev.data_evento) {
                  const endDateObj = new Date(ev.data_fim.split('-')[0], ev.data_fim.split('-')[1] - 1, ev.data_fim.split('-')[2])
                  endDateObj.setDate(endDateObj.getDate() + 1)
                  const ey = endDateObj.getFullYear()
                  const em = String(endDateObj.getMonth() + 1).padStart(2, '0')
                  const ed = String(endDateObj.getDate()).padStart(2, '0')
                  dtEnd = `${ey}-${em}-${ed}`
               }

               const horaLabel = ev.hora_evento ? ev.hora_evento.substring(0, 5) : ''

               results.push({
                  id: `${ev.id}_${i}`,
                  title: horaLabel ? `${horaLabel} ${ev.nome}` : ev.nome,
                  start: dtStart,
                  end: dtEnd !== dtStart ? dtEnd : undefined,
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
                     data_formatada: ev.data_fim && ev.data_fim !== ev.data_evento 
                        ? `${dd}/${mm}/${yyyy} a ${ev.data_fim.split('-')[2]}/${ev.data_fim.split('-')[1]}/${ev.data_fim.split('-')[0]}`
                        : `${dd}/${mm}/${yyyy}`,
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

  const filteredEvents = useMemo(() => {
    if (!filterStatus) return allEvents
    return allEvents.filter(e => e.extendedProps.status === filterStatus)
  }, [allEvents, filterStatus])

  const handleEventClick = (arg) => {
    setSelectedEvent(arg.event)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors">
      
      {/* HEADER SIMPLIFICADO */}
      <header className="bg-white dark:bg-slate-900 border-b border-outline-variant/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-[60] shadow-sm">
         <div className="flex items-center gap-4">
            <img src="/logo.png" className="h-10 dark:hidden" alt="Logo" />
            <img src="/logo_branco.png" className="h-10 hidden dark:block" alt="Logo" />
            <div className="h-8 w-[1px] bg-outline-variant/20 hidden md:block" />
            <div>
               <h1 className="text-lg font-black text-primary leading-none uppercase tracking-tighter">Agenda Água Viva</h1>
               <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">Calendário da Comunidade</p>
            </div>
         </div>
         
         <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">new_releases</span>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.1em]">Eventos • Programações • Comunidade</p>
         </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* BARRA DE FILTROS */}
        {!loading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-outline-variant/10 shadow-sm p-4 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => setFilterStatus('')}
                  className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all ${
                    !filterStatus
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'bg-white dark:bg-slate-800 text-on-surface-variant border-outline-variant/20 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  TODOS OS EVENTOS
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                    className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                      filterStatus === key
                        ? 'text-white border-transparent shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
                    }`}
                    style={filterStatus === key ? { backgroundColor: cfg.color, borderColor: cfg.color, boxShadow: `0 8px 20px -6px ${cfg.color}60` } : {}}
                  >
                    <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 gap-6">
            <span className="material-symbols-outlined animate-spin text-primary text-6xl">refresh</span>
            <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">Carregando Agenda...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-outline-variant/10 shadow-xl overflow-hidden custom-calendar animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <FullCalendar
               plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
               initialView="dayGridMonth"
               headerToolbar={{
                 left: 'prev,next today',
                 center: 'title',
                 right: 'dayGridMonth,timeGridWeek'
               }}
               locale="pt-br"
               buttonText={{
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                  day: 'Dia'
               }}
               events={filteredEvents}
               eventClick={handleEventClick}
               height="auto"
               dayMaxEvents={4}
               moreLinkText={(n) => `+${n} mais`}
               displayEventTime={false}
             />
          </div>
        )}

        {/* FOOTER PÚBLICO */}
        <footer className="pt-10 pb-16 text-center space-y-4">
           <div className="flex items-center justify-center gap-3">
              <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] select-none">
                 Avadora System ® - 2026
              </p>
           </div>
           <p className="text-[9px] text-on-surface-variant/40 font-bold uppercase tracking-widest leading-loose">
              Orgulhosamente servindo à Comunidade Água Viva. <br/>
              Consulte a liderança para mais informações sobre os eventos.
           </p>
        </footer>
      </main>

      {/* MODAL DE DETALHES (Read-only) */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelectedEvent(null)}
        >
           <div
             className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
             onClick={e => e.stopPropagation()}
           >
             <div className="h-2 w-full" style={{ backgroundColor: STATUS_CONFIG[selectedEvent.extendedProps.status]?.color || '#3B82F6' }} />

             <div className="p-8">
               <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-red-50 hover:text-red-500 transition-colors">
                 <span className="material-symbols-outlined text-[18px]">close</span>
               </button>
               
               <div className="flex items-start gap-4 mt-2 mb-8 pr-8">
                 <div
                   className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white"
                   style={{ backgroundColor: STATUS_CONFIG[selectedEvent.extendedProps.status]?.color || '#3B82F6' }}
                 >
                   <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                     {STATUS_CONFIG[selectedEvent.extendedProps.status]?.icon || 'event'}
                   </span>
                 </div>
                 <div>
                   <h3 className="font-black text-xl leading-tight text-on-surface dark:text-white">
                     {selectedEvent.extendedProps.nome_original}
                   </h3>
                   <span className={`text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full border mt-2 inline-block ${STATUS_CONFIG[selectedEvent.extendedProps.status]?.badge}`}>
                     {selectedEvent.extendedProps.status}
                   </span>
                 </div>
               </div>

               <div className="space-y-3">
                 <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-outline-variant/5">
                   <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                   <div>
                     <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">Data e Hora</p>
                     <p className="font-bold text-on-surface dark:text-white text-sm">{selectedEvent.extendedProps.data_formatada} • {selectedEvent.extendedProps.hora_formatada}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-outline-variant/5">
                   <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                   <div>
                     <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">Local</p>
                     <p className="font-bold text-on-surface dark:text-white text-sm line-clamp-2">{selectedEvent.extendedProps.local}</p>
                   </div>
                 </div>
               </div>

               <div className="mt-8 flex flex-col gap-3">
                 {selectedEvent.extendedProps.mostrar_link_calendario &&
                  (selectedEvent.extendedProps.link_inscricao || selectedEvent.extendedProps.link_pagamento_mp || selectedEvent.extendedProps.pago) && (
                   <button 
                     onClick={() => {
                       const link = selectedEvent.extendedProps.link_inscricao || 
                                    selectedEvent.extendedProps.link_pagamento_mp || 
                                    `${window.location.origin}/inscricao/${selectedEvent.extendedProps.original_id}`
                       window.open(link, '_blank')
                     }}
                     className="w-full px-6 py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-3 animate-pulse-glow"
                     style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', boxShadow: '0 10px 25px -8px rgba(249, 115, 22, 0.4)' }}
                   >
                     <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                       {selectedEvent.extendedProps.pago ? 'payments' : 'how_to_reg'}
                     </span>
                     {selectedEvent.extendedProps.pago ? 'REALIZAR INSCRIÇÃO' : 'QUERO PARTICIPAR'}
                   </button>
                 )}

                 <button
                   onClick={() => setSelectedEvent(null)}
                   className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                 >
                   Fechar Detalhes
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%   { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }

        /* FullCalendar Customization */
        .custom-calendar .fc-toolbar { padding: 30px 30px 10px; }
        .custom-calendar .fc-toolbar-title {
          font-family: 'Manrope', sans-serif;
          font-weight: 900;
          font-size: 1.5rem;
          color: #011549;
          text-transform: uppercase;
          letter-spacing: -0.04em;
        }
        .dark .custom-calendar .fc-toolbar-title { color: #b5c4ff; }

        .custom-calendar .fc-button {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 11px;
          border-radius: 12px !important;
          padding: 8px 16px !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none !important;
          transition: all 0.15s ease;
        }
        .custom-calendar .fc-button-primary { background-color: #011549 !important; color: white !important; }
        .dark .custom-calendar .fc-button-primary { background-color: #1e293b !important; }
        .custom-calendar .fc-button-primary:hover { background-color: #1e3a8a !important; transform: translateY(-1px); }
        .custom-calendar .fc-button-active { background-color: #f97316 !important; color: white !important; }

        .custom-calendar .fc-theme-standard .fc-scrollgrid { border: none; }
        .custom-calendar .fc-col-header-cell { padding: 15px 0 !important; background: #f8fafc; }
        .dark .custom-calendar .fc-col-header-cell { background: #1e293b; }
        .custom-calendar .fc-col-header-cell-cushion { font-weight: 900; font-size: 11px; text-transform: uppercase; color: #64748b; text-decoration: none !important; }

        .custom-calendar .fc-daygrid-day-number { font-weight: 800; font-size: 13px; color: #334155; text-decoration: none !important; padding: 10px; }
        .dark .custom-calendar .fc-daygrid-day-number { color: #cbd5e1; }
        .custom-calendar .fc-day-today { background: rgba(1, 21, 73, 0.04) !important; }
        .custom-calendar .fc-day:hover { background: rgba(1, 21, 73, 0.02) !important; }

        .custom-calendar .fc-event {
          cursor: pointer;
          border-radius: 8px !important;
          padding: 2px 8px !important;
          font-weight: 800 !important;
          border: none !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          margin-bottom: 2px !important;
        }
        .custom-calendar .fc-event-faded { opacity: 0.5 !important; }
      `}</style>
    </div>
  )
}

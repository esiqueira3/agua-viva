import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Calendario() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEventos() {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, departamentos ( tipo_departamento, publico_alvo ), locais ( descricao )')
      
      if (error) {
         console.error("Erro calendário:", error)
         setLoading(false)
         return
      }

      if (data) {
         // Transformação para o padrão do FullCalendar com expansão de Frequência
         const fcEvents = data.flatMap(ev => {
            const palette = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#14B8A6', '#F97316', '#6366F1']
            const hash = ev.id ? String(ev.id).charCodeAt(0) + String(ev.id).charCodeAt(ev.id.length - 1) : 0
            const colorIndex = hash % palette.length
            let bgColor = palette[colorIndex]
            
            const results = []
            // Parse seguro para fuso horário local evitando pulo de dia no timezone UTC
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

               // Formata de volta para YYYY-MM-DD
               const yyyy = loopDate.getFullYear()
               const mm = String(loopDate.getMonth() + 1).padStart(2, '0')
               const dd = String(loopDate.getDate()).padStart(2, '0')
               const formattedDate = `${yyyy}-${mm}-${dd}`
               
               const dtStart = ev.hora_evento ? `${formattedDate}T${ev.hora_evento}` : formattedDate

               results.push({
                  id: `${ev.id}_${i}`, // id serializado para react
                  title: ev.nome,
                  start: dtStart,
                  backgroundColor: bgColor,
                  borderColor: bgColor,
                  textColor: '#FFFFFF',
                  display: 'block',
                  extendedProps: { 
                     status: ev.status,
                     data_formatada: `${dd}/${mm}/${yyyy}`,
                     hora_formatada: ev.hora_evento ? ev.hora_evento.substring(0,5) : 'O dia todo',
                     local: ev.locais?.descricao || 'Local não informado',
                     original_id: ev.id, // Guardamos a chave primaria real aqui
                     link_inscricao: ev.link_inscricao,
                     link_pagamento_mp: ev.link_pagamento_mp
                  }
               })
            }
            return results
         })
         setEvents(fcEvents)
      }
      setLoading(false)
    }
    fetchEventos()
  }, [])

  const handleDateClick = (arg) => {
    // Ao clicar num dia vazio, navegar para adição preenchendo (opcional via state/url)
    navigate(`/eventos/novo`)
  }

  const handleEventClick = (arg) => {
    // Intercepta e abre o Card (Modal) invés de pular direto pra Edição
    setSelectedEvent(arg.event)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title="Calendário Eclesiástico" 
        description="Acompanhe todas as programações mensais e semanais organizadas por departamento."
        icon="calendar_month"
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
           <span className="material-symbols-outlined animate-spin text-tertiary-fixed-dim text-4xl">refresh</span>
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm custom-calendar">
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
             events={events}
             dateClick={handleDateClick}
             eventClick={handleEventClick}
             height="auto"
             dayMaxEvents={false}
             displayEventTime={false}
           />
        </div>
      )}

      {/* Modal Card Mobile-friendly */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
           <div className="bg-surface-container-lowest w-full max-w-sm rounded-[32px] shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors">
               <span className="material-symbols-outlined">close</span>
             </button>
             
             <div className="flex items-start gap-4 mb-8 mt-2">
               <div className="w-2 rounded-full self-stretch min-h-[48px]" style={{backgroundColor: selectedEvent.backgroundColor}}></div>
               <div className="flex-1 pr-6">
                 <h3 className="font-headline font-extrabold text-2xl leading-tight text-primary mb-1">{selectedEvent.title}</h3>
                 <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[#E6C364] bg-[#E6C364]/10 px-2 py-0.5 rounded-md">{selectedEvent.extendedProps.status}</span>
               </div>
             </div>
             
             <div className="space-y-3">
               <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl">
                 <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary shadow-sm min-w-[48px]">
                   <span className="material-symbols-outlined">event</span>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Data e Hora</p>
                   <p className="font-bold text-on-surface text-sm">{selectedEvent.extendedProps.data_formatada} • {selectedEvent.extendedProps.hora_formatada}</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl">
                 <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary shadow-sm min-w-[48px]">
                   <span className="material-symbols-outlined">location_on</span>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Local</p>
                   <p className="font-bold text-on-surface text-sm line-clamp-2">{selectedEvent.extendedProps.local}</p>
                 </div>
               </div>
             </div>

              <div className="mt-8 flex flex-col gap-3">
                 {(selectedEvent.extendedProps.link_inscricao || selectedEvent.extendedProps.link_pagamento_mp) && (
                    <a 
                      href={selectedEvent.extendedProps.link_inscricao || selectedEvent.extendedProps.link_pagamento_mp} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full px-6 py-4 bg-orange-600 text-white shadow-lg rounded-2xl font-black active:scale-95 transition-all flex items-center justify-center gap-3 animate-pulse-glow"
                    >
                      <span className="material-symbols-outlined text-[20px]">link</span> 
                      LINK DE INSCRIÇÃO
                    </a>
                 )}
                 <div className="flex justify-between items-center gap-4">
                    <button onClick={() => navigate(`/eventos/editar/${selectedEvent.extendedProps.original_id}`)} className="flex-1 text-[11px] font-black text-on-surface-variant flex items-center justify-center gap-2 hover:text-primary transition-colors bg-outline-variant/10 px-4 py-3.5 rounded-xl uppercase tracking-tighter">
                      <span className="material-symbols-outlined text-[16px]">edit</span> Modificar Ficha
                    </button>
                    <button onClick={() => setSelectedEvent(null)} className="px-6 py-3.5 bg-surface-container-high text-on-surface rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                       Fechar
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.7); }
          50% { transform: scale(1.02); box-shadow: 0 0 20px 10px rgba(234, 88, 12, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 1.5s infinite ease-in-out;
        }

        /* Sobrescrevendo pequenos ajustes estéticos para mesclar ao Tailwind */
        .custom-calendar .fc-toolbar-title {
           font-family: 'Manrope', sans-serif;
           font-weight: 800;
           color: #011549;
        }
        .custom-calendar .fc-button-primary {
           background-color: #011549 !important;
           border-color: transparent !important;
           font-weight: bold;
           border-radius: 0.5rem;
        }
        .custom-calendar .fc-button-active {
           background-color: #e6c364 !important;
           color: #241a00 !important;
        }
        .custom-calendar .fc-event {
           cursor: pointer;
           border-radius: 4px;
           padding: 2px 4px;
           font-size: 11px;
           font-weight: bold;
           border: none !important;
        }
      `}</style>
    </div>
  )
}

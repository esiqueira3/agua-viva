import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [proximosEventos, setProximosEventos] = useState([])
  const [aniversariantes, setAniversariantes] = useState([])
  
  // Controle Tarefas Inteligentes
  const [tarefas, setTarefas] = useState([])
  const [novaTarefaTexto, setNovaTarefaTexto] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function loadDashboard() {
      const todayDate = new Date()
      const todayISO = todayDate.toISOString().split('T')[0]
      const currentMonth = todayDate.getMonth() + 1
      const currentDay = todayDate.getDate()

      // Identidade Logada
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Fetch Eventos
      const { data: evData } = await supabase
         .from('eventos')
         .select('*')
         .gte('data_evento', todayISO)
         .order('data_evento', { ascending: true })
         .order('hora_evento', { ascending: true })
         .limit(3)
         
      if(evData) setProximosEventos(evData)

      // Fetch Aniversariantes
      const { data: memData } = await supabase
         .from('membros')
         .select('id, nome_completo, data_nascimento')
         .not('data_nascimento', 'is', null)

      if(memData) {
         const filt = memData.filter(m => {
            if(!m.data_nascimento) return false
            const [y, mStr, d] = m.data_nascimento.split('-')
            return parseInt(mStr, 10) === currentMonth
         }).sort((a, b) => {
            const dayA = parseInt(a.data_nascimento.split('-')[2], 10)
            const dayB = parseInt(b.data_nascimento.split('-')[2], 10)
            return dayA - dayB
         })
         setAniversariantes(filt)
      }

      // Fetch Tarefas (Motor Híbrido)
      if (user) {
        let tarefasQuery = supabase.from('tarefas').select('*').order('concluida', { ascending: true }).order('created_at', { ascending: false })
        if (user.user_metadata?.perfil === 'Administrador') {
           tarefasQuery = tarefasQuery.eq('user_email', user.email)
        } else {
           tarefasQuery = tarefasQuery.neq('user_perfil', 'Administrador')
        }
        const { data: tarData } = await tarefasQuery
        if (tarData) setTarefas(tarData)
      }
    }
    loadDashboard()
  }, [])

  // Ações Tarefas
  const handleAddTarefa = async (e) => {
    if (e.key === 'Enter' && novaTarefaTexto.trim() !== '') {
       e.preventDefault()
       const payload = {
          texto: novaTarefaTexto.trim(),
          concluida: false,
          user_email: currentUser.email,
          user_nome: currentUser.user_metadata?.nome || 'Usuário',
          user_perfil: currentUser.user_metadata?.perfil || 'Equipe'
       }
       setNovaTarefaTexto('') // Interface responsiva instantanea no Enter
       
       const { data, error } = await supabase.from('tarefas').insert([payload]).select()
       if (!error && data && data.length > 0) {
         setTarefas([data[0], ...tarefas])
       }
    }
  }

  const handleToggleTarefa = async (id, currentStatus) => {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida: !currentStatus } : t))
    await supabase.from('tarefas').update({ concluida: !currentStatus }).eq('id', id)
  }

  const handleDeleteTarefa = async (id) => {
    setTarefas(prev => prev.filter(t => t.id !== id))
    await supabase.from('tarefas').delete().eq('id', id)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <section className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-primary flex items-center gap-3">
             <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span> Painel de Bordo
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-lg">Aqui está o pulso da sua comunidade hoje.</p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Aniversariantes */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col border border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-headline font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-fixed-dim">cake</span> Aniversariantes
            </h3>
            <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">Este mês</span>
          </div>
          <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
            {aniversariantes.length === 0 ? (
               <p className="text-sm font-medium text-slate-400 italic py-4">Sem aniversariantes neste mês.</p>
            ) : aniversariantes.map(membro => {
               const day = parseInt(membro.data_nascimento.split('-')[2], 10)
               const isToday = day === new Date().getDate()
               const initials = membro.nome_completo.substring(0,2).toUpperCase()
               return (
                 <div key={membro.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/10">
                   <div className="w-12 h-12 rounded-full bg-secondary-fixed/30 flex items-center justify-center text-on-surface font-black">{initials}</div>
                   <div className="flex-1">
                     <h4 className="text-sm font-bold text-on-surface leading-tight">{membro.nome_completo}</h4>
                     <p className={`text-[11px] mt-1 uppercase tracking-wider ${isToday ? 'text-green-600 font-extrabold' : 'text-on-surface-variant font-bold'}`}>
                        Dia {day} {isToday && '✨ (Hoje!)'}
                     </p>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>

        {/* Próximos Eventos */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-headline font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">theater_comedy</span> Próximos Eventos
            </h3>
            <Link to="/eventos" className="text-xs font-bold text-primary hover:underline uppercase">Ver todos</Link>
          </div>
          <div className="space-y-3">
             {proximosEventos.length === 0 ? (
               <p className="text-sm font-medium text-slate-400 italic py-4">Nenhum evento futuro lançado ainda.</p>
             ) : proximosEventos.map(ev => (
               <div key={ev.id} className="p-4 rounded-xl border border-outline-variant/20 bg-surface shadow-sm relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-[#8B5CF6]"></div>
                 <div className="flex justify-between items-start pl-2">
                   <div>
                     <h4 className="font-bold text-on-surface leading-tight text-sm uppercase">{ev.nome}</h4>
                     <div className="flex items-center gap-4 mt-2">
                       <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
                         <span className="material-symbols-outlined text-sm">calendar_today</span> 
                         {ev.data_evento.split('-').reverse().join('/')}
                       </div>
                       {ev.hora_evento && (
                         <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
                           <span className="material-symbols-outlined text-sm">schedule</span> 
                           {ev.hora_evento.substring(0,5)}
                         </div>
                       )}
                     </div>
                   </div>
                   <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                     {ev.status}
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Gestão Ágil de Tarefas */}
        <div className="col-span-12 lg:col-span-3 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 flex flex-col max-h-[440px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-lg font-headline font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-on-tertiary-container">task_alt</span> 
              {currentUser?.user_metadata?.perfil === 'Administrador' ? 'Notas Privadas' : 'Mural da Equipe'}
            </h3>
          </div>
          
          <div className="shrink-0 mb-5 relative group">
             <input 
               type="text" 
               placeholder="Criar tarefa... (Enter)"
               value={novaTarefaTexto}
               onChange={e => setNovaTarefaTexto(e.target.value)}
               onKeyDown={handleAddTarefa}
               className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg py-3 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all font-medium text-on-surface shadow-inner"
             />
             <span className="material-symbols-outlined absolute right-3 top-3.5 text-outline text-[18px] group-focus-within:text-primary transition-colors">add_task</span>
          </div>

          <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
             {tarefas.length === 0 ? (
               <p className="text-xs text-on-surface-variant/50 text-center py-6 font-medium italic">Nenhuma pendência. Tabela limpa!</p>
             ) : (
                tarefas.map(t => (
                  <div key={t.id} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-all border border-transparent hover:border-outline-variant/10">
                    <input 
                      type="checkbox" 
                      checked={t.concluida}
                      onChange={() => handleToggleTarefa(t.id, t.concluida)}
                      className="w-4 h-4 rounded-full border-2 border-outline-variant text-primary cursor-pointer mt-0.5 accent-primary opacity-80" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold transition-all ${t.concluida ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{t.texto}</h4>
                      {/* Selo do Autor no Mural */}
                      {currentUser?.user_metadata?.perfil !== 'Administrador' && (
                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest mt-1 inline-block truncate max-w-full ${t.concluida ? 'text-outline bg-transparent' : 'text-primary bg-primary/10'}`}>
                           {t.user_nome.split(' ')[0]}
                         </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteTarefa(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all p-1 rounded hover:bg-red-50"
                      title="Excluir Lembrete"
                    >
                       <span className="material-symbols-outlined text-[16px] block">delete</span>
                    </button>
                  </div>
                ))
             )}
          </div>
        </div>

      </div>
    </div>
  )
}

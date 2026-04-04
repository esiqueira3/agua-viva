import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [proximosEventos, setProximosEventos] = useState([])
  const [aniversariantes, setAniversariantes] = useState([])
  const [departamentosStats, setDepartamentosStats] = useState([])
  const [deptExpanded, setDeptExpanded] = useState(false)
  const [demoStats, setDemoStats] = useState({ homens: 0, mulheres: 0, criancas: 0, total: 0, avgHomens: 0, avgMulheres: 0, avgCriancas: 0 })
  
  // Controle Tarefas Inteligentes
  const [tarefas, setTarefas] = useState([])
  const [novaTarefaTexto, setNovaTarefaTexto] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function loadDashboard() {
      const todayDate = new Date()
      const todayISO = todayDate.toISOString().split('T')[0]
      const currentMonth = todayDate.getMonth() + 1

      // Identidade Logada
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Fetch Eventos
      const { data: evData } = await supabase
         .from('eventos')
         .select('*, link_inscricao, link_pagamento_mp')
         .gte('data_evento', todayISO)
         .order('data_evento', { ascending: true })
         .order('hora_evento', { ascending: true })
         .limit(3)
         
      if(evData) setProximosEventos(evData)

      // Fetch Aniversariantes
      const { data: memData } = await supabase
         .from('membros')
         .select('id, nome_completo, data_nascimento, departamento_id')
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

      // Fetch de todos os membros para contagem e nomes de líderes (Unificado)
      const { data: allMembers } = await supabase
         .from('membros')
         .select('id, nome_completo, departamento_id, departamentos_ids, sexo, faixa_etaria, idade')
         .eq('status', true)

      const { data: depts } = await supabase
         .from('departamentos')
         .select('id, nome, lider_principal_id')
      
      if (depts && allMembers) {
         const stats = depts.map(d => {
             // Suporte a multi-departamento (departamentos_ids) + retrocompat (departamento_id)
             const count = allMembers.filter(m => {
               if (m.departamento_id === d.id) return true
               if (m.departamentos_ids) {
                 try {
                   const ids = typeof m.departamentos_ids === 'string'
                     ? JSON.parse(m.departamentos_ids)
                     : m.departamentos_ids
                   if (Array.isArray(ids) && ids.includes(d.id)) return true
                 } catch {}
               }
               return false
             }).length
             const leader = allMembers.find(m => m.id === d.lider_principal_id)?.nome_completo || 'Sem líder definido'
             
             return {
                 id: d.id,
                 nome: d.nome,
                 lider: leader,
                 membrosCount: count || 0
             }
         })
         setDepartamentosStats(stats)
      }

      // Calcula estatísticas demográficas
      if (allMembers) {
        const avg = (arr) => {
          const valid = arr.filter(m => m.idade && Number(m.idade) > 0)
          if (!valid.length) return 0
          return Math.round(valid.reduce((s, m) => s + Number(m.idade), 0) / valid.length)
        }
        const criancasArr = allMembers.filter(m => m.faixa_etaria === 'Criança')
        const homensArr = allMembers.filter(m => m.sexo === 'Masculino' && m.faixa_etaria !== 'Criança')
        const mulheresArr = allMembers.filter(m => m.sexo === 'Feminino' && m.faixa_etaria !== 'Criança')
        setDemoStats({
          homens: homensArr.length,
          mulheres: mulheresArr.length,
          criancas: criancasArr.length,
          total: allMembers.length,
          avgHomens: avg(homensArr),
          avgMulheres: avg(mulheresArr),
          avgCriancas: avg(criancasArr)
        })
      }

      // Fetch Tarefas (Filtrado por Usuário Logado)
      if (user) {
        const { data: tarData } = await supabase
          .from('tarefas')
          .select('*')
          .eq('user_email', user.email)
          .order('concluida', { ascending: true })
          .order('created_at', { ascending: false })
        
        if (tarData) setTarefas(tarData)
      }
    }
    loadDashboard()
  }, [])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert("✅ Link copiado com sucesso! Agora é só colar no WhatsApp. ✨")
  }

  // Função para mapear ícones e cores fiel à imagem de referência
  const getDeptConfig = (nome) => {
    const n = nome.toUpperCase();
    if (n.includes('JOVENS') || n.includes('ADOLESCENTES') || n.includes('JUVENTUDE')) 
      return { icon: 'rocket_launch', bg: 'bg-blue-50', iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' };
    
    if (n.includes('KIDS') || n.includes('CRIANÇAS')) 
      return { icon: 'child_care', bg: 'bg-amber-50', iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' };
    
    if (n.includes('LOUVOR') || n.includes('DANÇA') || n.includes('PANDEIRO') || n.includes('MÚSICA')) 
      return { icon: 'music_note', bg: 'bg-indigo-50', iconColor: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700' };
    
    if (n.includes('MULHERES')) 
      return { icon: 'female', bg: 'bg-rose-50', iconColor: 'text-rose-500', badge: 'bg-rose-100 text-rose-700' };
    
    if (n.includes('HOMENS')) 
      return { icon: 'male', bg: 'bg-cyan-50', iconColor: 'text-cyan-500', badge: 'bg-cyan-100 text-cyan-700' };
    
    if (n.includes('CASAIS')) 
      return { icon: 'favorite', bg: 'bg-emerald-50', iconColor: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };

    if (n.includes('DISCIPULADOS')) 
      return { icon: 'auto_stories', bg: 'bg-orange-50', iconColor: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' };

    return { icon: 'groups', bg: 'bg-slate-50', iconColor: 'text-slate-500', badge: 'bg-slate-200 text-slate-700' };
  }

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
      {/* Banner de Capa Home */}
      <div className="w-full h-48 md:h-64 rounded-[2rem] overflow-hidden shadow-xl border border-outline-variant/10 relative group">
          <img 
            src="/capa_home.jpg" 
            alt="Capa Água Viva" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
      </div>

      <section className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-primary flex items-center gap-3">
             <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span> Painel de Bordo
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-lg">Aqui está o resumo da sua comunidade hoje.</p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Aniversariantes */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col border border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-black text-on-surface tracking-tight uppercase flex items-center gap-2">
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
               const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
               const monthName = months[new Date().getMonth()];

               return (
                 <div key={membro.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/10">
                   <div className="w-12 h-12 rounded-full bg-secondary-fixed/30 flex items-center justify-center text-on-surface font-black">{initials}</div>
                   <div className="flex-1">
                     <h4 className="text-sm font-bold text-on-surface leading-tight">{membro.nome_completo}</h4>
                     <p className={`text-[11px] mt-1 uppercase tracking-wider ${isToday ? 'text-green-600 font-extrabold' : 'text-on-surface-variant font-bold'}`}>
                        {day} de {monthName} {isToday && '✨ (Hoje!)'}
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
            <h3 className="text-base font-black text-on-surface tracking-tight uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">theater_comedy</span> Próximos Eventos
            </h3>
            <Link to="/eventos" className="text-xs font-bold text-primary hover:underline uppercase">Ver todos</Link>
          </div>
          <div className="space-y-3">
             {proximosEventos.length === 0 ? (
               <p className="text-sm font-medium text-slate-400 italic py-4">Nenhum evento futuro lançado ainda.</p>
             ) : proximosEventos.map(ev => (
                <div key={ev.id} className="p-4 rounded-xl border border-outline-variant/20 bg-surface shadow-sm relative overflow-hidden transition-all hover:shadow-md flex items-center justify-between group/card">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#8B5CF6]"></div>
                  <div className="flex-1 pl-2">
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
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {ev.status}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(`${window.location.origin}/inscricao/${ev.id}`)}
                      className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95 translate-y-1"
                      title="Copiar Link de Inscrição"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
             ))}
          </div>
        </div>

        {/* Gestão Ágil de Tarefas */}
        <div className="col-span-12 lg:col-span-3 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 flex flex-col max-h-[440px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-base font-black text-on-surface tracking-tight uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-on-tertiary-container">task_alt</span> 
              TAREFAS
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
                tarefas.map(t => {
                   const taskDate = new Date(t.created_at);
                   const day = String(taskDate.getDate()).padStart(2, '0');
                   const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                   const month = months[taskDate.getMonth()];
                   const formattedDate = `${day} ${month}`;
                   
                   return (
                     <div key={t.id} className="group flex items-start gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-all border border-transparent hover:border-outline-variant/5 bg-surface/30 mb-2">
                       <div className="pt-0.5">
                         <input 
                           type="checkbox" 
                           checked={t.concluida}
                           onChange={() => handleToggleTarefa(t.id, t.concluida)}
                           className="w-5 h-5 rounded border-2 border-outline-variant text-primary cursor-pointer accent-primary" 
                         />
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         <h4 className={`text-sm font-bold transition-all ${t.concluida ? 'text-on-surface-variant/40 line-through font-medium' : 'text-on-surface'}`}>
                           {t.texto}
                         </h4>
                         
                         <div className="flex items-center gap-3 mt-1.5">
                           {/* Data com Ícone */}
                           <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant/60 uppercase">
                             <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                             {formattedDate}
                           </div>

                           {/* Badge de Status */}
                           <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                             t.concluida 
                               ? 'bg-blue-100 text-blue-600' 
                               : 'bg-amber-100 text-amber-600'
                           }`}>
                             {t.concluida ? 'CONCLUÍDO' : 'PENDENTE'}
                           </div>
                         </div>
                       </div>

                       <button 
                         onClick={() => handleDeleteTarefa(t.id)}
                         className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all p-1 rounded hover:bg-red-50"
                         title="Excluir"
                       >
                         <span className="material-symbols-outlined text-[18px] block">delete</span>
                       </button>
                     </div>
                   )
                 })
             )}
          </div>
        </div>

      </div>

      {/* Seção de Departamentos */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-outline-variant/10 shadow-sm transition-all hover:shadow-md overflow-hidden">
        {/* Header clicável */}
        <button
          type="button"
          onClick={() => setDeptExpanded(v => !v)}
          className="w-full flex items-center justify-between p-8 pb-6 hover:bg-primary/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary font-black" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
            <div className="text-left">
              <h3 className="text-base font-black text-on-surface tracking-tight uppercase">Departamentos</h3>
              <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-0.5">
                {departamentosStats.length} departamento{departamentosStats.length !== 1 ? 's' : ''} cadastrado{departamentosStats.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant/20 bg-surface-container-low transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white ${
            deptExpanded ? 'bg-primary border-primary' : ''
          }`}>
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
              deptExpanded ? 'rotate-180 text-white' : 'text-on-surface-variant'
            }`}>
              expand_more
            </span>
          </div>
        </button>

        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departamentosStats.length === 0 ? (
              <p className="col-span-full text-center py-10 text-on-surface-variant/40 italic font-medium uppercase tracking-widest text-xs">
                Configure seus departamentos para vê-los aqui.
              </p>
            ) : (
              // Colapsado: mostra só 4 (2 linhas de 2). Expandido: mostra todos
              (deptExpanded ? departamentosStats : departamentosStats.slice(0, 4)).map(dept => {
                const config = getDeptConfig(dept.nome);
                return (
                  <div key={dept.id} className="flex items-center justify-between p-5 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/40 hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm`}>
                        <span className={`material-symbols-outlined text-2xl ${config.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {config.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-on-surface leading-tight">{dept.nome}</h4>
                        <p className="text-xs font-bold text-on-surface-variant flex items-center gap-1 mt-1">
                          <span className="opacity-40 uppercase tracking-tighter">Líder:</span> {dept.lider}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl ${config.badge} flex flex-col items-center justify-center min-w-[100px] shadow-sm transform transition-transform group-hover:scale-105`}>
                      <span className="text-xl font-black leading-none">{String(dept.membrosCount).padStart(2, '0')}</span>
                      <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Membros</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Rodapé: botão "Ver mais" quando há mais de 4 e está colapsado */}
          {departamentosStats.length > 4 && (
            <button
              onClick={() => setDeptExpanded(v => !v)}
              className="mt-4 w-full py-2.5 rounded-xl border border-outline-variant/20 text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${deptExpanded ? 'rotate-180' : ''}`}>expand_more</span>
              {deptExpanded
                ? `Recolher (mostrar menos)`
                : `Ver todos (${departamentosStats.length - 4} ocultos)`}
            </button>
          )}
        </div>
      </div>

      {/* Card de Perfil Demográfico */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-2xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
          <div>
            <h3 className="text-base font-black text-on-surface tracking-tight uppercase">Perfil da Congregação</h3>
            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
              {demoStats.total} membro{demoStats.total !== 1 ? 's' : ''} ativo{demoStats.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Homens */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>man</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-blue-700 leading-none">{String(demoStats.homens).padStart(2, '0')}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mt-1">Homens</p>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: demoStats.total > 0 ? `${Math.round((demoStats.homens / demoStats.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] font-bold text-blue-400">
              {demoStats.total > 0 ? `${Math.round((demoStats.homens / demoStats.total) * 100)}%` : '0%'}
            </p>
            {demoStats.avgHomens > 0 && (
              <p className="text-[10px] font-black text-blue-500/70 uppercase tracking-wider">
                Média: {demoStats.avgHomens} anos
              </p>
            )}
          </div>

          {/* Mulheres */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-pink-50 dark:bg-pink-900/10 border-2 border-pink-100/50 dark:border-pink-800/30 shadow-sm hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-500 hover:-translate-y-2 group">
            <div className="w-14 h-14 rounded-2xl bg-pink-500 flex items-center justify-center shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>woman</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-pink-700 leading-none">{String(demoStats.mulheres).padStart(2, '0')}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-pink-500 mt-1">Mulheres</p>
            </div>
            <div className="w-full bg-pink-200 rounded-full h-1.5">
              <div
                className="bg-pink-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: demoStats.total > 0 ? `${Math.round((demoStats.mulheres / demoStats.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] font-bold text-pink-400">
              {demoStats.total > 0 ? `${Math.round((demoStats.mulheres / demoStats.total) * 100)}%` : '0%'}
            </p>
            {demoStats.avgMulheres > 0 && (
              <p className="text-[10px] font-black text-pink-500/70 uppercase tracking-wider">
                Média: {demoStats.avgMulheres} anos
              </p>
            )}
          </div>

          {/* Crianças */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-500 hover:-translate-y-2 group">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>child_care</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-amber-700 leading-none">{String(demoStats.criancas).padStart(2, '0')}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mt-1">Crianças</p>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-1.5">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-700"
                style={{ width: demoStats.total > 0 ? `${Math.round((demoStats.criancas / demoStats.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] font-bold text-amber-400">
              {demoStats.total > 0 ? `${Math.round((demoStats.criancas / demoStats.total) * 100)}%` : '0%'}
            </p>
            {demoStats.avgCriancas > 0 && (
              <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-wider">
                Média: {demoStats.avgCriancas} anos
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

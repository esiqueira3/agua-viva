import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'

export default function FinanceiroEventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventoSelecionado, setEventoSelecionado] = useState(null)
  const [inscritos, setInscritos] = useState([])
  const [resumoDepto, setResumoDepto] = useState({})
  const [showModalManual, setShowModalManual] = useState(false)
  const [novoLancamento, setNovoLancamento] = useState({ nome: '', email: '', whatsapp: '', valor: '' })

  const loadFinanceiro = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('eventos')
      .select('*, departamentos ( nome ), inscricoes ( valor_pago, status )')
      .eq('pago', true)
      .order('data_evento', { ascending: false })

    if (data) {
      const deptos = {}
      const stats = data.map(ev => {
         const confirmados = (ev.inscricoes || []).filter(i => i.status === 'confirmada')
         const totalArrecadado = confirmados.reduce((sum, i) => sum + (parseFloat(i.valor_pago) || 0), 0)
         const deptoNome = ev.departamentos?.nome || 'Geral'
         deptos[deptoNome] = (deptos[deptoNome] || 0) + totalArrecadado
         return { ...ev, totalArrecadado, qtdeInscritos: (ev.inscricoes || []).length, qtdeConfirmados: confirmados.length }
      })
      setEventos(stats)
      setResumoDepto(deptos)
      
      // Se houver evento selecionado, atualizar seus dados também
      if (eventoSelecionado) {
        const atualizado = stats.find(s => s.id === eventoSelecionado.id)
        if (atualizado) setEventoSelecionado(atualizado)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFinanceiro()
  }, [])

  const verDetalhes = async (evento) => {
    setEventoSelecionado(evento)
    const { data } = await supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', evento.id)
      .order('created_at', { ascending: false })
    
    if (data) setInscritos(data)
  }

  const handleLancamentoManual = async (e) => {
    e.preventDefault()
    if (!eventoSelecionado) return

    const { error } = await supabase
      .from('inscricoes')
      .insert([{
        evento_id: eventoSelecionado.id,
        nome_participante: novoLancamento.nome,
        email_participante: novoLancamento.email,
        whatsapp: novoLancamento.whatsapp,
        valor_pago: parseFloat(novoLancamento.valor || 0),
        status: 'confirmada',
        manual: true
      }])

    if (!error) {
      setShowModalManual(false)
      setNovoLancamento({ nome: '', email: '', whatsapp: '', valor: '' })
      await verDetalhes(eventoSelecionado)
      await loadFinanceiro()
    }
  }

  const consultarMP = async () => {
    if(!eventoSelecionado) return
    setLoading(true)
    
    try {
      // 1. Pegar o Token
      const { data: config } = await supabase.from('config_global').select('valor').eq('chave', 'MP_ACCESS_TOKEN').single()
      if(!config?.valor) throw new Error("Token do Mercado Pago não configurado!")

      // 2. Chamar API do Mercado Pago (Search by external_reference)
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${eventoSelecionado.id}&status=approved`, {
        headers: { 'Authorization': `Bearer ${config.valor}` }
      })
      const result = await resp.json()
      
      if(result.results?.length > 0) {
        let count = 0
        for(const payment of result.results) {
           // 3. Tentar encontrar a inscrição pelo email do pagador ou criar uma nova se não existir
           const email = payment.payer?.email
           
           const { data: inscrita } = await supabase
              .from('inscricoes')
              .select('*')
              .eq('evento_id', eventoSelecionado.id)
              .eq('email_participante', email)
              .single()

           if(inscrita) {
              if(inscrita.status !== 'confirmada') {
                 await supabase.from('inscricoes').update({ status: 'confirmada', valor_pago: payment.transaction_amount }).eq('id', inscrita.id)
                 count++
              }
           } else {
              // Se pagou mas não tinha inscrição no sistema, criamos uma confirmada!
              await supabase.from('inscricoes').insert([{
                 evento_id: eventoSelecionado.id,
                 nome_participante: payment.payer?.first_name || 'Pagador MP',
                 email_participante: email,
                 valor_pago: payment.transaction_amount,
                 status: 'confirmada'
              }])
              count++
           }
        }
        alert(`🎉 Sucesso! Encontramos e processamos ${count} novos pagamentos no Mercado Pago. ✨`)
      } else {
        alert("🔍 Nenhuma nova transação aprovada encontrada para este ID de evento no Mercado Pago.")
      }
    } catch (err) {
      alert("❌ Erro na consulta: " + err.message)
    } finally {
      await verDetalhes(eventoSelecionado)
      await loadFinanceiro()
      setLoading(false)
    }
  }

  const handleDeleteInscricao = async (id) => {
    if (!window.confirm("⚠️ Deseja realmente excluir este lançamento manual? Esta ação não pode ser desfeita.")) return

    const { error } = await supabase
      .from('inscricoes')
      .delete()
      .eq('id', id)

    if (error) {
      alert("❌ Erro ao excluir: " + error.message)
    } else {
      alert("✅ Lançamento excluído com sucesso!")
      await verDetalhes(eventoSelecionado)
      await loadFinanceiro()
    }
  }

  const handleConfirmarPagamento = async (inscricaoId) => {
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: 'confirmada' })
      .eq('id', inscricaoId)
    
    if (!error) {
       // Atualizar lista local de inscritos
       setInscritos(prev => prev.map(i => i.id === inscricaoId ? { ...i, status: 'confirmada' } : i))
       
       // Recarregar eventos para atualizar saldos do topo e dos cards
       const { data } = await supabase
        .from('eventos')
        .select('*, departamentos (nome), inscricoes(count), inscricoes(valor_pago, status)')
        .eq('pago', true)
        .order('data_evento', { ascending: false })

      if (data) {
        const deptos = {}
        const stats = data.map(ev => {
           const confirmados = ev.inscricoes.filter(i => i.status === 'confirmada')
           const totalArrecadado = confirmados.reduce((sum, i) => sum + (parseFloat(i.valor_pago) || 0), 0)
           const deptoNome = ev.departamentos?.nome || 'Geral'
           deptos[deptoNome] = (deptos[deptoNome] || 0) + totalArrecadado
           return { ...ev, totalArrecadado, qtdeInscritos: ev.inscricoes.length, qtdeConfirmados: confirmados.length }
        })
        setEventos(stats)
        setResumoDepto(deptos)
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <PageHeader title="Gestão Financeira e Arrecadação" icon="monetization_on" />

      {/* PAINEL DE SALDO POR DEPARTAMENTO */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
         <h4 className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span> Saldos Consolidados por Departamento (Arrecadação Direta)
         </h4>
         <div className="flex flex-wrap gap-4">
            {Object.entries(resumoDepto).map(([depto, saldo]) => (
               <div key={depto} className="bg-white/50 backdrop-blur-md border border-outline-variant/20 p-4 px-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">
                     {depto.substring(0, 2)}
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">{depto}</p>
                     <p className="text-lg font-black text-primary">R$ {parseFloat(saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
               </div>
            ))}
            {Object.keys(resumoDepto).length === 0 && (
               <p className="text-xs font-bold text-slate-400 italic">Nenhuma arrecadação registrada para os departamentos ainda.</p>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {loading ? (
            <p className="font-bold text-primary animate-pulse col-span-3">Consultando Mercado Pago...</p>
         ) : eventos.map(ev => (
            <div key={ev.id} onClick={() => verDetalhes(ev)} className={`group cursor-pointer p-6 rounded-3xl border transition-all hover:shadow-xl ${eventoSelecionado?.id === ev.id ? 'bg-primary border-primary shadow-primary/20' : 'bg-surface-container-lowest border-outline-variant/10 hover:border-primary/30'}`}>
               <div className="flex justify-between items-start mb-4">
                  <span className={`material-symbols-outlined text-3xl ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-primary'}`}>festival</span>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${eventoSelecionado?.id === ev.id ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                     {ev.status}
                  </div>
               </div>
               <div className="flex flex-col mb-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${eventoSelecionado?.id === ev.id ? 'text-white/60' : 'text-primary/50'}`}>
                     {ev.departamentos?.nome || 'Geral'}
                  </span>
                  <h3 className={`text-lg font-black leading-tight ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-on-surface'}`}>
                     {ev.nome}
                  </h3>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${eventoSelecionado?.id === ev.id ? 'text-white/60' : 'text-slate-400'}`}>Arrecadado</p>
                     <p className={`text-xl font-black ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-primary'}`}>R$ {ev.totalArrecadado?.toFixed(2)}</p>
                  </div>
                  <div>
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${eventoSelecionado?.id === ev.id ? 'text-white/60' : 'text-slate-400'}`}>Inscritos</p>
                     <p className={`text-xl font-black ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-on-surface'}`}>{ev.qtdeConfirmados} / {ev.qtdeInscritos}</p>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {eventoSelecionado && (
         <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-outline-variant/10 flex justify-between items-center text-on-surface">
               <div>
                  <h4 className="text-xl font-black italic">{eventoSelecionado.nome}</h4>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Conciliação Automática - Mercado Pago</p>
               </div>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={consultarMP}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                    disabled={loading}
                  >
                    <span className="material-symbols-outlined text-[18px]">sync</span> SINCRONIZAR
                  </button>
                  <button 
                    onClick={() => setShowModalManual(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/80 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> LANÇAR MANUAL
                  </button>
                  <div className="text-right border-l border-outline-variant/20 pl-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Preço Inscrição</p>
                    <p className="text-lg font-black text-primary">R$ {eventoSelecionado.valor_total}</p>
                  </div>
               </div>
            </div>

            {/* MODAL LANÇAMENTO MANUAL */}
            {showModalManual && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-outline-variant/20 animate-in zoom-in duration-300">
                  <h3 className="text-2xl font-black text-primary mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">payments</span> Lançamento Manual
                  </h3>
                  <form onSubmit={handleLancamentoManual} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Participante</label>
                      <input required type="text" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" value={novoLancamento.nome} onChange={e => setNovoLancamento({...novoLancamento, nome: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor Recebido (R$)</label>
                      <input required type="number" step="0.01" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary font-mono font-bold" value={novoLancamento.valor} onChange={e => setNovoLancamento({...novoLancamento, valor: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <button type="button" onClick={() => setShowModalManual(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">Cancelar</button>
                      <button type="submit" className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20">Confirmar e Salvar</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead>
                     <tr className="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-black tracking-widest">
                        <th className="px-6 py-4">Participante</th>
                        <th className="px-6 py-4">Status Pagamento</th>
                        <th className="px-6 py-4">Valor Pago</th>
                        <th className="px-6 py-4">Data Inscrição</th>
                        <th className="px-6 py-4">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                     {inscritos.map(ins => (
                        <tr key={ins.id} className="hover:bg-primary/5 transition-colors group">
                           <td className="px-6 py-4">
                              <p className="font-bold text-on-surface">{ins.nome_participante}</p>
                              <p className="text-[11px] text-on-surface-variant">{ins.email_participante}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${ins.status === 'confirmada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                 <span className="material-symbols-outlined text-[14px]">{ins.status === 'confirmada' ? 'check_circle' : 'pending'}</span>
                                 {ins.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 font-mono font-bold text-on-surface">
                              R$ {parseFloat(ins.valor_pago || 0).toFixed(2)}
                           </td>
                           <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">
                              {new Date(ins.created_at).toLocaleString('pt-BR')}
                           </td>
                            <td className="px-6 py-4 flex items-center gap-2">
                                {ins.status === 'pendente' && (
                                  <button onClick={() => handleConfirmarPagamento(ins.id)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors" title="Confirmar Manual">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                  </button>
                                )}
                                {ins.manual && (
                                  <button onClick={() => handleDeleteInscricao(ins.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Excluir Lançamento">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                )}
                            </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               {inscritos.length === 0 && (
                  <div className="p-12 text-center">
                     <span className="material-symbols-outlined text-6xl text-slate-200 mb-2">person_search</span>
                     <p className="text-slate-400 font-bold italic">Nenhum inscrito para este evento ainda.</p>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  )
}

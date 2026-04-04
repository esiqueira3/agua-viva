import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'

const FORMAS_PAGAMENTO = [
  { value: 'PIX',           icon: 'qr_code_2',         color: '#32BCAD' },
  { value: 'Transferência', icon: 'account_balance',    color: '#3B82F6' },
  { value: 'Dinheiro',      icon: 'payments',           color: '#10B981' },
  { value: 'Cheque',        icon: 'receipt_long',       color: '#8B5CF6' },
  { value: 'Cartão',        icon: 'credit_card',        color: '#F59E0B' },
]

function CurrencyDisplay({ value, size = 'lg', className = '' }) {
  const formatted = parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [int, dec] = formatted.split(',')
  return (
    <span className={`font-black tabular-nums ${className}`}>
      <span className={size === 'lg' ? 'text-3xl' : 'text-lg'}>R$ {int}</span>
      <span className={size === 'lg' ? 'text-lg opacity-70' : 'text-sm opacity-70'}>,{dec}</span>
    </span>
  )
}

export default function FinanceiroEventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventoSelecionado, setEventoSelecionado] = useState(null)
  const [inscritos, setInscritos] = useState([])
  const [saques, setSaques] = useState([])
  const [resumoDepto, setResumoDepto] = useState({})
  
  // Modais
  const [showModalManual, setShowModalManual] = useState(false)
  const [showModalSaque, setShowModalSaque] = useState(false)
  const [savingSaque, setSavingSaque] = useState(false)

  // Forms
  const [novoLancamento, setNovoLancamento] = useState({ nome: '', email: '', whatsapp: '', valor: '' })
  const [novoSaque, setNovoSaque] = useState({
    valor: '',
    responsavel: '',
    forma_pagamento: 'PIX',
    data_saque: new Date().toISOString().split('T')[0],
    observacao: ''
  })

  const loadFinanceiro = async () => {
    setLoading(true)
    const { data } = await supabase
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
      if (eventoSelecionado) {
        const atualizado = stats.find(s => s.id === eventoSelecionado.id)
        if (atualizado) setEventoSelecionado(atualizado)
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadFinanceiro() }, [])

  const verDetalhes = async (evento) => {
    // Se clicar no mesmo evento que já está aberto, fecha o detalhamento
    if (eventoSelecionado?.id === evento.id) {
      setEventoSelecionado(null)
      setInscritos([])
      setSaques([])
      return
    }

    setEventoSelecionado(evento)
    const [{ data: inscData }, { data: saqueData }] = await Promise.all([
      supabase.from('inscricoes').select('*').eq('evento_id', evento.id).order('created_at', { ascending: false }),
      supabase.from('saques_eventos').select('*').eq('evento_id', evento.id).order('created_at', { ascending: false })
    ])
    if (inscData) setInscritos(inscData)
    if (saqueData) setSaques(saqueData)
  }

  // Saldo disponível = arrecadado - total já sacado
  const totalSacado = useMemo(() => saques.reduce((s, sq) => s + parseFloat(sq.valor || 0), 0), [saques])
  const saldoDisponivel = useMemo(() => (eventoSelecionado?.totalArrecadado || 0) - totalSacado, [eventoSelecionado, totalSacado])
  const pctSacado = useMemo(() => {
    if (!eventoSelecionado?.totalArrecadado || eventoSelecionado.totalArrecadado === 0) return 0
    return Math.min(100, Math.round((totalSacado / eventoSelecionado.totalArrecadado) * 100))
  }, [eventoSelecionado, totalSacado])

  const handleLancamentoManual = async (e) => {
    e.preventDefault()
    if (!eventoSelecionado) return
    const { error } = await supabase.from('inscricoes').insert([{
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

  const handleRegistrarSaque = async (e) => {
    e.preventDefault()
    if (!eventoSelecionado) return
    const valorSaque = parseFloat(novoSaque.valor || 0)
    if (valorSaque > saldoDisponivel) {
      alert(`⚠️ O valor do saque (R$ ${valorSaque.toFixed(2)}) é maior que o saldo disponível (R$ ${saldoDisponivel.toFixed(2)}).`)
      return
    }
    setSavingSaque(true)
    const { error } = await supabase.from('saques_eventos').insert([{
      evento_id: eventoSelecionado.id,
      valor: valorSaque,
      responsavel: novoSaque.responsavel,
      forma_pagamento: novoSaque.forma_pagamento,
      data_saque: novoSaque.data_saque,
      observacao: novoSaque.observacao
    }])
    setSavingSaque(false)
    if (!error) {
      setShowModalSaque(false)
      setNovoSaque({ valor: '', responsavel: '', forma_pagamento: 'PIX', data_saque: new Date().toISOString().split('T')[0], observacao: '' })
      await verDetalhes(eventoSelecionado)
    } else {
      alert('❌ Erro ao registrar saque: ' + error.message)
    }
  }

  const handleExcluirSaque = async (id) => {
    if (!window.confirm('⚠️ Deseja excluir este registro de saque?')) return
    await supabase.from('saques_eventos').delete().eq('id', id)
    await verDetalhes(eventoSelecionado)
  }

  const handleDeleteInscricao = async (id) => {
    if (!window.confirm('⚠️ Deseja realmente excluir este lançamento manual?')) return
    await supabase.from('inscricoes').delete().eq('id', id)
    await verDetalhes(eventoSelecionado)
    await loadFinanceiro()
  }

  const handleConfirmarPagamento = async (inscricaoId) => {
    await supabase.from('inscricoes').update({ status: 'confirmada' }).eq('id', inscricaoId)
    await verDetalhes(eventoSelecionado)
    await loadFinanceiro()
  }

  const consultarMP = async () => {
    if (!eventoSelecionado) return
    setLoading(true)
    try {
      const { data: config } = await supabase.from('config_global').select('valor').eq('chave', 'MP_ACCESS_TOKEN').single()
      if (!config?.valor) throw new Error('Token do Mercado Pago não configurado!')
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${eventoSelecionado.id}&status=approved`, {
        headers: { 'Authorization': `Bearer ${config.valor}` }
      })
      const result = await resp.json()
      if (result.results?.length > 0) {
        let count = 0
        for (const payment of result.results) {
          const email = payment.payer?.email
          const { data: inscrita } = await supabase.from('inscricoes').select('*').eq('evento_id', eventoSelecionado.id).eq('email_participante', email).single()
          if (inscrita) {
            if (inscrita.status !== 'confirmada') {
              await supabase.from('inscricoes').update({ status: 'confirmada', valor_pago: payment.transaction_amount }).eq('id', inscrita.id)
              count++
            }
          } else {
            await supabase.from('inscricoes').insert([{ evento_id: eventoSelecionado.id, nome_participante: payment.payer?.first_name || 'Pagador MP', email_participante: email, valor_pago: payment.transaction_amount, status: 'confirmada' }])
            count++
          }
        }
        alert(`🎉 ${count} novos pagamentos sincronizados!`)
      } else {
        alert('🔍 Nenhuma nova transação aprovada encontrada.')
      }
    } catch (err) {
      alert('❌ Erro na consulta: ' + err.message)
    } finally {
      await verDetalhes(eventoSelecionado)
      await loadFinanceiro()
      setLoading(false)
    }
  }

  const totalGlobalArrecadado = eventos.reduce((s, ev) => s + (ev.totalArrecadado || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <PageHeader title="Gestão Financeira e Arrecadação" icon="monetization_on" />

      {/* KPIs GLOBAIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Total Arrecadado</p>
          <CurrencyDisplay value={totalGlobalArrecadado} className="text-green-600" />
          <p className="text-[10px] text-on-surface-variant/40 mt-1">{eventos.length} evento{eventos.length !== 1 ? 's' : ''} pagos</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Total Inscritos</p>
          <p className="text-3xl font-black text-primary">{eventos.reduce((s, ev) => s + ev.qtdeConfirmados, 0)}</p>
          <p className="text-[10px] text-on-surface-variant/40 mt-1">confirmados</p>
        </div>
        {Object.entries(resumoDepto).slice(0, 2).map(([depto, saldo]) => (
          <div key={depto} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1 truncate">{depto}</p>
            <CurrencyDisplay value={saldo} className="text-primary" />
          </div>
        ))}
      </div>

      {/* GRID DE EVENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center p-16 gap-3">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
            <p className="text-sm font-bold text-on-surface-variant/50">Carregando...</p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="col-span-3 text-center py-16">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">monetization_on</span>
            <p className="font-bold text-on-surface-variant/40 mt-2">Nenhum evento pago cadastrado ainda.</p>
          </div>
        ) : eventos.map(ev => (
          <div
            key={ev.id}
            onClick={() => verDetalhes(ev)}
            className={`group cursor-pointer rounded-3xl border transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
              eventoSelecionado?.id === ev.id
                ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-white'
                : 'bg-surface-container-lowest border-outline-variant/10 hover:border-primary/30'
            }`}
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className={`material-symbols-outlined text-3xl ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>festival</span>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  eventoSelecionado?.id === ev.id ? 'bg-white/20 text-white' :
                  ev.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>{ev.status}</div>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${eventoSelecionado?.id === ev.id ? 'text-white/60' : 'text-primary/50'}`}>
                {ev.departamentos?.nome || 'Geral'}
              </p>
              <h3 className={`text-base font-black leading-tight mb-4 ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-on-surface'}`}>{ev.nome}</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${eventoSelecionado?.id === ev.id ? 'text-white/50' : 'text-slate-400'}`}>Arrecadado</p>
                  <p className={`text-xl font-black ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-green-600'}`}>R$ {ev.totalArrecadado?.toFixed(2)}</p>
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${eventoSelecionado?.id === ev.id ? 'text-white/50' : 'text-slate-400'}`}>Confirmados</p>
                  <p className={`text-xl font-black ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-on-surface'}`}>{ev.qtdeConfirmados}<span className="text-sm opacity-50">/{ev.qtdeInscritos}</span></p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PAINEL DE DETALHES DO EVENTO SELECIONADO */}
      {eventoSelecionado && (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* HEADER DO PAINEL */}
          <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900 p-6 border-b border-outline-variant/10">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-1">Conciliação e Caixa</p>
                <h4 className="text-2xl font-black text-on-surface leading-tight">{eventoSelecionado.nome}</h4>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={consultarMP} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">sync</span> SINCRONIZAR MP
                </button>
                <button onClick={() => setShowModalManual(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/80 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span> LANÇAR MANUAL
                </button>
                <button onClick={() => setShowModalSaque(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span> REGISTRAR SAQUE
                </button>
              </div>
            </div>

            {/* BARRA DE SALDO */}
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-emerald-500/10 border border-green-100 dark:border-emerald-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-green-600/70 dark:text-emerald-400/80 mb-1">Total Arrecadado</p>
                <CurrencyDisplay value={eventoSelecionado.totalArrecadado} className="text-green-700 dark:text-emerald-400" size="lg" />
              </div>
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-600/70 dark:text-orange-400/80 mb-1">Total Sacado</p>
                <CurrencyDisplay value={totalSacado} className="text-orange-600 dark:text-orange-400" size="lg" />
                <div className="mt-2 w-full bg-orange-200 dark:bg-white/10 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${pctSacado}%` }} />
                </div>
                <p className="text-[9px] font-bold text-orange-400 mt-1">{pctSacado}% do arrecadado</p>
              </div>
              <div className={`rounded-2xl p-4 border ${saldoDisponivel > 0 ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${saldoDisponivel > 0 ? 'text-blue-600/70 dark:text-blue-400/80' : 'text-slate-400'}`}>
                  Saldo Disponível
                </p>
                <CurrencyDisplay value={saldoDisponivel} className={saldoDisponivel > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'} size="lg" />
                {saldoDisponivel === 0 && <p className="text-[9px] font-bold text-slate-400 mt-1">✅ Totalmente sacado</p>}
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE SAQUES */}
          {saques.length > 0 && (
            <div className="p-6 border-b border-outline-variant/10">
              <h5 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[16px] text-orange-500">account_balance_wallet</span>
                Histórico de Saques ({saques.length})
              </h5>
              <div className="space-y-2">
                {saques.map(sq => {
                  const forma = FORMAS_PAGAMENTO.find(f => f.value === sq.forma_pagamento) || FORMAS_PAGAMENTO[0]
                  return (
                    <div key={sq.id} className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 group hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: forma.color }}>
                        <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{forma.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-on-surface text-sm">{sq.responsavel}</p>
                        <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">
                          {forma.value} • {new Date(sq.data_saque + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {sq.observacao && <span className="ml-2 italic">"{sq.observacao}"</span>}
                        </p>
                      </div>
                      <p className="font-black text-orange-600 dark:text-orange-400 text-base shrink-0">- R$ {parseFloat(sq.valor).toFixed(2)}</p>
                      <button onClick={() => handleExcluirSaque(sq.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-all shrink-0">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* INSCRITOS — CARDS */}
          <div className="p-6">
            <h5 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              Inscritos e Pagamentos ({inscritos.length})
            </h5>

            {inscritos.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-200">person_search</span>
                <p className="text-slate-400 font-bold italic mt-2">Nenhum inscrito para este evento ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inscritos.map(ins => {
                  const isMp = !ins.manual
                  const isConfirmado = ins.status === 'confirmada'
                  const initials = (ins.nome_participante || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
                  return (
                    <div key={ins.id} className={`flex items-center gap-4 p-4 rounded-2xl border group transition-all hover:shadow-sm ${
                      isConfirmado
                        ? 'bg-green-50/50 dark:bg-emerald-500/5 border-green-100 dark:border-emerald-500/10 hover:bg-green-50 dark:hover:bg-emerald-500/10'
                        : 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                    }`}>
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-sm text-white ${
                        isConfirmado ? 'bg-green-500' : 'bg-amber-400'
                      }`}>
                        {initials}
                      </div>

                      {/* Dados principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-on-surface text-sm truncate">{ins.nome_participante}</p>
                          {/* Origem: MP ou Manual */}
                          {isMp ? (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: '#009EE3' }}>
                              MERCADO PAGO
                            </span>
                          ) : (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                              MANUAL
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-on-surface-variant/60 truncate mt-0.5">
                          {ins.email_participante || 'E-mail não informado'}
                          {ins.whatsapp && <span className="ml-2">• {ins.whatsapp}</span>}
                        </p>
                      </div>

                      {/* Status */}
                      <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide shrink-0 ${
                        isConfirmado ? 'bg-green-100 dark:bg-emerald-500/20 text-green-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {isConfirmado ? 'check_circle' : 'schedule'}
                        </span>
                        {isConfirmado ? 'Confirmado' : 'Pendente'}
                      </span>

                      {/* Valor */}
                      <div className="text-right shrink-0">
                        <p className={`text-base font-black font-mono ${isConfirmado ? 'text-green-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          R$ {parseFloat(ins.valor_pago || 0).toFixed(2)}
                        </p>
                        <p className="text-[9px] text-on-surface-variant/50 dark:text-slate-400 font-bold">
                          {new Date(ins.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {/* Ações — aparecem no hover */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!isConfirmado && (
                          <button onClick={() => handleConfirmarPagamento(ins.id)}
                            className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Confirmar pagamento">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          </button>
                        )}
                        {ins.manual && (
                          <button onClick={() => handleDeleteInscricao(ins.id)}
                            className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                            title="Excluir lançamento">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════ MODAL LANÇAMENTO MANUAL ══════════ */}
      {showModalManual && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-outline-variant/20 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span> Lançamento Manual
            </h3>
            <form onSubmit={handleLancamentoManual} className="space-y-4">
              {[
                { label: 'Nome do Participante', key: 'nome', type: 'text', required: true },
                { label: 'E-mail (Opcional)', key: 'email', type: 'email' },
                { label: 'WhatsApp (Opcional)', key: 'whatsapp', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{f.label}</label>
                  <input required={f.required} type={f.type} value={novoLancamento[f.key]}
                    onChange={e => setNovoLancamento({...novoLancamento, [f.key]: e.target.value})}
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor Recebido (R$)</label>
                <input required type="number" step="0.01" value={novoLancamento.valor}
                  onChange={e => setNovoLancamento({...novoLancamento, valor: e.target.value})}
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none font-mono font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => setShowModalManual(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/80 active:scale-95 transition-all">Confirmar e Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL REGISTRAR SAQUE ══════════ */}
      {showModalSaque && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-outline-variant/20 overflow-hidden animate-in zoom-in duration-300">
            
            {/* Header do modal — gradiente laranja */}
            <div className="p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Registrar Saque</p>
                    <p className="font-black text-lg leading-tight">{eventoSelecionado?.nome}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/15 backdrop-blur rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase opacity-70 mb-0.5">Arrecadado</p>
                    <p className="font-black">R$ {(eventoSelecionado?.totalArrecadado || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase opacity-70 mb-0.5">Já Sacado</p>
                    <p className="font-black">R$ {totalSacado.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/30 backdrop-blur rounded-xl p-3 border border-white/40">
                    <p className="text-[9px] font-black uppercase opacity-80 mb-0.5">💰 Disponível</p>
                    <p className="font-black text-lg">R$ {saldoDisponivel.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegistrarSaque} className="p-6 space-y-4">
              {/* Valor */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor do Saque (R$) *</label>
                <div className="relative mt-1">
                  <input
                    required type="number" step="0.01" max={saldoDisponivel}
                    value={novoSaque.valor}
                    onChange={e => setNovoSaque({...novoSaque, valor: e.target.value})}
                    placeholder="0,00"
                    className={`w-full bg-surface-container-low border rounded-xl p-3 pl-4 text-xl font-black font-mono focus:ring-2 outline-none transition-colors ${
                      novoSaque.valor && parseFloat(novoSaque.valor) > saldoDisponivel
                        ? 'border-red-400 focus:ring-red-400 bg-red-50'
                        : 'border-outline-variant/20 focus:ring-orange-400'
                    }`}
                  />
                  {novoSaque.valor && parseFloat(novoSaque.valor) > saldoDisponivel && (
                    <p className="text-xs text-red-500 font-bold mt-1 ml-1">⚠️ Valor maior que o saldo disponível</p>
                  )}
                  {novoSaque.valor && parseFloat(novoSaque.valor) <= saldoDisponivel && parseFloat(novoSaque.valor) > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-1 ml-1">
                      Saldo restante: R$ {(saldoDisponivel - parseFloat(novoSaque.valor)).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Forma do Saque *</label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {FORMAS_PAGAMENTO.map(f => (
                    <button
                      key={f.value} type="button"
                      onClick={() => setNovoSaque({...novoSaque, forma_pagamento: f.value})}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center ${
                        novoSaque.forma_pagamento === f.value
                          ? 'border-transparent text-white shadow-md scale-105'
                          : 'border-outline-variant/20 text-on-surface-variant hover:border-orange-300'
                      }`}
                      style={novoSaque.forma_pagamento === f.value ? { backgroundColor: f.color } : {}}
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                      <span className="text-[9px] font-black leading-tight">{f.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsável */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Responsável pelo Saque *</label>
                <input required type="text" value={novoSaque.responsavel}
                  onChange={e => setNovoSaque({...novoSaque, responsavel: e.target.value})}
                  placeholder="Nome de quem realizou o saque"
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
              </div>

              {/* Data + Observação */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data do Saque</label>
                  <input type="date" value={novoSaque.data_saque}
                    onChange={e => setNovoSaque({...novoSaque, data_saque: e.target.value})}
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observação</label>
                  <input type="text" value={novoSaque.observacao}
                    onChange={e => setNovoSaque({...novoSaque, observacao: e.target.value})}
                    placeholder="Ex: pagamento fornecedor"
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => setShowModalSaque(false)}
                  className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingSaque || (novoSaque.valor && parseFloat(novoSaque.valor) > saldoDisponivel)}
                  className="px-6 py-3.5 text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)' }}>
                  {savingSaque ? '⏳ Registrando...' : '✅ Registrar Saque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

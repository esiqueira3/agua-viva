import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'
import { usePermissions } from '../context/PermissionsContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const FORMAS_PAGAMENTO = [
  { value: 'PIX',           icon: 'qr_code_2',         color: '#32BCAD' },
  { value: 'Transferência', icon: 'account_balance',    color: '#3B82F6' },
  { value: 'Dinheiro',      icon: 'payments',           color: '#10B981' },
  { value: 'Cheque',        icon: 'receipt_long',       color: '#8B5CF6' },
  { value: 'Cartão',        icon: 'credit_card',        color: '#F59E0B' },
]

const ITENS_POR_PAGINA = 9

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
  const { canAccess, membroId, meusDepartamentos, isAdmin, loading: loadingPermissions } = usePermissions()
  const [inscritos, setInscritos] = useState([])
  const [saques, setSaques] = useState([])
  const [resumoDepto, setResumoDepto] = useState({})
  
  // Modais
  const [showModalManual, setShowModalManual] = useState(false)
  const [showModalSaque, setShowModalSaque] = useState(false)
  const [qrModalData, setQrModalData] = useState(null)
  const [savingSaque, setSavingSaque] = useState(false)
  const [showModalInfo, setShowModalInfo] = useState(false)
  const [infoInscritoData, setInfoInscritoData] = useState(null)
  
  // Filtros
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString())
  const [filtroDepto, setFiltroDepto] = useState('Todos')
  const [listaDeptos, setListaDeptos] = useState([])
  const [paginaAtual, setPaginaAtual] = useState(1)
 
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
    setPaginaAtual(1) // Sempre reseta a página ao carregar novos dados
    let query = supabase
      .from('eventos')
      .select('*, departamentos ( id, nome ), inscricoes ( valor_pago, status )')
      .eq('pago', true)
 
    // APLICAÇÃO DO FILTRO DE SEGURANÇA (RBAC)
    if (canAccess('menu_financeiro_filtro_lider') && !isAdmin) {
      const securityFilters = []
      if (membroId) securityFilters.push(`lider_responsavel_id.eq.${membroId}`)
      if (meusDepartamentos.length > 0) {
        securityFilters.push(`departamento_id.in.(${meusDepartamentos.join(',')})`)
      }

      if (securityFilters.length > 0) {
        query = query.or(securityFilters.join(','))
      } else {
        // Se é líder mas não tem nada vinculado, não vê nada
        setEventos([])
        setLoading(false)
        return
      }
    }

    // FILTRO DE DEPARTAMENTO (ADMIN)
    if (isAdmin && filtroDepto !== 'Todos') {
      query = query.eq('departamento_id', filtroDepto)
    }

    // FILTRO DE ANO
    if (filtroAno !== 'Todos') {
      const startOfYear = `${filtroAno}-01-01`
      const endOfYear = `${filtroAno}-12-31`
      query = query.gte('data_evento', startOfYear).lte('data_evento', endOfYear)
    }

    const { data } = await query.order('data_evento', { ascending: false })

    if (isAdmin) {
      const { data: deptosData } = await supabase.from('departamentos').select('id, nome').order('nome')
      if (deptosData) setListaDeptos(deptosData)
    }
 
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

  const { eventosPaginados, totalPaginas } = useMemo(() => {
    const total = Math.ceil(eventos.length / ITENS_POR_PAGINA)
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    const fim = inicio + ITENS_POR_PAGINA
    const paginados = eventos.slice(inicio, fim)
    return { eventosPaginados: paginados, totalPaginas: total }
  }, [eventos, paginaAtual])
 
  useEffect(() => { 
    if (!loadingPermissions) {
      loadFinanceiro() 
    }
  }, [membroId, isAdmin, meusDepartamentos, loadingPermissions, filtroAno, filtroDepto])

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
      supabase.from('inscricoes').select('id, evento_id, nome_participante, email_participante, whatsapp, valor_pago, status, pagamento_id, created_at, manual, saude_info, alergia_info, camiseta_tamanho, quer_camiseta, membro_agua_viva, nome_conjuge, whatsapp_conjuge, nome_pai, whatsapp_pai, nome_mae, whatsapp_mae').eq('evento_id', evento.id).order('created_at', { ascending: false }),
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
    if (!window.confirm('⚠️ Deseja realmente excluir este registro de inscrição?')) return
    await supabase.from('inscricoes').delete().eq('id', id)
    await verDetalhes(eventoSelecionado)
    await loadFinanceiro()
  }

  const handleConfirmarPagamento = async (inscricaoId) => {
    await supabase.from('inscricoes').update({ status: 'confirmada' }).eq('id', inscricaoId)
    await verDetalhes(eventoSelecionado)
  }

  const consultarMP = async () => {
    if (!eventoSelecionado) return
    setLoading(true)
    try {
      const { data: config } = await supabase.from('config_global').select('valor').eq('chave', 'MP_ACCESS_TOKEN').single()
      if (!config?.valor) throw new Error('Token do Mercado Pago não configurado!')

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?status=approved&sort=date_created&criteria=desc&limit=50`, {
        headers: { 'Authorization': `Bearer ${config.valor}` }
      })
      
      if (!mpResponse.ok) throw new Error('Erro ao consultar API do Mercado Pago')
      const mpData = await mpResponse.json()
      const payments = mpData.results || []

      let recuperados = 0
      let atualizados = 0

      for (const payment of payments) {
        const metadataEventoId = payment.metadata?.evento_id
        const extRef = payment.external_reference
        const isThisEvent = metadataEventoId === eventoSelecionado.id || extRef === eventoSelecionado.id || payment.description?.includes(eventoSelecionado.id.substring(0,8))

        if (!isThisEvent) continue

        const { data: existente } = await supabase
          .from('inscricoes')
          .select('id, status')
          .or(`pagamento_id.eq.${payment.id},id.eq.${extRef}`)
          .maybeSingle()

        if (existente) {
          if (existente.status !== 'confirmada') {
            await supabase.from('inscricoes').update({ status: 'confirmada', valor_pago: payment.transaction_amount, pagamento_id: String(payment.id) }).eq('id', existente.id)
            atualizados++
          }
        } else {
          // 3. RECUPERAÇÃO MÁGICA: Se não existe no nosso banco, vamos criar!
          let nome = "Participante MP"
          let email = payment.payer?.email || ""
          let whatsapp = ""

          // Tentar pegar do additional_info (mais rico em detalhes)
          if (payment.additional_info?.payer?.first_name) {
            nome = `${payment.additional_info.payer.first_name} ${payment.additional_info.payer.last_name || ""}`.trim()
            if (payment.additional_info.payer.phone?.number) {
              whatsapp = payment.additional_info.payer.phone.number
            }
          } else if (payment.payer?.first_name) {
            nome = `${payment.payer.first_name} ${payment.payer.last_name || ""}`.trim()
          }

          try {
            if (extRef) {
              // Se o JSON estiver inteiro, parse normal
              if (extRef.startsWith('{') && extRef.endsWith('}')) {
                const p = JSON.parse(extRef)
                nome = p.nome || nome
                email = p.email || email
                whatsapp = p.whatsapp || whatsapp
              } else if (extRef.includes('"nome":"')) {
                // SE O JSON ESTIVER CORTADO (nosso caso!), vamos "garimpar" com Regex
                const nomeMatch = extRef.match(/"nome":"(.*?)"/)
                if (nomeMatch) nome = nomeMatch[1]
                
                const emailMatch = extRef.match(/"email":"(.*?)"/)
                if (emailMatch) email = emailMatch[1]
                
                const whatsappMatch = extRef.match(/"whatsapp":"(.*?)"/)
                if (whatsappMatch) whatsapp = whatsappMatch[1]
              }
            }
          } catch(e) {
            console.warn("⚠️ Falha ao garimpar dados do extRef:", e)
          }

          const { error: insErr } = await supabase.from('inscricoes').insert([{
            evento_id: eventoSelecionado.id,
            nome_participante: nome,
            email_participante: email,
            whatsapp: whatsapp,
            valor_pago: payment.transaction_amount,
            pagamento_id: String(payment.id),
            status: 'confirmada'
          }])

          if (insErr) {
            console.error("❌ Erro ao inserir inscrição recuperada:", insErr)
          } else {
            recuperados++
          }
        }
      }

      alert(`✅ Sincronização Concluída!\n\n- ${atualizados} inscrições atualizadas.\n- ${recuperados} inscrições recuperadas do Mercado Pago.`)
      
      // Atualizar lista de inscritos sem fechar o painel
      const { data: freshInsc } = await supabase.from('inscricoes').select('id, evento_id, nome_participante, email_participante, whatsapp, valor_pago, status, pagamento_id, created_at, manual, saude_info, alergia_info, camiseta_tamanho, quer_camiseta, membro_agua_viva, nome_conjuge, whatsapp_conjuge, nome_pai, whatsapp_pai, nome_mae, whatsapp_mae').eq('evento_id', eventoSelecionado.id).order('created_at', { ascending: false })
      if (freshInsc) setInscritos(freshInsc)
      
      // Atualizar o total arrecadado no objeto do evento selecionado
      const novoTotal = (freshInsc || []).filter(i => i.status === 'confirmada').reduce((sum, i) => sum + (parseFloat(i.valor_pago) || 0), 0)
      setEventoSelecionado(prev => ({ ...prev, totalArrecadado: novoTotal, qtdeConfirmados: (freshInsc || []).filter(i => i.status === 'confirmada').length }))

      await loadFinanceiro()

    } catch (err) {
      console.error('Erro ao sincronizar:', err)
      alert('❌ Erro na sincronização: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!eventoSelecionado || inscritos.length === 0) return

    const doc = jsPDF()
    const tableColumn = ["Nome", "WhatsApp", "Status", "Valor", "Membro", "Cônjuge", "Pais", "Camiseta"]
    const tableRows = []

    inscritos.forEach(ins => {
      const rowData = [
        ins.nome_participante,
        ins.whatsapp || "-",
        ins.status === 'confirmada' ? 'CONFIRMADO' : 'PENDENTE',
        `R$ ${parseFloat(ins.valor_pago || 0).toFixed(2)}`,
        ins.membro_agua_viva || "-",
        ins.nome_conjuge ? `${ins.nome_conjuge} (${ins.whatsapp_conjuge || 'N/I'})` : "-",
        `${ins.nome_pai || 'P: -'} / ${ins.nome_mae || 'M: -'}`,
        ins.quer_camiseta ? `SIM (${ins.camiseta_tamanho})` : "NÃO"
      ]
      tableRows.push(rowData)
    })

    // Header do PDF
    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text("Relatório de Inscritos - Água Viva", 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Evento: ${eventoSelecionado.nome}`, 14, 30)
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, 14, 37)

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [40, 93, 169], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 }, // Nome
        4: { cellWidth: 20 }, // Membro
        5: { cellWidth: 30 }, // Cônjuge
        6: { cellWidth: 40 }, // Pais
      }
    })

    doc.save(`Inscritos_${eventoSelecionado.nome.replace(/\s+/g, '_')}.pdf`)
  }

  const exportToExcel = () => {
    if (!eventoSelecionado || inscritos.length === 0) return

    const data = inscritos.map(ins => ({
      "Nome": ins.nome_participante,
      "E-mail": ins.email_participante || "-",
      "WhatsApp": ins.whatsapp || "-",
      "Status": ins.status === 'confirmada' ? 'CONFIRMADO' : 'PENDENTE',
      "Valor Pago": parseFloat(ins.valor_pago || 0),
      "Membro Água Viva": ins.membro_agua_viva || "-",
      "Cônjuge": ins.nome_conjuge || "-",
      "WhatsApp Cônjuge": ins.whatsapp_conjuge || "-",
      "Pai": ins.nome_pai || "-",
      "WhatsApp Pai": ins.whatsapp_pai || "-",
      "Mãe": ins.nome_mae || "-",
      "WhatsApp Mãe": ins.whatsapp_mae || "-",
      "Saúde": ins.saude_info || "-",
      "Alergias": ins.alergia_info || "-",
      "Quer Camiseta": ins.quer_camiseta ? "SIM" : "NÃO",
      "Tamanho Camiseta": ins.camiseta_tamanho || "-"
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos")
    
    // Ajuste de largura das colunas
    const wscols = [
      {wch: 30}, // Nome
      {wch: 25}, // Email
      {wch: 15}, // WhatsApp
      {wch: 12}, // Status
      {wch: 10}, // Valor
      {wch: 20}, // Membro
      {wch: 25}, // Cônjuge
      {wch: 15}, // Zap Cônjuge
      {wch: 25}, // Pai
      {wch: 15}, // Zap Pai
      {wch: 25}, // Mãe
      {wch: 15}, // Zap Mãe
      {wch: 30}, // Saúde
      {wch: 30}, // Alergias
      {wch: 12}, // Camiseta
      {wch: 10}  // Tamanho
    ]
    worksheet['!cols'] = wscols

    XLSX.writeFile(workbook, `Inscritos_${eventoSelecionado.nome.replace(/\s+/g, '_')}.xlsx`)
  }

  const totalGlobalArrecadado = eventos.reduce((s, ev) => s + (ev.totalArrecadado || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <PageHeader title="Gestão Financeira e Arrecadação" icon="monetization_on">
        <div className="flex items-center gap-3">
          {/* Filtro de Ano */}
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-on-surface-variant/50 ml-1 mb-1">Filtrar Ano</span>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant/40 group-focus-within:text-primary transition-colors">calendar_today</span>
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl text-xs font-black text-on-surface outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all hover:bg-surface-container-low shadow-sm"
              >
                {['Todos', ...Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())].map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 pointer-events-none text-base">expand_more</span>
            </div>
          </div>

          {/* Filtro de Departamento (Apenas Admin) */}
          {isAdmin && (
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-on-surface-variant/50 ml-1 mb-1">Departamento</span>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant/40 group-focus-within:text-primary transition-colors">hub</span>
                <select
                  value={filtroDepto}
                  onChange={(e) => setFiltroDepto(e.target.value)}
                  className="pl-9 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl text-xs font-black text-on-surface outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all hover:bg-surface-container-low shadow-sm max-w-[200px]"
                >
                  <option value="Todos">Todos</option>
                  {listaDeptos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 pointer-events-none text-base">expand_more</span>
              </div>
            </div>
          )}
        </div>
      </PageHeader>

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
      </div>

      {/* GRID DE EVENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center p-16 gap-3">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
            <p className="text-sm font-bold text-on-surface-variant/50">Carregando...</p>
          </div>
        ) : eventosPaginados.length === 0 ? (
          <div className="col-span-3 text-center py-16">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">monetization_on</span>
            <p className="font-bold text-on-surface-variant/40 mt-2">Nenhum evento pago cadastrado ainda.</p>
          </div>
        ) : eventosPaginados.map(ev => (
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
              
              <div className="flex items-end gap-3">
                <div className="flex-1 min-w-0">
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

                {/* QR Code Lateral */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrModalData({ id: ev.id, nome: ev.nome });
                  }}
                  className={`shrink-0 p-1.5 rounded-2xl border cursor-zoom-in transition-transform hover:scale-105 active:scale-95 ${
                    eventoSelecionado?.id === ev.id 
                      ? 'bg-white/10 border-white/20 shadow-inner' 
                      : 'bg-white border-outline-variant/5 shadow-sm'
                  }`}
                  title="Clique para ampliar"
                >
                   <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/inscricao/' + ev.id)}`}
                      alt="QR Link"
                      className="w-14 h-14 rounded-lg"
                   />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* PAGINADOR */}
        {totalPaginas > 1 && (
          <div className="col-span-1 md:col-span-3 flex justify-center items-center gap-2 mt-4 pb-4">
            <button
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="p-2.5 rounded-xl border border-outline-variant/10 bg-surface-container-lowest text-on-surface hover:bg-primary/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back_ios</span>
            </button>
            
            <div className="flex items-center gap-1.5 px-3">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPaginaAtual(p)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                    paginaAtual === p
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-primary/5 border border-outline-variant/5'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="p-2.5 rounded-xl border border-outline-variant/10 bg-surface-container-lowest text-on-surface hover:bg-primary/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
            </button>
          </div>
        )}
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

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
               <h5 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                 Inscritos e Pagamentos ({inscritos.length})
               </h5>

               {inscritos.length > 0 && (
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={exportToPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] border border-red-100 hover:bg-red-100 transition-all active:scale-95 shadow-sm"
                    >
                       <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                       EXPORTAR PDF
                    </button>
                    <button 
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-[10px] border border-green-100 hover:bg-green-100 transition-all active:scale-95 shadow-sm"
                    >
                       <span className="material-symbols-outlined text-sm">table_chart</span>
                       EXPORTAR EXCEL
                    </button>
                 </div>
               )}
            </div>

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

                      {/* Ações — sempre visíveis */}
                      <div className="flex items-center gap-1.5 shrink-0">
                             <button onClick={() => { setInfoInscritoData(ins); setShowModalInfo(true); }}
                             className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                             title="Ver Ficha do Inscrito">
                             <span className="material-symbols-outlined text-[16px]">assignment</span>
                           </button>
                          {!isConfirmado && (
                            <button onClick={() => handleConfirmarPagamento(ins.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                              title="Confirmar pagamento">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            </button>
                          )}
                        {(ins.manual || !isConfirmado || isAdmin) && (
                          <button onClick={() => handleDeleteInscricao(ins.id)}
                            className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                            title="Excluir inscrição">
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
                  <input 
                    required={f.required} 
                    type={f.type} 
                    value={novoLancamento[f.key]}
                    onChange={e => {
                      const val = f.key === 'nome' ? e.target.value.toUpperCase() : e.target.value
                      setNovoLancamento({...novoLancamento, [f.key]: val})
                    }}
                    className={`w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none ${f.key === 'nome' ? 'uppercase' : ''}`} 
                  />
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
                  onChange={e => setNovoSaque({...novoSaque, responsavel: e.target.value.toUpperCase()})}
                  placeholder="Nome de quem realizou o saque"
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none uppercase" />
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
                    onChange={e => setNovoSaque({...novoSaque, observacao: e.target.value.toUpperCase()})}
                    placeholder="Ex: pagamento fornecedor"
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none uppercase" />
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

        {/* ══════════ MODAL FICHA DO INSCRITO (NOVO) ══════════ */}
        {showModalInfo && infoInscritoData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header do Modal */}
                <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none">
                      <span className="material-symbols-outlined text-8xl">account_circle</span>
                   </div>
                   
                   <div className="relative flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Ficha de Inscrição</p>
                         <h3 className="text-2xl font-black leading-tight uppercase tracking-tight">{infoInscritoData.nome_participante}</h3>
                         <div className="flex items-center gap-3 mt-4 text-xs font-bold opacity-90">
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur">
                               <span className="material-symbols-outlined text-sm">mail</span>
                               {infoInscritoData.email_participante || 'Sem e-mail'}
                            </div>
                            {infoInscritoData.whatsapp && (
                               <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur">
                                  <span className="material-symbols-outlined text-sm">call</span>
                                  {infoInscritoData.whatsapp}
                               </div>
                            )}
                         </div>
                      </div>
                      <button onClick={() => setShowModalInfo(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                         <span className="material-symbols-outlined">close</span>
                      </button>
                   </div>
                </div>

                {/* Conteúdo da Ficha */}
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   
                   {/* Seção de Saúde */}
                   <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[2rem] space-y-3">
                      <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                         <span className="material-symbols-outlined">medical_information</span>
                         <h4 className="text-xs font-black uppercase tracking-widest">Saúde e Atenção Especial</h4>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                         {infoInscritoData.saude_info || "Nenhuma observação de saúde informada."}
                      </p>
                   </div>

                   {/* Seção de Alergias */}
                   <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] space-y-3">
                      <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                         <span className="material-symbols-outlined">warning</span>
                         <h4 className="text-xs font-black uppercase tracking-widest">Alergias Detectadas</h4>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                         {infoInscritoData.alergia_info || "Nenhuma alergia informada."}
                      </p>
                   </div>

                   {/* Seção de Camiseta */}
                   <div className={`p-6 border rounded-[2rem] space-y-3 ${infoInscritoData.quer_camiseta ? 'bg-primary/5 border-primary/10' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between">
                         <div className={`flex items-center gap-3 ${infoInscritoData.quer_camiseta ? 'text-primary' : 'text-slate-400'}`}>
                            <span className="material-symbols-outlined">apparel</span>
                            <h4 className="text-xs font-black uppercase tracking-widest">Opção de Camiseta</h4>
                         </div>
                         <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${infoInscritoData.quer_camiseta ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {infoInscritoData.quer_camiseta ? 'SOLICITADA' : 'NÃO SOLICITADA'}
                         </span>
                      </div>
                      {infoInscritoData.quer_camiseta && (
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-primary/5">
                           <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary text-xl">
                              {infoInscritoData.camiseta_tamanho}
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">Tamanho Selecionado</p>
                              <p className="text-[10px] text-slate-400 font-medium tracking-tight">O valor já foi incluído no total pago.</p>
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Associação e Família */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Membro */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Membro Água Viva?</p>
                         <p className="text-sm font-bold text-slate-700">{infoInscritoData.membro_agua_viva || "Não informado"}</p>
                      </div>

                      {/* Cônjuge */}
                      <div className={`p-4 border rounded-2xl ${infoInscritoData.nome_conjuge ? 'bg-primary/5 border-primary/10' : 'bg-slate-50 border-slate-100'}`}>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cônjuge</p>
                         <p className="text-sm font-bold text-slate-700">{infoInscritoData.nome_conjuge || "Não informado"}</p>
                         {infoInscritoData.whatsapp_conjuge && <p className="text-xs text-primary font-bold mt-1">{infoInscritoData.whatsapp_conjuge}</p>}
                      </div>

                      {/* Pai */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pai</p>
                         <p className="text-sm font-bold text-slate-700">{infoInscritoData.nome_pai || "Não informado"}</p>
                         {infoInscritoData.whatsapp_pai && <p className="text-xs text-blue-600 font-bold mt-1">{infoInscritoData.whatsapp_pai}</p>}
                      </div>

                      {/* Mãe */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Mãe</p>
                         <p className="text-sm font-bold text-slate-700">{infoInscritoData.nome_mae || "Não informado"}</p>
                         {infoInscritoData.whatsapp_mae && <p className="text-xs text-pink-600 font-bold mt-1">{infoInscritoData.whatsapp_mae}</p>}
                      </div>
                   </div>

                </div>

                {/* Rodapé do Modal */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                   <button 
                     onClick={() => setShowModalInfo(false)}
                     className="px-8 py-3 bg-slate-900 dark:bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-slate-900/20"
                   >
                      Entendido
                   </button>
                </div>

             </div>
          </div>
        )}

       {/* Modal do QR Code Ampliado */}
       {qrModalData && (
         <div 
           className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
           onClick={() => setQrModalData(null)}
         >
           <div 
             className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20"
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
                   <h4 className="text-slate-900 dark:text-white font-black text-xl leading-tight">{qrModalData.nome}</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escaneie para se inscrever</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-100 dark:border-slate-800 shadow-inner">
                   <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/inscricao/' + qrModalData.id)}`} 
                      alt="QR Code Ampliado"
                      className="w-56 h-56 rounded-xl"
                   />
                </div>

                <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                   <button 
                     onClick={() => {
                        const url = `${window.location.origin}/inscricao/${qrModalData.id}`;
                        navigator.clipboard.writeText(url);
                        alert("✅ Link de Inscrição copiado!");
                     }}
                     className="w-full py-4 bg-slate-100 dark:bg-white/10 hover:bg-primary/10 text-slate-600 dark:text-slate-300 hover:text-primary rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                   >
                      <span className="material-symbols-outlined text-sm">link</span>
                      Copiar Link Direto
                   </button>
                   <button 
                     onClick={() => setQrModalData(null)}
                     className="w-full py-4 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20"
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

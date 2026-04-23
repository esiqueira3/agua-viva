import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'
import { usePermissions } from '../context/PermissionsContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx-js-style'

const FORMAS_PAGAMENTO = [
  { value: 'PIX',           icon: 'qr_code_2',         color: '#32BCAD' },
  { value: 'Transferência', icon: 'account_balance',    color: '#3B82F6' },
  { value: 'Dinheiro',      icon: 'payments',           color: '#10B981' },
  { value: 'Cheque',        icon: 'receipt_long',       color: '#8B5CF6' },
  { value: 'Cartão',        icon: 'credit_card',        color: '#F59E0B' },
]

const CATEGORIAS_LANCAMENTO = [
  { value: 'Inscrição', icon: 'assignment_ind', color: '#3B82F6' },
  { value: 'Cantina',   icon: 'restaurant',     color: '#F59E0B' },
  { value: 'Oferta',    icon: 'volunteer_activism', color: '#10B981' },
  { value: 'Dizimo',    icon: 'savings',        color: '#8B5CF6' },
]

const ITENS_POR_PAGINA = 9

function CurrencyDisplay({ value, size = 'lg', className = '' }) {
  const formatted = parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [int, dec] = formatted.split(',')
  return (
    <div className={`flex flex-col ${className}`}>
      <span className={size === 'lg' ? 'text-[10px] lg:text-lg opacity-60 font-bold' : 'text-[8px] opacity-60'}>R$</span>
      <div className="flex items-baseline gap-0.5 leading-tight">
        <span className={size === 'lg' ? 'text-xl lg:text-4xl font-black' : 'text-base lg:text-xl font-black'}>{int}</span>
        <span className={size === 'lg' ? 'text-[9px] lg:text-lg opacity-60' : 'text-[8px] lg:text-xs opacity-60'}>,{dec}</span>
      </div>
    </div>
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
  const [savingInfo, setSavingInfo] = useState(false)
  const [showModalExport, setShowModalExport] = useState(false)
  const [filtrosExport, setFiltrosExport] = useState(['Inscrição'])
  const [formatoExport, setFormatoExport] = useState('excel') // 'excel' ou 'pdf'
  
  // Filtros
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString())
  const [filtroDepto, setFiltroDepto] = useState('Todos')
  const [listaDeptos, setListaDeptos] = useState([])
  const [paginaAtual, setPaginaAtual] = useState(1)
 
  // Forms
  const [novoLancamento, setNovoLancamento] = useState({ 
    nome: '', 
    email: '', 
    whatsapp: '', 
    valor: '', 
    tipo: 'Inscrição',
    data_lancamento: new Date().toISOString().split('T')[0],
    observacao: ''
  })
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
      .select('*, departamentos ( id, nome ), inscricoes ( valor_pago, valor_liquido, status ), saques_eventos ( valor )')
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
         const totalArrecadado = confirmados.reduce((sum, i) => {
           // Se tiver valor_liquido, usa ele. Se não, usa valor_pago (fallback p/ registros antigos ou manuais)
           const v = i.valor_liquido !== null ? parseFloat(i.valor_liquido) : parseFloat(i.valor_pago)
           return sum + (v || 0)
         }, 0)
         const totalSaques = (ev.saques_eventos || []).reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0)
         const saldoDisponivel = totalArrecadado - totalSaques
          
         const deptoNome = ev.departamentos?.nome || 'Geral'
         deptos[deptoNome] = (deptos[deptoNome] || 0) + totalArrecadado
         return { ...ev, totalArrecadado, totalSaques, saldoDisponivel, qtdeInscritos: (ev.inscricoes || []).length, qtdeConfirmados: confirmados.length }
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
      supabase.from('inscricoes').select('id, evento_id, nome_participante, email_participante, whatsapp, valor_pago, valor_liquido, status, pagamento_id, created_at, manual, tipo, data_lancamento, observacao, saude_info, alergia_info, camiseta_tamanho, quer_camiseta, membro_agua_viva, nome_conjuge, whatsapp_conjuge, nome_pai, whatsapp_pai, nome_mae, whatsapp_mae').eq('evento_id', evento.id).order('created_at', { ascending: false }),
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

    const dadosParaSalvar = {
      evento_id: eventoSelecionado.id,
      nome_participante: novoLancamento.nome || 'SEM NOME',
      valor_pago: parseFloat(novoLancamento.valor || 0),
      valor_liquido: parseFloat(novoLancamento.valor || 0),
      status: 'confirmada',
      manual: true,
      tipo: novoLancamento.tipo,
      email_participante: (novoLancamento.tipo === 'Inscrição' && novoLancamento.email) ? novoLancamento.email : null,
      whatsapp: (novoLancamento.tipo === 'Inscrição' && novoLancamento.whatsapp) ? novoLancamento.whatsapp : null,
      data_lancamento: (novoLancamento.tipo !== 'Inscrição' && novoLancamento.data_lancamento) ? novoLancamento.data_lancamento : null,
      observacao: (novoLancamento.tipo !== 'Inscrição' && novoLancamento.observacao) ? novoLancamento.observacao : null
    }

    const { error } = await supabase.from('inscricoes').insert([dadosParaSalvar])

    if (error) {
      console.error("❌ Erro no Supabase:", error)
      alert(`Erro ao salvar: ${error.message}\n${error.hint || ''}`)
      return
    }

    setShowModalManual(false)
    setNovoLancamento({ 
      nome: '', 
      email: '', 
      whatsapp: '', 
      valor: '', 
      tipo: 'Inscrição',
      data_lancamento: new Date().toISOString().split('T')[0],
      observacao: ''
    })
    await verDetalhes(eventoSelecionado)
    await loadFinanceiro()
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

  const handleConfirmarPagamento = async (insc) => {
    const { error } = await supabase.from('inscricoes').update({ 
      status: 'confirmada',
      valor_liquido: insc.valor_liquido || insc.valor_pago 
    }).eq('id', insc.id)
    if (!error) await verDetalhes(eventoSelecionado)
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
        const isThisEvent = metadataEventoId === eventoSelecionado.id || 
                           extRef === eventoSelecionado.id || 
                           payment.description?.includes(eventoSelecionado.id.substring(0,8))

        console.log(`🔍 Analizando ${payment.id}: Ref=${extRef}, Valor=${payment.transaction_amount}, Match=${isThisEvent}`)

        if (!isThisEvent) {
          // Validação extra para UUID antes de consultar o banco (evita erro 400)
          const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
          
          if (extRef && isUUID(extRef)) {
            const { data: inscRef } = await supabase.from('inscricoes').select('evento_id').eq('id', extRef).maybeSingle()
            if (inscRef?.evento_id !== eventoSelecionado.id) continue
          } else {
            continue
          }
        }

        const { data: existente } = await supabase
          .from('inscricoes')
          .select('id, status, valor_liquido')
          .or(`pagamento_id.eq.${payment.id},id.eq.${extRef}`)
          .maybeSingle()

        if (existente) {
          // Tenta pegar o valor líquido de várias formas (API do MP muda conforme o tipo de conta)
          let realNet = payment.transaction_details?.net_received_amount
          
          // Se não achou no campo padrão, tenta calcular pelas taxas
          if (!realNet && payment.fee_details) {
            const totalFees = payment.fee_details.reduce((sum, f) => sum + f.amount, 0)
            realNet = payment.transaction_amount - totalFees
          }

          // Fallback final
          if (!realNet) realNet = payment.transaction_amount
          
          console.log(`📌 ID: ${existente.id} | Bruto: ${payment.transaction_amount} | Líquido MP: ${realNet} | No Banco: ${existente.valor_liquido}`)
          
          // ATUALIZAÇÃO FORÇADA: Se o status não for confirmado OU se o valor no banco for diferente do valor real do MP
          if (existente.status !== 'confirmada' || Number(existente.valor_liquido) !== Number(realNet)) {
            console.log(`✨ Corrigindo valor líquido: ${existente.valor_liquido} -> ${realNet}`)
            await supabase.from('inscricoes').update({ 
              status: 'confirmada', 
              valor_pago: payment.transaction_amount, 
              valor_liquido: realNet,
              pagamento_id: String(payment.id) 
            }).eq('id', existente.id)
            atualizados++
          }
        } else {
          console.log(`🪄 Iniciando recuperação mágica para pagamento ${payment.id}...`)
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
            valor_liquido: realNet,
            pagamento_id: String(payment.id),
            status: 'confirmada',
            tipo: 'Inscrição'
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
      const { data: freshInsc } = await supabase.from('inscricoes').select('id, evento_id, nome_participante, email_participante, whatsapp, valor_pago, valor_liquido, status, pagamento_id, created_at, manual, tipo, data_lancamento, observacao, saude_info, alergia_info, camiseta_tamanho, quer_camiseta, membro_agua_viva, nome_conjuge, whatsapp_conjuge, nome_pai, whatsapp_pai, nome_mae, whatsapp_mae').eq('evento_id', eventoSelecionado.id).order('created_at', { ascending: false })
      if (freshInsc) setInscritos(freshInsc)
      
      // Atualizar o total arrecadado no objeto do evento selecionado
      const novoTotal = (freshInsc || []).filter(i => i.status === 'confirmada').reduce((sum, i) => {
        const v = i.valor_liquido !== null ? parseFloat(i.valor_liquido) : parseFloat(i.valor_pago)
        return sum + (v || 0)
      }, 0)
      setEventoSelecionado(prev => ({ ...prev, totalArrecadado: novoTotal, qtdeConfirmados: (freshInsc || []).filter(i => i.status === 'confirmada').length }))

      await loadFinanceiro()

    } catch (err) {
      console.error('Erro ao sincronizar:', err)
      alert('❌ Erro na sincronização: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateInscrito = async (e) => {
    if (e) e.preventDefault()
    if (!infoInscritoData) return

    setSavingInfo(true)
    try {
      const { error } = await supabase
        .from('inscricoes')
        .update({
          nome_participante: infoInscritoData.nome_participante,
          email_participante: infoInscritoData.email_participante,
          whatsapp: infoInscritoData.whatsapp,
          saude_info: infoInscritoData.saude_info,
          alergia_info: infoInscritoData.alergia_info,
          quer_camiseta: infoInscritoData.quer_camiseta,
          camiseta_tamanho: infoInscritoData.camiseta_tamanho,
          membro_agua_viva: infoInscritoData.membro_agua_viva,
          nome_conjuge: infoInscritoData.nome_conjuge,
          whatsapp_conjuge: infoInscritoData.whatsapp_conjuge,
          nome_pai: infoInscritoData.nome_pai,
          whatsapp_pai: infoInscritoData.whatsapp_pai,
          nome_mae: infoInscritoData.nome_mae,
          whatsapp_mae: infoInscritoData.whatsapp_mae
        })
        .eq('id', infoInscritoData.id)

      if (error) throw error

      alert('✅ Ficha atualizada com sucesso!')
      await verDetalhes(eventoSelecionado)
      setShowModalInfo(false)
    } catch (err) {
      console.error('Erro ao atualizar ficha:', err)
      alert('❌ Erro ao salvar: ' + err.message)
    } finally {
      setSavingInfo(false)
    }
  }

  const exportToPDF = () => {
    if (!eventoSelecionado || inscritos.length === 0) return

    // FILTRO DINÂMICO: Respeita o que o usuário escolheu no modal
    const inscricoesFiltradas = inscritos.filter(ins => {
      const tipoNormalizado = ins.tipo || 'Inscrição'
      return filtrosExport.includes(tipoNormalizado)
    })

    if (inscricoesFiltradas.length === 0) {
      alert("Nenhum registro encontrado para os filtros selecionados.")
      return
    }

    const doc = new jsPDF('l', 'mm', 'a4') // 'l' para landscape (paisagem)
    const tableColumn = ["Nome", "WhatsApp", "Status", "Bruto", "Líquido", "Membro", "Cônjuge", "Pais", "Camiseta"]
    const tableRows = []

    inscricoesFiltradas.forEach(ins => {
      const rowData = [
        ins.nome_participante,
        ins.whatsapp || "-",
        ins.status === 'confirmada' ? 'CONFIRMADO' : 'PENDENTE',
        `R$ ${parseFloat(ins.valor_pago || 0).toFixed(2)}`,
        `R$ ${parseFloat(ins.valor_liquido !== null ? ins.valor_liquido : ins.valor_pago || 0).toFixed(2)}`,
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
        0: { cellWidth: 40 }, // Nome
        1: { cellWidth: 25 }, // WhatsApp
        2: { cellWidth: 25 }, // Status
        3: { cellWidth: 25 }, // Bruto
        4: { cellWidth: 25 }, // Líquido
        5: { cellWidth: 20 }, // Membro
        6: { cellWidth: 40 }, // Cônjuge
        7: { cellWidth: 45 }, // Pais
        8: { cellWidth: 20 }, // Camiseta
      }
    })

    doc.save(`Inscritos_${eventoSelecionado.nome.replace(/\s+/g, '_')}.pdf`)
    setShowModalExport(false)
  }

  const exportToExcel = () => {
    if (!eventoSelecionado || inscritos.length === 0) return

    // FILTRO DINÂMICO: Respeita o que o usuário escolheu no modal
    const inscricoesFiltradas = inscritos.filter(ins => {
      const tipoNormalizado = ins.tipo || 'Inscrição'
      return filtrosExport.includes(tipoNormalizado)
    })

    if (inscricoesFiltradas.length === 0) {
      alert("Nenhum registro encontrado para os filtros selecionados.")
      return
    }

    const data = inscricoesFiltradas.map(ins => {
      const bruto = Number(ins.valor_pago || 0)
      const liquido = Number(ins.valor_liquido !== null ? ins.valor_liquido : ins.valor_pago || 0)
      const taxa = bruto - liquido

      return {
        "Nome": ins.nome_participante,
        "E-mail": ins.email_participante || "-",
        "WhatsApp": ins.whatsapp || "-",
        "Status": ins.status === 'confirmada' ? 'CONFIRMADO' : 'PENDENTE',
        "Valor Bruto": bruto,
        "Valor Líquido": liquido,
        "Taxa MP": taxa > 0 ? taxa : 0,
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
      }
    })

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
    setShowModalExport(false)
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
        {isAdmin && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Total Arrecadado</p>
            <CurrencyDisplay value={totalGlobalArrecadado} className="text-blue-600" />
            <p className="text-[10px] text-on-surface-variant/40 mt-1">{eventos.length} evento{eventos.length !== 1 ? 's' : ''} pagos</p>
          </div>
        )}
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
                  (ev.status === 'Concluído' || ev.status === 'Confirmado') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
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
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${eventoSelecionado?.id === ev.id ? 'text-white/50' : 'text-slate-400'}`}>Disponível</p>
                      <p className={`text-xl font-black ${eventoSelecionado?.id === ev.id ? 'text-white' : 'text-green-600 dark:text-emerald-400'}`}>R$ {ev.saldoDisponivel?.toFixed(2)}</p>
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

            {/* BARRA DE SALDO - FLEXBOX FORÇADO (Vertical no mobile, horizontal no computador) */}
            <div className="mt-5 flex flex-col lg:flex-row gap-4">
              {/* SALDO DISPONÍVEL - AGORA EM PRIMEIRO E VERDE */}
              <div className={`flex-1 rounded-[2rem] p-5 lg:p-6 border shadow-sm ${saldoDisponivel > 0 ? 'bg-green-50 dark:bg-emerald-500/10 border-green-100' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${saldoDisponivel > 0 ? 'text-green-600/60' : 'text-slate-400'}`}>
                  Saldo Disponível
                </p>
                <CurrencyDisplay value={saldoDisponivel} className={saldoDisponivel > 0 ? 'text-green-700 dark:text-emerald-400' : 'text-slate-400'} size="lg" />
              </div>
              
              <div className="flex-1 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/10 rounded-[2rem] p-5 lg:p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600/60 mb-2">Total Sacado</p>
                <CurrencyDisplay value={totalSacado} className="text-red-600 dark:text-red-400" size="lg" />
                <div className="mt-4 w-full bg-red-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${pctSacado}%` }} />
                </div>
                <p className="text-[10px] font-bold text-red-400 mt-2">{pctSacado}% sacado</p>
              </div>

              {/* TOTAL ARRECADADO - AGORA EM ÚLTIMO E AZUL */}
              <div className="flex-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/10 rounded-[2rem] p-5 lg:p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60 mb-2">Total Arrecadado</p>
                <CurrencyDisplay value={eventoSelecionado.totalArrecadado} className="text-blue-700 dark:text-blue-400" size="lg" />
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE SAQUES */}
          {saques.length > 0 && (
            <div className="p-6 border-b border-outline-variant/10">
              <h5 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[16px] text-red-500">account_balance_wallet</span>
                Histórico de Saques ({saques.length})
              </h5>
              <div className="space-y-2">
                {saques.map(sq => {
                  const forma = FORMAS_PAGAMENTO.find(f => f.value === sq.forma_pagamento) || FORMAS_PAGAMENTO[0]
                  return (
                    <div key={sq.id} className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 group hover:bg-red-100/50 dark:hover:bg-red-500/20 transition-colors">
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
                      <p className="font-black text-red-600 dark:text-red-400 text-base shrink-0">- R$ {parseFloat(sq.valor).toFixed(2)}</p>
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
                      onClick={() => { setFormatoExport('pdf'); setShowModalExport(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] border border-red-100 hover:bg-red-100 transition-all active:scale-95 shadow-sm"
                    >
                       <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                       EXPORTAR PDF
                    </button>
                    <button 
                      onClick={() => { setFormatoExport('excel'); setShowModalExport(true); }}
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
                    <div key={ins.id} className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-2xl border group transition-all hover:shadow-sm ${
                      isConfirmado
                        ? 'bg-green-50/50 dark:bg-emerald-500/5 border-green-100 dark:border-emerald-500/10 hover:bg-green-50 dark:hover:bg-emerald-500/10'
                        : 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                    }`}>
                      {/* Bloco Superior: Avatar + Nome + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {ins.manual && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-[10px]">
                                  {CATEGORIAS_LANCAMENTO.find(c => c.value === ins.tipo)?.icon || 'sell'}
                                </span>
                                {ins.tipo || 'Inscrição'}
                              </div>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              {ins.manual && ins.tipo !== 'Inscrição' ? (
                                <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400 truncate flex items-center gap-2">
                                  {ins.observacao && (
                                    <span className="flex items-center gap-1 italic text-primary dark:text-blue-400">
                                      <span className="material-symbols-outlined text-[12px]">info</span>
                                      {ins.observacao}
                                    </span>
                                  )}
                                  {ins.data_lancamento && (
                                    <span className="text-slate-400">• {new Date(ins.data_lancamento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400 truncate">
                                  {ins.email_participante || (ins.manual ? '' : 'E-mail não informado')}
                                  {ins.whatsapp && <span className="ml-2">• {ins.whatsapp}</span>}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
  
                      {/* Bloco Inferior: Status + Valor + Ações */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-none border-outline-variant/10">
                        {/* Status */}
                        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide shrink-0 ${
                          isConfirmado ? 'bg-green-100 dark:bg-emerald-500/20 text-green-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isConfirmado ? 'check_circle' : 'schedule'}
                          </span>
                          {isConfirmado ? 'Confirmado' : 'Pendente'}
                        </span>
  
                        {/* Valor e Data */}
                        <div className="text-right shrink-0 flex flex-col">
                          {ins.valor_liquido !== null && ins.valor_liquido !== ins.valor_pago ? (
                            <>
                              <p className="text-[10px] text-on-surface-variant/40 line-through leading-none mb-1">
                                R$ {parseFloat(ins.valor_pago || 0).toFixed(2)}
                              </p>
                              <p className={`text-base font-black font-mono leading-none ${isConfirmado ? 'text-green-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                R$ {parseFloat(ins.valor_liquido || 0).toFixed(2)}
                                <span className="text-[8px] ml-1 opacity-50 uppercase">Liq.</span>
                              </p>
                            </>
                          ) : (
                            <p className={`text-base font-black font-mono leading-none ${isConfirmado ? 'text-green-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              R$ {parseFloat(ins.valor_pago || 0).toFixed(2)}
                            </p>
                          )}
                          <p className="text-[9px] text-on-surface-variant/50 dark:text-slate-400 font-bold mt-1">
                            {new Date(ins.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {/* Ações — sempre visíveis */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(!ins.tipo || ins.tipo === 'Inscrição') && (
                          <button onClick={() => { setInfoInscritoData(ins); setShowModalInfo(true); }}
                            className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Ver Ficha do Inscrito">
                            <span className="material-symbols-outlined text-[16px]">assignment</span>
                          </button>
                        )}
                          {!isConfirmado && (
                            <button onClick={() => handleConfirmarPagamento(ins)}
                              className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                              title="Confirmar pagamento">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            </button>
                          )}
                        {(ins.manual || !isConfirmado || isAdmin) && (
                          <button onClick={() => handleDeleteInscricao(ins.id)}
                            className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                            title={`Excluir ${ins.tipo || 'Inscrição'}`}>
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
            <div className="mb-6">
              <h3 className="text-2xl font-black text-primary mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span> Lançamento Manual
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{eventoSelecionado?.nome}</p>
            </div>
            <form onSubmit={handleLancamentoManual} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor Recebido (R$) *</label>
                <input required type="number" step="0.01" value={novoLancamento.valor}
                  onChange={e => setNovoLancamento({...novoLancamento, valor: e.target.value})}
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none font-mono font-bold" />
              </div>

              {/* Seletor de Categoria */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria do Lançamento *</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {CATEGORIAS_LANCAMENTO.map(cat => (
                    <button
                      key={cat.value} type="button"
                      onClick={() => setNovoLancamento({...novoLancamento, tipo: cat.value})}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                        novoLancamento.tipo === cat.value
                          ? 'border-transparent text-white shadow-md scale-105'
                          : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/30'
                      }`}
                      style={novoLancamento.tipo === cat.value ? { backgroundColor: cat.color } : {}}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                      <span className="text-[8px] font-black leading-tight">{cat.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição do Lançamento *</label>
                  <input 
                    required 
                    type="text" 
                    value={novoLancamento.nome}
                    onChange={e => setNovoLancamento({...novoLancamento, nome: e.target.value.toUpperCase()})}
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none uppercase" 
                  />
                </div>

                {/* Campos Condicionais: INSCRIÇÃO */}
                {novoLancamento.tipo === 'Inscrição' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail (Opcional)</label>
                      <input 
                        type="email" 
                        value={novoLancamento.email}
                        onChange={e => setNovoLancamento({...novoLancamento, email: e.target.value})}
                        className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp (Opcional)</label>
                      <input 
                        type="tel" 
                        value={novoLancamento.whatsapp}
                        onChange={e => setNovoLancamento({...novoLancamento, whatsapp: e.target.value})}
                        className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" 
                      />
                    </div>
                  </div>
                )}

                {/* Campos Condicionais: CANTINA / OFERTA / DIZIMO */}
                {novoLancamento.tipo !== 'Inscrição' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data do Lançamento</label>
                      <input 
                        type="date" 
                        value={novoLancamento.data_lancamento}
                        onChange={e => setNovoLancamento({...novoLancamento, data_lancamento: e.target.value})}
                        className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observação (Opcional)</label>
                      <input 
                        type="text" 
                        value={novoLancamento.observacao}
                        onChange={e => setNovoLancamento({...novoLancamento, observacao: e.target.value.toUpperCase()})}
                        placeholder="Ex: Cantina, Oferta, Dizimo"
                        className="w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none uppercase" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => { 
                  setShowModalManual(false); 
                  setNovoLancamento({ 
                    nome: '', email: '', whatsapp: '', valor: '', tipo: 'Inscrição', 
                    data_lancamento: new Date().toISOString().split('T')[0], observacao: '' 
                  }); 
                }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/80 active:scale-95 transition-all">Registrar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL REGISTRAR SAQUE ══════════ */}
      {showModalSaque && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-outline-variant/20 animate-in zoom-in duration-300">
            <div className="p-8 pb-4">
              <h3 className="text-2xl font-black text-red-500 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span> Registrar Saque
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{eventoSelecionado?.nome}</p>
            </div>

            <form onSubmit={handleRegistrarSaque} className="p-8 pt-0 space-y-4">
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
                      <div className="flex-1">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Editando Ficha de Inscrição</p>
                         <input 
                           type="text"
                           value={infoInscritoData.nome_participante}
                           onChange={e => setInfoInscritoData({...infoInscritoData, nome_participante: e.target.value.toUpperCase()})}
                           className="bg-white/10 hover:bg-white/20 border-b border-white/30 focus:border-white outline-none text-2xl font-black leading-tight uppercase tracking-tight w-full p-1 transition-all"
                         />
                         <div className="flex items-center gap-3 mt-4 text-xs font-bold opacity-90">
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur flex-1">
                               <span className="material-symbols-outlined text-sm">mail</span>
                               <input 
                                 type="email"
                                 value={infoInscritoData.email_participante || ''}
                                 onChange={e => setInfoInscritoData({...infoInscritoData, email_participante: e.target.value})}
                                 placeholder="E-mail"
                                 className="bg-transparent border-none outline-none w-full placeholder:text-white/50"
                               />
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur flex-1">
                               <span className="material-symbols-outlined text-sm">call</span>
                               <input 
                                 type="text"
                                 value={infoInscritoData.whatsapp || ''}
                                 onChange={e => setInfoInscritoData({...infoInscritoData, whatsapp: e.target.value})}
                                 placeholder="WhatsApp"
                                 className="bg-transparent border-none outline-none w-full placeholder:text-white/50"
                               />
                            </div>
                         </div>
                      </div>
                      <button onClick={() => setShowModalInfo(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors ml-4">
                         <span className="material-symbols-outlined">close</span>
                      </button>
                   </div>
                </div>

                {/* Conteúdo da Ficha */}
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                   
                   {/* Seção de Saúde */}
                   <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[2rem] space-y-3">
                      <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                         <span className="material-symbols-outlined">medical_information</span>
                         <h4 className="text-xs font-black uppercase tracking-widest">Saúde e Atenção Especial</h4>
                      </div>
                      <textarea 
                         value={infoInscritoData.saude_info || ""}
                         onChange={e => setInfoInscritoData({...infoInscritoData, saude_info: e.target.value.toUpperCase()})}
                         placeholder="Informe observações médicas importantes..."
                         className="w-full bg-white/50 dark:bg-black/20 border border-red-200/50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic outline-none focus:ring-2 focus:ring-red-400 h-20 resize-none"
                      />
                   </div>

                   {/* Seção de Alergias */}
                   <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] space-y-3">
                      <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                         <span className="material-symbols-outlined">warning</span>
                         <h4 className="text-xs font-black uppercase tracking-widest">Alergias Detectadas</h4>
                      </div>
                      <textarea 
                         value={infoInscritoData.alergia_info || ""}
                         onChange={e => setInfoInscritoData({...infoInscritoData, alergia_info: e.target.value.toUpperCase()})}
                         placeholder="Informe alergias alimentares ou medicamentosas..."
                         className="w-full bg-white/50 dark:bg-black/20 border border-amber-200/50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic outline-none focus:ring-2 focus:ring-amber-400 h-20 resize-none"
                      />
                   </div>

                   {/* Seção de Camiseta */}
                   <div className={`p-6 border rounded-[2rem] space-y-3 ${infoInscritoData.quer_camiseta ? 'bg-primary/5 border-primary/10' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between">
                         <div className={`flex items-center gap-3 ${infoInscritoData.quer_camiseta ? 'text-primary' : 'text-slate-400'}`}>
                            <span className="material-symbols-outlined">apparel</span>
                            <h4 className="text-xs font-black uppercase tracking-widest">Opção de Camiseta</h4>
                         </div>
                         <button 
                           type="button"
                           onClick={() => setInfoInscritoData({...infoInscritoData, quer_camiseta: !infoInscritoData.quer_camiseta})}
                           className={`text-[10px] font-black uppercase px-4 py-2 rounded-full transition-all ${infoInscritoData.quer_camiseta ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}
                         >
                            {infoInscritoData.quer_camiseta ? 'SOLICITADA (CLIQUE P/ REMOVER)' : 'NÃO SOLICITADA (CLIQUE P/ ADICIONAR)'}
                         </button>
                      </div>
                      {infoInscritoData.quer_camiseta && (
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-primary/5">
                            <select 
                               value={infoInscritoData.camiseta_tamanho}
                               onChange={e => setInfoInscritoData({...infoInscritoData, camiseta_tamanho: e.target.value})}
                               className="w-20 h-14 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary text-xl outline-none px-2 cursor-pointer hover:bg-primary/20 transition-all"
                            >
                               {['PP','P','M','G','GG','G1','G2','G3'].map(t => <option key={t} value={t} className="bg-white text-slate-900">{t}</option>)}
                            </select>
                           <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">Tamanho Selecionado</p>
                              <p className="text-[10px] text-slate-400 font-medium tracking-tight">Altere o tamanho no seletor ao lado.</p>
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Associação e Família */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Igreja */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Qual igreja congrega?</p>
                         <input 
                           type="text"
                           value={infoInscritoData.membro_agua_viva || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, membro_agua_viva: e.target.value.toUpperCase()})}
                           placeholder="Nome da Igreja"
                           className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 w-full"
                         />
                      </div>

                      {/* Cônjuge */}
                      <div className={`p-4 border rounded-2xl ${infoInscritoData.nome_conjuge ? 'bg-primary/5 border-primary/10' : 'bg-slate-50 border-slate-100'}`}>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cônjuge</p>
                         <input type="text" value={infoInscritoData.nome_conjuge || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, nome_conjuge: e.target.value.toUpperCase()})}
                           placeholder="Nome do Cônjuge"
                           className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 w-full" />
                         <input type="text" value={infoInscritoData.whatsapp_conjuge || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, whatsapp_conjuge: e.target.value})}
                           placeholder="WhatsApp Cônjuge"
                           className="text-xs text-primary font-bold mt-1 bg-transparent border-none outline-none w-full" />
                      </div>

                      {/* Pai */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pai</p>
                         <input type="text" value={infoInscritoData.nome_pai || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, nome_pai: e.target.value.toUpperCase()})}
                           placeholder="Nome do Pai"
                           className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 w-full" />
                         <input type="text" value={infoInscritoData.whatsapp_pai || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, whatsapp_pai: e.target.value})}
                           placeholder="WhatsApp Pai"
                           className="text-xs text-blue-600 font-bold mt-1 bg-transparent border-none outline-none w-full" />
                      </div>

                      {/* Mãe */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Mãe</p>
                         <input type="text" value={infoInscritoData.nome_mae || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, nome_mae: e.target.value.toUpperCase()})}
                           placeholder="Nome da Mãe"
                           className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 w-full" />
                         <input type="text" value={infoInscritoData.whatsapp_mae || ""}
                           onChange={e => setInfoInscritoData({...infoInscritoData, whatsapp_mae: e.target.value})}
                           placeholder="WhatsApp Mãe"
                           className="text-xs text-pink-600 font-bold mt-1 bg-transparent border-none outline-none w-full" />
                      </div>
                   </div>

                </div>

                {/* Rodapé do Modal */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                   <button 
                     onClick={() => setShowModalInfo(false)}
                     className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-all"
                   >
                      Descartar
                   </button>
                   <button 
                     onClick={handleUpdateInscrito}
                     disabled={savingInfo}
                     className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center gap-2"
                   >
                      {savingInfo ? (
                        <>⏳ SALVANDO...</>
                      ) : (
                        <>✅ SALVAR ALTERAÇÕES</>
                      )}
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

      {/* ══════════ MODAL FILTRO DE EXPORTAÇÃO (UNIFICADO) ══════════ */}
      {showModalExport && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-outline-variant/20 animate-in zoom-in duration-300">
            <h3 className={`text-xl font-black mb-2 flex items-center gap-2 ${formatoExport === 'excel' ? 'text-green-600' : 'text-red-500'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {formatoExport === 'excel' ? 'table_chart' : 'picture_as_pdf'}
              </span> 
              Exportar {formatoExport === 'excel' ? 'Planilha' : 'Relatório PDF'}
            </h3>
            <p className="text-xs text-slate-400 font-bold mb-6">Selecione os tipos de lançamentos que deseja incluir:</p>
            
            <div className="space-y-3 mb-8">
              {['Inscrição', 'Cantina', 'Oferta', 'Dizimo'].map(tipo => (
                <label key={tipo} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={filtrosExport.includes(tipo)}
                    onChange={(e) => {
                      if (e.target.checked) setFiltrosExport([...filtrosExport, tipo])
                      else setFiltrosExport(filtrosExport.filter(f => f !== tipo))
                    }}
                    className={`w-5 h-5 rounded-lg border-2 border-slate-300 focus:ring-offset-2 ${formatoExport === 'excel' ? 'text-green-600 focus:ring-green-500' : 'text-red-500 focus:ring-red-400'}`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg" style={{ color: CATEGORIAS_LANCAMENTO.find(c => c.value === tipo)?.color }}>
                      {CATEGORIAS_LANCAMENTO.find(c => c.value === tipo)?.icon}
                    </span>
                    <span className="font-bold text-on-surface text-sm uppercase">{tipo}</span>
                  </div>
                </label>
              ))}

              <button 
                onClick={() => {
                  if (filtrosExport.length === 4) setFiltrosExport([])
                  else setFiltrosExport(['Inscrição', 'Cantina', 'Oferta', 'Dizimo'])
                }}
                className="text-[10px] font-black text-primary uppercase ml-1 hover:underline"
              >
                {filtrosExport.length === 4 ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowModalExport(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
              <button 
                onClick={formatoExport === 'excel' ? exportToExcel : exportToPDF}
                disabled={filtrosExport.length === 0}
                className={`px-6 py-3 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 ${
                  formatoExport === 'excel' 
                    ? 'bg-green-600 shadow-green-600/20 hover:bg-green-700' 
                    : 'bg-red-500 shadow-red-500/20 hover:bg-red-600'
                }`}
              >
                Gerar {formatoExport === 'excel' ? 'Excel' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

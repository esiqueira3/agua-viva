import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log("🔔 Webhook Recebido:", JSON.stringify(body))

    // ID do pagamento pode vir em diferentes locais dependendo da versão/tipo
    const paymentId = body.data?.id || body.resource?.split('/').pop() || body.id
    const type = body.type || (body.action?.includes('payment') ? 'payment' : body.action) || ''

    // Se tiver paymentId, sempre processamos (independente do tipo)
    // Isso cobre schemas diferentes do Mercado Pago para PIX e cartão
    if (!paymentId) {
      console.log(`⏩ Ignorado: Sem paymentId. Body: ${JSON.stringify(body)}`)
      return new Response(JSON.stringify({ message: 'Ignorado - sem paymentId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (type && type !== 'payment' && !type.includes('payment')) {
      console.log(`⏩ Ignorado: Tipo ${type} não é pagamento.`)
      return new Response(JSON.stringify({ message: 'Ignorado - tipo irrelevante' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: config } = await supabaseAdmin
      .from('config_global')
      .select('valor')
      .eq('chave', 'MP_ACCESS_TOKEN')
      .single()

    if (!config?.valor) throw new Error("Access Token não encontrado!")

    // Consultar status real no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${config.valor}` }
    })

    if (!mpResponse.ok) {
      console.error(`❌ Erro MP (${mpResponse.status}):`, await mpResponse.text())
      throw new Error(`Erro ao consultar pagamento ${paymentId}`)
    }
    
    const payment = await mpResponse.json()
    const status = payment.status
    const amount = payment.transaction_amount

    console.log(`💳 Pagamento ${paymentId} | Status: ${status} | Valor: ${amount}`)

    // Mapeamento de status amigável para o nosso sistema
    let sistemaStatus = 'pendente'
    if (status === 'approved') sistemaStatus = 'confirmada'
    if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) sistemaStatus = 'recusada'

    // ── ESTRATÉGIA ANTI-DUPLICATA ──────────────────────────────────────────
    // O Mercado Pago envia múltiplas notificações por pagamento (formatos novo+legado).
    // Solução: SEMPRE fazer upsert pelo pagamento_id:
    //   - Se o registro já existe → atualiza o status
    //   - Se não existe (fluxo PIX) → cria usando os dados do external_reference
    // Com a constraint UNIQUE em pagamento_id no banco, isso é 100% seguro.
    // ──────────────────────────────────────────────────────────────────────

    let inscricaoFinal = null

    // 1. Tentar UPDATE primeiro (registro já existe — cartão ou PIX antigo)
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('inscricoes')
      .update({ status: sistemaStatus, valor_pago: amount })
      .eq('pagamento_id', String(paymentId))
      .select()

    if (updateError) {
      console.error("❌ Erro ao atualizar banco:", updateError)
    } else if (updateResult && updateResult.length > 0) {
      inscricaoFinal = updateResult[0]
      console.log(`✅ Registro atualizado para: ${sistemaStatus}`)
    }

    // 2. Se não encontrou registro (fluxo PIX) E pagamento aprovado → criar via external_reference
    if (!inscricaoFinal && sistemaStatus === 'confirmada' && payment.external_reference) {
      console.log(`📝 Registro não encontrado. Criando via external_reference (fluxo PIX)...`)
      try {
        const participante = JSON.parse(payment.external_reference)

        // Upsert: cria ou atualiza — nunca duplica
        const { data: upsertResult, error: upsertError } = await supabaseAdmin
          .from('inscricoes')
          .upsert([{
            evento_id: participante.evento_id,
            nome_participante: participante.nome,
            email_participante: participante.email,
            whatsapp: participante.whatsapp,
            valor_pago: amount,
            pagamento_id: String(paymentId),
            status: 'confirmada'
          }], { onConflict: 'pagamento_id', ignoreDuplicates: false })
          .select()

        if (upsertError) {
          console.error("❌ Erro ao criar/atualizar inscrição via external_reference:", upsertError)
        } else if (upsertResult && upsertResult.length > 0) {
          inscricaoFinal = upsertResult[0]
          console.log(`✅ Inscrição PIX criada/atualizada para: ${participante.nome}`)
        }
      } catch (parseError) {
        console.error("❌ Erro ao parsear external_reference:", parseError)
      }
    }

    // 3. Se ainda não encontrou, aguardar e tentar uma última vez (race condition com frontend)
    if (!inscricaoFinal) {
      console.log(`⏳ Registro não encontrado. Aguardando 4s e tentando novamente...`)
      await new Promise(resolve => setTimeout(resolve, 4000))

      const { data: retryResult } = await supabaseAdmin
        .from('inscricoes')
        .update({ status: sistemaStatus, valor_pago: amount })
        .eq('pagamento_id', String(paymentId))
        .select()

      if (retryResult && retryResult.length > 0) {
        inscricaoFinal = retryResult[0]
        console.log(`✅ Registro encontrado na re-tentativa: ${sistemaStatus}`)
      } else {
        console.warn(`⚠️ Nenhuma inscrição encontrada com pagamento_id: ${paymentId}`)
      }
    }

    // 4. Disparar notificação interna se confirmado
    if (inscricaoFinal && sistemaStatus === 'confirmada') {
      const { data: evento } = await supabaseAdmin
        .from('eventos').select('nome').eq('id', inscricaoFinal.evento_id).single()

      await supabaseAdmin.from('notificacoes').insert([{
        titulo: '✅ Pagamento Confirmado!',
        mensagem: `O pagamento de ${inscricaoFinal.nome_participante} para "${evento?.nome || 'Evento'}" foi aprovado.`,
        tipo: 'financeiro'
      }])
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("❌ Erro fatal no Webhook:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})

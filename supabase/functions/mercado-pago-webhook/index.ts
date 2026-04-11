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

    // Atualizar no Supabase com lógica de re-tentativa (para evitar Race Condition)
    let updated = null
    const MAX_RETRIES = 3
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`🔍 Tentativa ${i + 1} de localizar inscrição para pagamento: ${paymentId}`)
      
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('inscricoes')
        .update({ 
          status: sistemaStatus, 
          valor_pago: amount,
          updated_at: new Date().toISOString()
        })
        .eq('pagamento_id', String(paymentId))
        .select()

      if (updateError) {
        console.error("❌ Erro ao atualizar banco:", updateError)
        break
      }

      if (updateResult && updateResult.length > 0) {
        updated = updateResult
        break
      }

      // Se não encontrou registro existente e o pagamento foi aprovado,
      // pode ser um PIX cujo INSERT ainda não foi feito (fluxo novo).
      // Tentamos criar a inscrição usando o external_reference.
      if (sistemaStatus === 'confirmada' && payment.external_reference) {
        console.log(`📝 Inscrição não encontrada. Tentando criar via external_reference (fluxo PIX)...`)
        try {
          const participante = JSON.parse(payment.external_reference)
          const { data: insertResult, error: insertError } = await supabaseAdmin
            .from('inscricoes')
            .insert([{
              evento_id: participante.evento_id,
              nome_participante: participante.nome,
              email_participante: participante.email,
              whatsapp: participante.whatsapp,
              valor_pago: amount,
              pagamento_id: String(paymentId),
              status: 'confirmada'
            }])
            .select()

          if (insertError) {
            console.error("❌ Erro ao criar inscrição via external_reference:", insertError)
          } else if (insertResult && insertResult.length > 0) {
            updated = insertResult
            console.log(`✅ Inscrição PIX criada com sucesso para: ${participante.nome}`)
            break
          }
        } catch (parseError) {
          console.error("❌ Erro ao parsear external_reference:", parseError)
        }
      }

      // Aguardar antes da próxima tentativa
      if (i < MAX_RETRIES - 1) {
        console.log(`⏳ Inscrição não encontrada. Aguardando 3s...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    if (updated && updated.length > 0) {
      const inscricao = updated[0]
      console.log(`✅ Inscrição de ${inscricao.nome_participante} atualizada para: ${sistemaStatus}`)
      
      if (sistemaStatus === 'confirmada') {
        const { data: evento } = await supabaseAdmin.from('eventos').select('nome').eq('id', inscricao.evento_id).single()
        
        await supabaseAdmin.from('notificacoes').insert([{
           titulo: '✅ Pagamento Confirmado!',
           mensagem: `O pagamento de ${inscricao.nome_participante} para "${evento?.nome || 'Evento'}" foi aprovado.`,
           tipo: 'financeiro'
        }])
      }
    } else {
      console.warn(`⚠️ Nenhuma inscrição encontrada com pagamento_id: ${paymentId} após ${MAX_RETRIES} tentativas.`)
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

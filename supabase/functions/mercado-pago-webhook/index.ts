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
    const type = body.type || (body.action?.includes('payment') ? 'payment' : body.action)

    if (!paymentId || (type !== 'payment' && !type.includes('payment'))) {
      console.log(`⏩ Ignorado: Tipo ${type} ou ID ${paymentId} não relevante.`)
      return new Response(JSON.stringify({ message: 'Ignorado' }), {
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

    // Atualizar no Supabase
    const { data: updated, error: updateError } = await supabaseAdmin
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
    } else if (updated && updated.length > 0) {
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
      console.warn(`⚠️ Nenhuma inscrição encontrada com pagamento_id: ${paymentId}`)
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

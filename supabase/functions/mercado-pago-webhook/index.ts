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

    // O Mercado Pago envia o ID do pagamento no campo data.id para tipos 'payment'
    const paymentId = body.data?.id || body.id
    const type = body.type || body.action

    if (type !== 'payment' && !type.includes('payment')) {
      return new Response(JSON.stringify({ message: 'Ignorado: Não é um pagamento' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar Token do Mercado Pago
    const { data: config } = await supabaseAdmin
      .from('config_global')
      .select('valor')
      .eq('chave', 'MP_ACCESS_TOKEN')
      .single()

    if (!config?.valor) throw new Error("Access Token não encontrado!")

    // 2. Consultar o status real do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${config.valor}` }
    })

    if (!mpResponse.ok) throw new Error("Erro ao consultar pagamento no Mercado Pago")
    
    const payment = await mpResponse.json()
    const status = payment.status
    const externalReference = payment.external_reference
    const metadata = payment.metadata

    console.log(`💳 Pagamento ${paymentId} - Status: ${status}`)

    // 3. Se aprovado, atualizar a inscrição no Supabase
    if (status === 'approved') {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('inscricoes')
        .update({ status: 'confirmada', valor_pago: payment.transaction_amount })
        .eq('pagamento_id', String(paymentId))
        .select()
        .single()

      if (updateError) {
        console.error("❌ Erro ao atualizar inscrição:", updateError)
      } else if (updated) {
        console.log("✅ Inscrição confirmada via Webhook:", updated.nome_participante)
        
        // 4. Gerar notificação para os Admins (opcional)
        const { data: evento } = await supabaseAdmin.from('eventos').select('nome').eq('id', updated.evento_id).single()
        
        await supabaseAdmin.from('notificacoes').insert([{
           user_email: 'admin', // Ou buscar emails reais
           titulo: '✅ Pagamento Confirmado!',
           mensagem: `O pagamento de ${updated.nome_participante} para "${evento?.nome || 'Evento'}" foi aprovado automaticamente.`,
           tipo: 'financeiro',
           link: '/financeiro-eventos'
        }])
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("❌ Erro no Webhook:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // MP exige 200 ou 201 mesmo em erro para não ficar reenviando eternamente
    })
  }
})

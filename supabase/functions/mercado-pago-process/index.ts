import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
     const { 
      token, 
      issuer_id, 
      payment_method_id, 
      transaction_amount, 
      installments, 
      payer, 
      evento_id,
      deviceId,
      nome_pagador,
      email_pagador,
      whatsapp_pagador,
      description,
      participante
    } = body

    // Capturar o IP do cliente para o antifraude
    const clientIP = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'

    console.log("🚀 Processando Pagamento:", { evento_id, email_pagador, clientIP, deviceId })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: config } = await supabaseAdmin
      .from('config_global')
      .select('valor')
      .eq('chave', 'MP_ACCESS_TOKEN')
      .single()

    if (!config?.valor) throw new Error("Access Token não encontrado no banco!")

    const cleanToken = config.valor.replace(/Bearer /i, '').trim()

    const mpHeaders: Record<string, string> = {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID()
    }

    if (deviceId) {
      mpHeaders['X-Meli-Session-Id'] = deviceId
    }

    const nomePartes = (nome_pagador || 'Pagador').trim().split(' ')
    const firstName = nomePartes[0]
    const lastName = nomePartes.slice(1).join(' ') || 'Fiel'

    // Limpeza de campos para o Mercado Pago
    const cleanCPF = (payer?.identification?.number || body.identification?.number || '') .replace(/\D/g, '')

    const mpPayload: any = {
      transaction_amount: Number(transaction_amount),
      description: description || `Agua Viva - Inscrição Evento ID: ${evento_id}`,
      payment_method_id: payment_method_id,
      payer: {
        email: email_pagador || payer?.email,
        identification: {
          type: (payer?.identification?.type || body.identification?.type || 'CPF').toUpperCase(),
          number: cleanCPF
        },
        first_name: firstName,
        last_name: lastName,
        entity_type: 'individual'
      },
      additional_info: {
        ip_address: clientIP,
        items: [
          {
            id: String(evento_id),
            title: description || 'Inscrição em Evento',
            quantity: 1,
            unit_price: Number(transaction_amount)
          }
        ],
        payer: {
          first_name: firstName,
          last_name: lastName,
          registration_date: new Date().toISOString()
        }
      },
      notification_url: "https://kfalhtebjoilpnncpkbd.supabase.co/functions/v1/mercado-pago-webhook",
      external_reference: String(body.inscricao_id || evento_id),
      // Campos específicos para Cartão de Crédito
      token: body.token,
      installments: body.installments ? Number(body.installments) : undefined,
      issuer_id: body.issuer_id,
      metadata: {
        inscricao_id: body.inscricao_id,
        evento_id: evento_id,
        projeto: "Água Viva Church",
        ip: clientIP
      }
    }

    // Apenas adicionar token e parcelas se NÃO for Pix
    if (payment_method_id !== 'pix') {
      mpPayload.token = token
      mpPayload.installments = installments ? Number(installments) : 1
      mpPayload.issuer_id = issuer_id
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: mpHeaders,
      body: JSON.stringify(mpPayload)
    })

    const paymentResult = await mpResponse.json()
    console.log("Resposta MP:", paymentResult.status, paymentResult.status_detail, paymentResult.message)

    if (!mpResponse.ok) {
      console.error("❌ Erro na API do Mercado Pago:", paymentResult)
      return new Response(JSON.stringify({ 
        error_mp: true,
        status: paymentResult.status,
        message: paymentResult.message || "Erro na API do Mercado Pago", 
        details: paymentResult.cause || paymentResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // --- ATUALIZAÇÃO DO BANCO DE DADOS (USANDO SERVICE ROLE NO SERVIDOR) ---
    // Isso evita problemas de RLS/Permissões no Frontend para usuários não logados
    const inscricao_id = body.inscricao_id
    if (inscricao_id) {
       console.log(`📝 Atualizando inscrição ${inscricao_id} com status do MP...`)
       
       const updatePayload: any = {
         pagamento_id: String(paymentResult.id)
       }

       if (paymentResult.status === 'approved') {
         updatePayload.status = 'confirmada'
         updatePayload.valor_pago = paymentResult.transaction_amount
       }

       const { error: updateError } = await supabaseAdmin
         .from('inscricoes')
         .update(updatePayload)
         .eq('id', inscricao_id)

       if (updateError) {
         console.error("⚠️ Erro ao atualizar inscrição pós-pagamento:", updateError)
       } else {
         console.log("✅ Inscrição atualizada com sucesso no banco.")
       }
    }

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("Erro no Robô:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

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

    const mpHeaders: Record<string, string> = {
      'Authorization': `Bearer ${config.valor}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID()
    }

    if (deviceId) {
      mpHeaders['X-Meli-Session-Id'] = deviceId
    }

    const nomePartes = (nome_pagador || 'Pagador').trim().split(' ')
    const firstName = nomePartes[0]
    const lastName = nomePartes.slice(1).join(' ') || 'Fiel'

    // Construção robusta do payload do Mercado Pago
    const mpPayload: any = {
      transaction_amount: Number(transaction_amount),
      description: description || `Agua Viva - Inscrição Evento ID: ${evento_id}`,
      payment_method_id: payment_method_id,
      binary_mode: true,
      payer: {
        email: email_pagador || payer?.email,
        identification: payer?.identification,
        first_name: firstName,
        last_name: lastName
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
      external_reference: JSON.stringify(participante || { evento_id, nome: nome_pagador, email: email_pagador, whatsapp: whatsapp_pagador }),
      metadata: {
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
    console.log("Resposta MP:", paymentResult.status, paymentResult.status_detail)

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: mpResponse.status
    })

  } catch (error) {
    console.error("Erro no Robô:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

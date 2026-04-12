import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function InscricaoEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pollingRef = useRef(null)
  const [evento, setEvento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [pixData, setPixData] = useState(null)
  const [brickLoading, setBrickLoading] = useState(true)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [lastError, setLastError] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [pixConfirmed, setPixConfirmed] = useState(false)
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    saude_info: '',
    alergia_info: '',
    quer_camiseta: false,
    camiseta_tamanho: '',
    membro_agua_viva: '',
    nome_conjuge: '',
    whatsapp_conjuge: '',
    nome_pai: '',
    whatsapp_pai: '',
    nome_mae: '',
    whatsapp_mae: ''
  })
  const [publicKey, setPublicKey] = useState(null)
  const [step, setStep] = useState(1) // 1: Dados, 2: Pagamento

  const calculateTotal = () => {
    if (!evento) return 0;
    const base = Number(evento.valor_total) || 0;
    const adicional = (form.quer_camiseta && evento.valor_camiseta) ? Number(evento.valor_camiseta) : 0;
    return base + adicional;
  };

  useEffect(() => {
    async function loadEvento() {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, locais(descricao)')
        .eq('id', id)
        .single()
      
      if (data) setEvento(data)
      
      // Carregar Public Key para o Checkout Transparente
      const { data: config } = await supabase
        .from('config_global')
        .select('valor')
        .eq('chave', 'MP_PUBLIC_KEY')
        .single()
      
      if (config) setPublicKey(config.valor)
      
      setLoading(false)
    }
    loadEvento()
  }, [id])

  const notifyRegistration = async (participantName, amount) => {
    try {
      // 1. Busca todos os Administradores
      const { data: admins } = await supabase
        .from('usuarios_sistema')
        .select('email')
        .eq('perfil', 'Administrador')

      // 2. Busca email do líder do departamento deste evento
      const { data: depto } = await supabase
        .from('departamentos')
        .select('lider_principal_id')
        .eq('id', evento.departamento_id)
        .single()

      let leaderEmail = null
      if (depto?.lider_principal_id) {
        const { data: leader } = await supabase
          .from('membros')
          .select('email')
          .eq('id', depto.lider_principal_id)
          .single()
        leaderEmail = leader?.email
      }

      // 3. Monta lista de destinatários (Admins + Líder do Evento)
      const targetEmails = new Set([
        ...(admins?.map(a => a.email) || []),
        ...(leaderEmail ? [leaderEmail] : [])
      ])

      const notifications = Array.from(targetEmails).map(email => ({
        user_email: email,
        titulo: '🎟️ Nova Inscrição!',
        mensagem: `${participantName} se inscreveu em "${evento.nome}" (${amount > 0 ? `R$ ${amount}` : 'Gratuito'})`,
        tipo: 'inscricao',
        link: '/financeiro-eventos'
      }))

      if (notifications.length > 0) {
        await supabase.from('notificacoes').insert(notifications)
      }
    } catch (err) {
      console.error("Erro ao gerar notificação de inscrição:", err)
    }
  }

  const handleInscricao = async (e) => {
    e.preventDefault()
    
    if (evento.pago) {
      if (publicKey) {
        setStep(2) // Vai para o pagamento transparente
      } else {
        alert("⚠️ Configuração de API incompleta. Por favor, acesse o menu 'API Mercado Pago' e salve as suas chaves primeiro! 🏛️⛪")
      }
    } else {
      // Inscrição realmente gratuita
      setSubmitting(true)
      const payload = {
        evento_id: id,
        nome_participante: form.nome,
        email_participante: form.email,
        whatsapp: form.whatsapp,
        saude_info: form.saude_info,
        alergia_info: form.alergia_info,
        camiseta_tamanho: form.quer_camiseta ? form.camiseta_tamanho : null,
        quer_camiseta: form.quer_camiseta,
        membro_agua_viva: form.membro_agua_viva,
        nome_conjuge: form.nome_conjuge,
        whatsapp_conjuge: form.whatsapp_conjuge,
        nome_pai: form.nome_pai,
        whatsapp_pai: form.whatsapp_pai,
        nome_mae: form.nome_mae,
        whatsapp_mae: form.whatsapp_mae,
        valor_pago: 0,
        status: 'confirmada'
      }
      const { error } = await supabase.from('inscricoes').insert([payload])
      if (!error) {
        setSuccess(true)
        notifyRegistration(form.nome, 0)
      }
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (step === 2 && window.MercadoPago && publicKey && evento) {
      // Remover qualquer Brick anterior se existir para garantir nova configuração
      const container = document.getElementById('paymentCardBrick_container');
      if (container) container.innerHTML = '';
      
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      const renderPaymentBrick = async (builder) => {
        const amountValue = calculateTotal();
        const maxInstallmentsValue = Number(evento.max_parcelas) || 1;

        console.log("Configurando Payment Brick - Valor:", amountValue);

        const settings = {
          initialization: {
            amount: Number(amountValue.toFixed(2)),
            payer: {
              email: form.email,
              firstName: form.nome.split(' ')[0],
              lastName: form.nome.split(' ').slice(1).join(' ') || ' ',
            }
          },
          customization: {
            paymentMethods: {
              bankTransfer: ['pix'], 
              creditCard: 'all',
              maxInstallments: maxInstallmentsValue,
            },
            visual: {
              style: {
                theme: 'default',
                customVariables: {
                  baseColor: '#8B5CF6',
                }
              },
              texts: {
                emailSectionTitle: 'Confirme seu e-mail abaixo para gerar o Pix e receber o comprovante',
                cardholderName: {
                  placeholder: 'Nome (como no cartão)',
                  label: 'Nome impresso no cartão'
                }
              }
            }
          },
          callbacks: {
            onReady: () => {
              console.log("Payment Brick Pronto! ✨");
              setBrickLoading(false);
            },
            onSubmit: async ({ formData }) => {
              setSubmitting(true);
              console.log("Enviado para processamento:", formData.payment_method_id);
              try {
                const { data: result, error: invokeError } = await supabase.functions.invoke('mercado-pago-process', {
                  body: {
                    ...formData,
                    deviceId: formData.deviceId || window.MP_DEVICE_SESSION_ID,
                    evento_id: id,
                    nome_pagador: form.nome,
                    email_pagador: form.email,
                    whatsapp_pagador: form.whatsapp,
                    description: `Inscrição: ${evento.nome} - Titular: ${form.nome}`,
                    // Dados completos para o webhook poder registrar a inscrição do Pix
                    participante: {
                      nome: form.nome,
                      email: form.email,
                      whatsapp: form.whatsapp,
                      saude_info: form.saude_info,
                      alergia_info: form.alergia_info,
                      camiseta_tamanho: form.quer_camiseta ? form.camiseta_tamanho : null,
                      quer_camiseta: form.quer_camiseta,
                      membro_agua_viva: form.membro_agua_viva,
                      nome_conjuge: form.nome_conjuge,
                      whatsapp_conjuge: form.whatsapp_conjuge,
                      nome_pai: form.nome_pai,
                      whatsapp_pai: form.whatsapp_pai,
                      nome_mae: form.nome_mae,
                      whatsapp_mae: form.whatsapp_mae,
                      evento_id: id,
                      evento_nome: evento.nome
                    }
                  }
                });

                if (invokeError) {
                  console.error("❌ Erro ao invocar função:", invokeError);
                  throw new Error(invokeError.message || 'Falha na comunicação com o servidor de pagamento');
                }

                console.log("💎 Resposta do Mercado Pago:", result);

                if (result.status === 'approved') {
                  const payload = {
                    evento_id: id,
                    nome_participante: form.nome,
                    email_participante: form.email,
                    whatsapp: form.whatsapp,
                    saude_info: form.saude_info,
                    alergia_info: form.alergia_info,
                    camiseta_tamanho: form.quer_camiseta ? form.camiseta_tamanho : null,
                    quer_camiseta: form.quer_camiseta,
                    membro_agua_viva: form.membro_agua_viva,
                    nome_conjuge: form.nome_conjuge,
                    whatsapp_conjuge: form.whatsapp_conjuge,
                    nome_pai: form.nome_pai,
                    whatsapp_pai: form.whatsapp_pai,
                    nome_mae: form.nome_mae,
                    whatsapp_mae: form.whatsapp_mae,
                    valor_pago: result.transaction_amount,
                    pagamento_id: String(result.id),
                    status: 'confirmada'
                  }
                  await supabase.from('inscricoes').insert([payload])
                  notifyRegistration(form.nome, result.transaction_amount);
                  navigate('/obrigado');
                } else if (result.status === 'pending' && result.payment_method_id === 'pix') {
                  // PIX: Não registrar agora! O webhook fará o INSERT quando o pagamento for confirmado.
                  // Apenas exibir o QR Code para o usuário.
                  const pixPaymentId = String(result.id)
                  setPixData({
                    qrCode: result.point_of_interaction.transaction_data.qr_code,
                    qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
                    id: pixPaymentId
                  });
                  // Iniciar polling para detectar confirmação automática
                  pollingRef.current = setInterval(async () => {
                    const { data } = await supabase
                      .from('inscricoes')
                      .select('status')
                      .eq('pagamento_id', pixPaymentId)
                      .single()
                    if (data?.status === 'confirmada') {
                      clearInterval(pollingRef.current)
                      setPixConfirmed(true)
                      setTimeout(() => navigate('/obrigado'), 2500)
                    }
                  }, 5000)
                } else if (result.status === 'in_process') {
                  // Pagamento em análise pelo Mercado Pago
                  const payload = {
                    evento_id: id,
                    nome_participante: form.nome,
                    email_participante: form.email,
                    whatsapp: form.whatsapp,
                    saude_info: form.saude_info,
                    alergia_info: form.alergia_info,
                    camiseta_tamanho: form.quer_camiseta ? form.camiseta_tamanho : null,
                    quer_camiseta: form.quer_camiseta,
                    membro_agua_viva: form.membro_agua_viva,
                    nome_conjuge: form.nome_conjuge,
                    whatsapp_conjuge: form.whatsapp_conjuge,
                    nome_pai: form.nome_pai,
                    whatsapp_pai: form.whatsapp_pai,
                    nome_mae: form.nome_mae,
                    whatsapp_mae: form.whatsapp_mae,
                    valor_pago: result.transaction_amount,
                    pagamento_id: String(result.id),
                    status: 'pendente'
                  }
                  await supabase.from('inscricoes').insert([payload])
                  setPaymentStatus('in_process');
                  setSuccess(true); 
                  notifyRegistration(form.nome, result.transaction_amount);
                } else {
                  setLastError(result.status_detail || result.status || 'Operação recusada')
                  setShowHelpModal(true)
                }
              } catch (e) {
                setLastError(e.message)
                setShowHelpModal(true)
              } finally {
                setSubmitting(false);
              }
            },
            onError: (error) => {
              console.error("Erro Brick:", error);
            },
          },
        };
        window.paymentBrickController = await builder.create('payment', 'paymentCardBrick_container', settings);
      };

      renderPaymentBrick(bricksBuilder);
    }
  }, [step, publicKey, id, calculateTotal(), evento?.max_parcelas]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-headline text-primary font-bold">
       Carregando Evento...
    </div>
  )

  if (!evento) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-headline text-red-500 font-bold">
       Evento não encontrado ou link expirado.
    </div>
  )

  if (pixData) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-[2.5rem] text-center shadow-2xl space-y-6">
          
          {pixConfirmed ? (
            // Tela de confirmação animada antes de redirecionar
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-inner border-4 border-green-50">
                  <span className="material-symbols-outlined text-5xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
               </div>
               <h2 className="text-2xl font-black text-slate-900">Pix Confirmado! 🎉</h2>
               <p className="text-slate-500 text-sm font-medium">Redirecionando você em instantes...</p>
               <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-1.5 rounded-full animate-pulse" style={{ width: '100%' }} />
               </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                 <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-primary font-bold">pix</span>
                 </div>
                 <h2 className="text-2xl font-black text-slate-900">Quase lá!</h2>
                 <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Pague via Pix agora</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-4">
                 <img 
                   src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                   alt="QR Code Pix"
                   className="w-48 h-48 rounded-xl shadow-sm border border-white"
                 />
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(pixData.qrCode);
                     alert("✅ Código copiado!");
                   }}
                   className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-primary uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                 >
                   <span className="material-symbols-outlined text-sm">content_copy</span>
                   Copiar Pix Copia e Cola
                 </button>
              </div>

              {/* Instruções claras */}
              <div className="space-y-3 text-left p-5 bg-blue-50 rounded-2xl border border-blue-100">
                 <p className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">smartphone</span>
                    Como pagar:
                 </p>
                 <ol className="text-xs text-blue-700/80 space-y-2 font-medium list-none">
                    <li className="flex gap-2"><span className="font-black">1.</span> Abra o app do seu banco</li>
                    <li className="flex gap-2"><span className="font-black">2.</span> Escaneie o QR Code ou cole o código Pix</li>
                    <li className="flex gap-2"><span className="font-black">3.</span> Confirme o pagamento no seu banco</li>
                    <li className="flex gap-2"><span className="font-black">4.</span> Esta tela será atualizada automaticamente ✅</li>
                 </ol>
              </div>

              {/* Indicador de espera */}
              <div className="flex items-center justify-center gap-2 text-slate-400">
                 <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 <p className="text-xs font-bold ml-1">Aguardando confirmação do pagamento...</p>
              </div>

              <button 
                onClick={() => { clearInterval(pollingRef.current); navigate('/obrigado'); }}
                className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-all"
              >
                Já paguei, mas a tela não atualizou →
              </button>
            </>
          )}
       </div>
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
       <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-[2.5rem] text-center shadow-2xl space-y-6">
          {paymentStatus === 'in_process' ? (
            <div className="space-y-6 animate-in fade-in zoom-in duration-700">
               <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-amber-50">
                  <span className="material-symbols-outlined text-5xl text-amber-600 animate-pulse">hourglass_top</span>
               </div>
               <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Pagamento em Análise</h2>
                  <p className="text-slate-500 font-medium text-sm">Sua operadora ou o Mercado Pago estão validando os dados por segurança.</p>
               </div>
               <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-left space-y-3 mt-4">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm">info</span>
                     O que acontece agora?
                  </p>
                  <ul className="text-[11px] text-amber-700/80 space-y-2 font-medium">
                     <li>• Não tente pagar novamente para evitar duplicidade.</li>
                     <li>• Assim que aprovado, sua inscrição será confirmada automaticamente.</li>
                     <li>• Você poderá acompanhar o status no dashboard da igreja.</li>
                  </ul>
               </div>
            </div>
          ) : null}
          
          <div className="pt-6 border-t border-slate-100">
             <button onClick={() => navigate('/obrigado')} className="inline-block w-full bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/80 transition-all active:scale-95">
                Continuar
             </button>
          </div>
       </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col items-center py-12 px-4 selection:bg-primary selection:text-white relative overflow-hidden">
      {/* Elementos Decorativos de Fundo (Premium) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Header Estilizado Premium */}
      <div className="max-w-3xl w-full text-center mb-10 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
         <div className="inline-block p-4 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/50 shadow-xl shadow-primary/5 mb-8 transform hover:scale-105 transition-transform duration-500">
            <img src="/logo.png" alt="Água Viva" className="h-20 md:h-24 mx-auto" />
         </div>
         
         <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-8">
            <span className="text-slate-900">Inscrição: </span>
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              {evento.nome}
            </span>
         </h1>

         <div className="flex flex-wrap justify-center gap-4 text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em]">
            <div className="flex items-center gap-3 px-6 py-3 bg-orange-500 shadow-xl shadow-orange-500/20 rounded-full animate-in zoom-in duration-700 delay-100 border border-orange-400">
               <span className="material-symbols-outlined text-white text-xl font-bold">calendar_month</span>
               <span className="text-white">
                  {evento.data_evento
                    ? (() => { 
                        const [y, m, d] = evento.data_evento.split('-'); 
                        const dataInicio = `${d}/${m}/${y}`;
                        if (evento.data_fim && evento.data_fim !== evento.data_evento) {
                          const [yf, mf, df] = evento.data_fim.split('-');
                          return `${dataInicio} ATÉ ${df}/${mf}/${yf}`;
                        }
                        return dataInicio;
                      })()
                    : 'Data a definir'}
               </span>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-sky-500 shadow-xl shadow-sky-500/20 rounded-full animate-in zoom-in duration-700 delay-200">
               <span className="material-symbols-outlined text-white text-xl font-bold">location_on</span>
               <span className="text-white">{evento.locais?.descricao || 'Local a definir'}</span>
            </div>
         </div>
      </div>

      {/* Card de Inscrição Premium */}
      <div className="max-w-xl w-full bg-white/80 backdrop-blur-2xl border border-white rounded-[3rem] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
        {/* Marca d'água sutil */}
        <div className="absolute top-[-20px] right-[-20px] p-8 opacity-[0.03] pointer-events-none select-none">
           <span className="font-black text-[180px] leading-none">AV</span>
        </div>

        {step === 1 ? (
           <form onSubmit={handleInscricao} className="relative z-10 space-y-6">
              <div className="space-y-4">
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                       required type="text" placeholder="Nome Completo"
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Seu E-mail</label>
                    <input 
                       required type="email" placeholder="Seu E-mail"
                       value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">WhatsApp *</label>
                    <input 
                       required type="tel" placeholder="(00) 0 0000-0000"
                       value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 {/* Campos Adicionais Condicionais */}
                 {(evento.pedir_saude || evento.pedir_alergia || evento.pedir_camiseta || 
                   evento.pedir_membro_agua_viva || evento.pedir_conjuge || 
                   evento.pedir_pai || evento.pedir_mae) && (
                   <div className="pt-6 border-t border-slate-100 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2">Informações Adicionais</h4>
                      
                      {/* 1. Camiseta */}
                      {evento.pedir_camiseta && (
                        <div className="space-y-4">
                           <div className="flex flex-col gap-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Deseja adquirir a camiseta?</label>
                              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                 <button 
                                   type="button"
                                   onClick={() => setForm({...form, quer_camiseta: true})}
                                   className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${form.quer_camiseta ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   Sim
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => setForm({...form, quer_camiseta: false, camiseta_tamanho: ''})}
                                   className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${!form.quer_camiseta ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   Não
                                 </button>
                              </div>
                           </div>

                           {form.quer_camiseta && (
                             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Tamanho da Camiseta</label>
                                <select 
                                   required
                                   value={form.camiseta_tamanho} onChange={e => setForm({...form, camiseta_tamanho: e.target.value})}
                                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium mt-1"
                                >
                                   <option value="">Escolha um tamanho</option>
                                   <option value="P">Tamanho P</option>
                                   <option value="M">Tamanho M</option>
                                   <option value="G">Tamanho G</option>
                                   <option value="GG">Tamanho GG</option>
                                   <option value="XXG">Tamanho XXG</option>
                                </select>
                                {evento.valor_camiseta > 0 && (
                                  <p className="text-[10px] text-primary/70 font-bold mt-2 ml-1">
                                     + R$ {evento.valor_camiseta} adicionados ao total
                                  </p>
                                )}
                             </div>
                           )}
                        </div>
                      )}

                      {/* 2. Membro Água Viva */}
                      {evento.pedir_membro_agua_viva && (
                         <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Você é membro da Água Viva?</label>
                            <input 
                               type="text" placeholder="Sim / Não (ou departamento)"
                               value={form.membro_agua_viva} onChange={e => setForm({...form, membro_agua_viva: e.target.value})}
                               className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                            />
                         </div>
                      )}

                      {/* 3. Cônjuge */}
                      {evento.pedir_conjuge && (
                         <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                               <span className="material-symbols-outlined text-sm">favorite</span>
                               Dados do Cônjuge
                            </h5>
                            <div className="space-y-3">
                               <input 
                                  type="text" placeholder="Nome do Cônjuge"
                                  value={form.nome_conjuge} onChange={e => setForm({...form, nome_conjuge: e.target.value})}
                                  className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-medium"
                               />
                               <input 
                                  type="tel" placeholder="WhatsApp (cônjuge)"
                                  value={form.whatsapp_conjuge} onChange={e => setForm({...form, whatsapp_conjuge: e.target.value})}
                                  className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-medium"
                               />
                            </div>
                         </div>
                      )}

                      {/* 4. Pai */}
                      {evento.pedir_pai && (
                         <div className="p-4 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                               <span className="material-symbols-outlined text-sm">person</span>
                               Dados do Pai
                            </h5>
                            <div className="space-y-3">
                               <input 
                                  type="text" placeholder="Nome do Pai"
                                  value={form.nome_pai} onChange={e => setForm({...form, nome_pai: e.target.value})}
                                  className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-medium"
                               />
                               <input 
                                  type="tel" placeholder="WhatsApp (pai)"
                                  value={form.whatsapp_pai} onChange={e => setForm({...form, whatsapp_pai: e.target.value})}
                                  className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-medium"
                               />
                            </div>
                         </div>
                      )}

                      {/* 5. Mãe */}
                      {evento.pedir_mae && (
                         <div className="p-4 bg-pink-50/50 rounded-[2rem] border border-pink-100 space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-pink-600 flex items-center gap-2">
                               <span className="material-symbols-outlined text-sm">person_2</span>
                               Dados da Mãe
                            </h5>
                            <div className="space-y-3">
                               <input 
                                  type="text" placeholder="Nome da Mãe"
                                  value={form.nome_mae} onChange={e => setForm({...form, nome_mae: e.target.value})}
                                  className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-medium"
                               />
                               <input 
                                  type="tel" placeholder="WhatsApp (mãe)"
                                  value={form.whatsapp_mae} onChange={e => setForm({...form, whatsapp_mae: e.target.value})}
                                  className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-medium"
                               />
                            </div>
                         </div>
                      )}

                      {/* 6. Saúde e Alergia (Movido para o final da seção conforme solicitado) */}
                      {(evento.pedir_saude || evento.pedir_alergia) && (
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">medical_information</span>
                              Saúde e Atenção Especial
                           </h5>

                           {evento.pedir_saude && (
                             <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Algum problema de saúde?</label>
                                <textarea 
                                   placeholder="Descreva se houver algum problema de saúde..."
                                   value={form.saude_info} onChange={e => setForm({...form, saude_info: e.target.value})}
                                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium min-h-[80px] resize-none"
                                />
                             </div>
                           )}

                           {evento.pedir_alergia && (
                             <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Possui alguma Alergia?</label>
                                <textarea 
                                   placeholder="Medicamento, alimento, etc..."
                                   value={form.alergia_info} onChange={e => setForm({...form, alergia_info: e.target.value})}
                                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium min-h-[80px] resize-none"
                                />
                             </div>
                           )}
                        </div>
                      )}
                   </div>
                 )}
              </div>

              <div className={`p-6 rounded-3xl border flex items-center justify-between transition-colors ${evento.pago || form.quer_camiseta ? 'bg-primary/5 border-primary/10' : 'bg-green-500/10 border-green-500/20'}`}>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Investimento</p>
                    <h3 className="text-2xl font-black text-slate-900">
                       {calculateTotal() > 0 ? `R$ ${calculateTotal().toFixed(2)}` : 'Gratuito'}
                    </h3>
                 </div>
                 <span className="material-symbols-outlined text-4xl text-slate-300">
                    {evento.pago || form.quer_camiseta ? 'payments' : 'volunteer_activism'}
                 </span>
              </div>

              <button 
                 type="submit" 
                 disabled={submitting}
                 className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${submitting ? 'opacity-50 cursor-not-allowed' : ''} ${evento.pago ? 'bg-primary text-white hover:bg-primary/80 shadow-primary/20' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-900/20'}`}
              >
                 {submitting ? 'Processando...' : (evento.pago ? 'Continuar para Pagamento' : 'Garantir minha vaga')}
                 {!submitting && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
           </form>
        ) : (
           <div className="relative z-10 space-y-6 animate-in fade-in zoom-in duration-500">
              <button 
                onClick={() => setStep(1)}
                className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 hover:text-primary transition-colors mb-4"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> Voltar aos meus dados
              </button>
              
              {/* Skeleton Loading Premium (Adaptado para Light Mode) */}
              {brickLoading && (
                <div className="absolute inset-x-0 top-0 p-8 space-y-6 animate-pulse bg-slate-50 rounded-[2.5rem] z-10 border border-slate-100">
                   <div className="h-4 bg-slate-200 rounded-full w-1/3"></div>
                   <div className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <div className="h-4 bg-slate-200 rounded-full w-1/2"></div>
                         <div className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-4 bg-slate-200 rounded-full w-1/2"></div>
                         <div className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                      </div>
                   </div>
                   <div className="h-4 bg-slate-200 rounded-full w-2/3"></div>
                   <div className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                   <div className="h-16 bg-slate-200 rounded-2xl w-full mt-8"></div>
                </div>
              )}

              <div id="paymentCardBrick_container" className={`min-h-[300px] transition-opacity duration-700 ${brickLoading ? 'opacity-0' : 'opacity-100'}`}>
                 {/* O Mercado Pago vai injetar o formulário aqui */}
              </div>
           </div>
        )}
      </div>
      
      <footer className="mt-12 text-center">
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] select-none">
            Avadora System ® - 2026
         </p>
      </footer>

      {/* Selo de Segurança Mercado Pago */}
      <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
         <span className="material-symbols-outlined text-green-600 text-[18px]">verified_user</span>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Ambiente Seguro <span className="text-primary">Mercado Pago</span>
         </p>
      </div>

      {/* Modal de Ajuda para Erros de Pagamento */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-red-500 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl animate-pulse">info</span>
                <h3 className="font-black text-xl uppercase tracking-tight">Ajuda com o Pagamento</h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                   <span className="material-symbols-outlined text-lg">error</span>
                   {lastError === 'cc_rejected_high_risk' 
                     ? 'Pagamento Recusado por Segurança' 
                     : lastError === 'cc_rejected_insufficient_amount'
                     ? 'Saldo ou Limite Insuficiente'
                     : `Erro: ${lastError}`}
                </p>
              </div>

              {lastError === 'cc_rejected_insufficient_amount' ? (
                <div className="space-y-4 animate-in slide-in-from-top-1 duration-500">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">payments</span>
                    O que aconteceu:
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    O seu banco informou que <strong className="text-slate-900">não há saldo ou limite disponível</strong> no cartão no momento para completar esta transação.
                  </p>
                  
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-600 text-xl">tips_and_updates</span>
                      Sugestões para você:
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-600">
                      <li className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                        <span>Tente usar um <strong className="text-slate-900">cartão de outro banco</strong> ou com mais limite disponível.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                        <span>Se estiver usando um cartão de débito, verifique se possui o saldo exato em conta.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                        <span>Consulte o aplicativo do seu banco para verificar o limite diário de compras online.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">help</span>
                      Motivos Comuns de Recusa:
                    </h4>
                    
                    <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                      <div className="flex gap-3">
                         <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                         <p><strong className="text-slate-900">Mesmo Usuário:</strong> Você está tentando pagar com um cartão que está no mesmo nome ou CPF da conta que recebe o dinheiro (a conta da igreja no Mercado Pago). O Mercado Pago bloqueia isso automaticamente para evitar "auto-empréstimo" ou fraude.</p>
                      </div>
                      
                      <div className="flex gap-3">
                         <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                         <p><strong className="text-slate-900">Padrão de Compra:</strong> O valor ou o comportamento da compra saiu do padrão comum do cartão.</p>
                      </div>

                      <div className="flex gap-3">
                         <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                         <p><strong className="text-slate-900">Histórico do Cartão:</strong> O cartão pode ter sido usado em muitas tentativas seguidas recentemente.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-600 text-xl">task_alt</span>
                      O que você pode fazer:
                    </h4>
                    
                    <div className="space-y-3 text-sm text-slate-600">
                      <p className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                        <span><strong className="text-slate-900">Tente com outro cartão:</strong> De preferência de uma pessoa diferente (amigo ou familiar) que não tenha vínculo com a conta do Mercado Pago da igreja.</span>
                      </p>
                      <p className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                        <span><strong className="text-slate-900">Verifique o CPF:</strong> O Mercado Pago usa o CPF para validar se o titular do cartão é o mesmo que está fazendo a compra.</span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                Entendi, vou tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

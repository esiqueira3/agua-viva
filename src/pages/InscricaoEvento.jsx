import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function InscricaoEvento() {
  const { id } = useParams()
  const [evento, setEvento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [brickLoading, setBrickLoading] = useState(true)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [lastError, setLastError] = useState(null)
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    whatsapp: ''
  })
  const [publicKey, setPublicKey] = useState(null)
  const [step, setStep] = useState(1) // 1: Dados, 2: Pagamento

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

      const renderCardPaymentBrick = async (builder) => {
        const amountValue = Number(evento.valor_total) || 0;
        const maxInstallmentsValue = Number(evento.max_parcelas) || 1;

        console.log("Configurando Brick - Valor:", amountValue, "Max Parcelas:", maxInstallmentsValue);

        const settings = {
          initialization: {
            amount: Number(amountValue.toFixed(2)),
            payer: { email: form.email },
            installments: 1
          },
          customization: {
            visual: {
              style: {
                theme: 'default',
                customVariables: {
                  baseColor: '#8B5CF6',
                }
              }
            },
            paymentMethods: {
              maxInstallments: maxInstallmentsValue,
              minInstallments: 1
            }
          },
          callbacks: {
            onReady: () => {
              console.log("Card Brick Pronto com", maxInstallmentsValue, "parcelas! ✨");
              setBrickLoading(false);
            },
            onSubmit: async (formData) => {
              setSubmitting(true);
              console.log("Enviando pagamento: ", formData.installments, "parcelas");
              try {
                const response = await fetch('https://kfalhtebjoilpnncpkbd.supabase.co/functions/v1/mercado-pago-process', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...formData,
                    deviceId: formData.deviceId || window.MP_DEVICE_SESSION_ID,
                    evento_id: id,
                    nome_pagador: form.nome,
                    email_pagador: form.email,
                    whatsapp_pagador: form.whatsapp,
                    description: `Inscrição: ${evento.nome} - Titular: ${form.nome}`
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  console.error("❌ Erro técnico no servidor:", errorData);
                  throw new Error(errorData.error || 'Falha na comunicação com o servidor de pagamento');
                }

                const result = await response.json();
                console.log("💎 Resposta do Mercado Pago:", result);

                if (result.status === 'approved') {
                  const payload = {
                    evento_id: id,
                    nome_participante: form.nome,
                    email_participante: form.email,
                    whatsapp: form.whatsapp,
                    valor_pago: result.transaction_amount,
                    pagamento_id: String(result.id),
                    status: 'confirmada'
                  }
                  await supabase.from('inscricoes').insert([payload])
                  setSuccess(true);
                  notifyRegistration(form.nome, result.transaction_amount);
                } else if (result.status === 'in_process') {
                  const payload = {
                    evento_id: id,
                    nome_participante: form.nome,
                    email_participante: form.email,
                    whatsapp: form.whatsapp,
                    valor_pago: result.transaction_amount,
                    pagamento_id: String(result.id),
                    status: 'pendente'
                  }
                  await supabase.from('inscricoes').insert([payload])
                  alert("⏳ Seu pagamento está em análise. Fique tranquilo!");
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
        await builder.create('cardPayment', 'paymentCardBrick_container', settings);
      };

      renderCardPaymentBrick(bricksBuilder);
    }
  }, [step, publicKey, id, evento?.valor_total, evento?.max_parcelas]);

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

  if (success) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
       <div className="max-w-md w-full bg-white border border-slate-200 p-10 rounded-3xl text-center shadow-2xl">
          <span className="material-symbols-outlined text-6xl text-green-600 mb-4 animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Inscrição Recebida!</h2>
          <p className="text-slate-600 mb-8 font-medium">
            {evento.pago 
               ? "Pagamento confirmado! Sua inscrição está garantida. Te esperamos no evento! 🎉" 
               : "Sua vaga está garantida! Te esperamos no evento."}
          </p>
          <Link to="/" className="inline-block bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/80 transition-all">
             Voltar ao Início
          </Link>
       </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 selection:bg-primary selection:text-white">
      {/* Header Estilizado */}
      <div className="max-w-2xl w-full text-center mb-10">
         <img src="/logo.png" alt="Água Viva" className="h-14 mx-auto mb-6" />
         <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Inscrição: <span className="text-primary">{evento.nome}</span>
         </h1>
         <div className="flex flex-wrap justify-center gap-6 mt-6 text-slate-500 font-bold text-sm uppercase tracking-widest">
            <div className="flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">calendar_today</span>
               {/* Parse manual para evitar deslocamento de fuso UTC-3 */}
               {evento.data_evento
                 ? (() => { const [y, m, d] = evento.data_evento.split('-'); return `${d}/${m}/${y}`; })()
                 : 'Data a definir'}
            </div>
            <div className="flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">location_on</span>
               {evento.locais?.descricao || 'Local a definir'}
            </div>
         </div>
      </div>

      {/* Card de Inscrição */}
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <span className="text-slate-100 font-black text-8xl select-none">AV</span>
        </div>

        {step === 1 ? (
           <form onSubmit={handleInscricao} className="relative z-10 space-y-6">
              <div className="space-y-4">
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                       required type="text" placeholder="Como devemos te chamar?"
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">E-mail</label>
                    <input 
                       required type="email" placeholder="Para enviarmos seu ingresso"
                       value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">WhatsApp (Opcional)</label>
                    <input 
                       type="tel" placeholder="(00) 0 0000-0000"
                       value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>
              </div>

              <div className={`p-6 rounded-3xl border flex items-center justify-between transition-colors ${evento.pago ? 'bg-primary/5 border-primary/10' : 'bg-green-500/10 border-green-500/20'}`}>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Investimento</p>
                    <h3 className="text-2xl font-black text-slate-900">
                       {evento.pago ? `R$ ${evento.valor_total}` : 'Gratuito'}
                    </h3>
                 </div>
                 <span className="material-symbols-outlined text-4xl text-slate-300">
                    {evento.pago ? 'payments' : 'volunteer_activism'}
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

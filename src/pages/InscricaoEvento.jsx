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
      if (!error) setSuccess(true)
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (step === 2 && window.MercadoPago && publicKey && !window.bricksBuilder) {
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();
      window.bricksBuilder = bricksBuilder; // Prevenir duplicidade

      const renderCardPaymentBrick = async (builder) => {
        const settings = {
          initialization: {
            amount: evento.valor_total,
            payer: { email: form.email },
          },
          customization: {
            visual: {
              style: {
                theme: 'dark',
                customVariables: {
                  baseColor: '#8B5CF6',
                  formBackgroundColor: '#0f172a',
                  inputBackgroundColor: '#1e293b'
                }
              }
            },
            paymentMethods: {
              maxInstallments: 1
            }
          },
          callbacks: {
            onReady: () => {
              console.log("Card Brick Pronto! ✨");
              setBrickLoading(false);
            },
            onSubmit: async (formData) => {
              setSubmitting(true);
              try {
                // 1. Chamar a nossa Edge Function segura (O Robô)
                const response = await fetch('https://kfalhtebjoilpnncpkbd.supabase.co/functions/v1/mercado-pago-process', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...formData,
                    payer_email: form.email,
                    evento_id: id
                  }),
                });

                const result = await response.json();

                if (result.status === 'approved') {
                  // 1. Pagamento Aprovado Instantaneamente
                  const payload = {
                    evento_id: id,
                    nome_participante: form.nome,
                    email_participante: form.email,
                    whatsapp: form.whatsapp,
                    valor_pago: result.transaction_amount,
                    status: 'confirmada'
                  }
                  await supabase.from('inscricoes').insert([payload])
                  setSuccess(true);
                } else if (result.status === 'in_process') {
                  // 2. Pagamento em Análise (Ex: pending_review_manual)
                  const payload = {
                    evento_id: id,
                    nome_participante: form.nome,
                    email_participante: form.email,
                    whatsapp: form.whatsapp,
                    valor_pago: result.transaction_amount,
                    status: 'pendente' // Fica pendente aguardando MP
                  }
                  await supabase.from('inscricoes').insert([payload])
                  alert("⏳ Seu pagamento está em análise pelo Mercado Pago. Fique tranquilo, sua reserva já foi pré-confirmada e avisaremos assim que for liberado!");
                  setSuccess(true);
                } else {
                  // 3. Pagamento Rejeitado
                  alert(`❌ Pagamento ${result.status}: ${result.status_detail || 'Operação recusada'}. Verifique os dados ou use outro cartão.`);
                }
              } catch (e) {
                alert("⚠️ Erro no processamento: " + e.message);
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
  }, [step, publicKey, id]);

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl text-center shadow-2xl">
          <span className="material-symbols-outlined text-6xl text-green-400 mb-4 animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <h2 className="text-3xl font-black text-white mb-2">Inscrição Recebida!</h2>
          <p className="text-slate-300 mb-8">
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4 selection:bg-primary selection:text-white">
      {/* Header Estilizado */}
      <div className="max-w-2xl w-full text-center mb-10">
         <img src="/logo.png" alt="Água Viva" className="h-12 mx-auto mb-6 opacity-80" />
         <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Inscrição: <span className="text-primary">{evento.nome}</span>
         </h1>
         <div className="flex flex-wrap justify-center gap-6 mt-6 text-slate-400 font-bold text-sm uppercase tracking-widest">
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
      <div className="max-w-xl w-full bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <span className="text-white/5 font-black text-8xl select-none">AV</span>
        </div>

        {step === 1 ? (
           <form onSubmit={handleInscricao} className="relative z-10 space-y-6">
              <div className="space-y-4">
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                       required type="text" placeholder="Como devemos te chamar?"
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">E-mail</label>
                    <input 
                       required type="email" placeholder="Para enviarmos seu ingresso"
                       value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">WhatsApp (Opcional)</label>
                    <input 
                       type="tel" placeholder="(00) 0 0000-0000"
                       value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    />
                 </div>
              </div>

              <div className={`p-6 rounded-3xl border flex items-center justify-between transition-colors ${evento.pago ? 'bg-primary/10 border-primary/20' : 'bg-green-500/10 border-green-500/20'}`}>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Investimento</p>
                    <h3 className="text-2xl font-black text-white">
                       {evento.pago ? `R$ ${evento.valor_total}` : 'Gratuito'}
                    </h3>
                 </div>
                 <span className="material-symbols-outlined text-4xl text-white/20">
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
              
              {/* Skeleton Loading Premium */}
              {brickLoading && (
                <div className="absolute inset-x-0 top-0 p-8 space-y-6 animate-pulse bg-slate-900/40 rounded-[2.5rem] z-10 border border-white/5">
                   <div className="h-4 bg-white/10 rounded-full w-1/3"></div>
                   <div className="h-12 bg-white/5 rounded-2xl w-full"></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <div className="h-4 bg-white/10 rounded-full w-1/2"></div>
                         <div className="h-12 bg-white/5 rounded-2xl w-full"></div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-4 bg-white/10 rounded-full w-1/2"></div>
                         <div className="h-12 bg-white/5 rounded-2xl w-full"></div>
                      </div>
                   </div>
                   <div className="h-4 bg-white/10 rounded-full w-2/3"></div>
                   <div className="h-12 bg-white/5 rounded-2xl w-full"></div>
                   <div className="h-16 bg-white/10 rounded-2xl w-full mt-8"></div>
                </div>
              )}

              <div id="paymentCardBrick_container" className={`min-h-[300px] transition-opacity duration-700 ${brickLoading ? 'opacity-0' : 'opacity-100'}`}>
                 {/* O Mercado Pago vai injetar o formulário aqui */}
              </div>
           </div>
        )}
      </div>
      
      <p className="mt-12 text-slate-700 text-xs font-bold uppercase tracking-widest">
         © {new Date().getFullYear()} Comunidade Água Viva • Gestão Inteligente
      </p>
    </div>
  )
}

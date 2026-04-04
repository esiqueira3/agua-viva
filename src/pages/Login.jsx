import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Email, 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']) // 8 strings
  const [errorMsg, setErrorMsg] = useState(null)
  const [timer, setTimer] = useState(0)
  
  const navigate = useNavigate()

  // Gerenciador do Cronômetro de Reenvio
  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [timer])

  const [config, setConfig] = useState({
    url_capa_login: 'https://images.unsplash.com/photo-1507679799987-c7377ec48696?q=80&w=2071&auto=format&fit=crop',
    slogan_login: 'Água Viva - Gestão Ministerial',
    subtexto_login: 'Transformando vidas através da tecnologia e da fé.'
  })

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase.from('configuracoes_gerais').select('*').eq('id', 1).maybeSingle()
      if (data) setConfig(data)
    }
    loadConfig()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home')
    })
  }, [navigate])

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setErrorMsg(null)

    // PASSO 1: CHECAGEM DA WHITELIST
    const { data: autorizacao, error: dbError } = await supabase
      .from('usuarios_sistema')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (dbError || !autorizacao) {
       setErrorMsg("Acesso bloqueado! Sua conta não está autorizada.")
       setLoading(false)
       return
    }

    // PASSO 2: AUTORIZADO! ENVIANDO OTP
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: autorizacao.email,
      options: {
        shouldCreateUser: true,
        data: {
          nome: autorizacao.nome,
          telefone: autorizacao.telefone,
          perfil: autorizacao.perfil
        }
      }
    })

    if (authError) {
      setErrorMsg(authError.message)
      setLoading(false)
    } else {
      setLoading(false)
      setStep(2)
      setTimer(60)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 8) return
    setLoading(true)
    setErrorMsg(null)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (error) {
       setErrorMsg("Código inválido ou expirado!")
       setLoading(false)
    } else if (data.session) {
       setLoading(false)
       navigate('/home')
    }
  }

  const handleOtpChange = (e, index) => {
    const val = e.target.value
    if (/[^0-9]/.test(val)) return

    const newOtp = [...otp]
    newOtp[index] = val
    setOtp(newOtp)

    if (val !== '' && index < 7) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 8)
    if (!pastedData) return

    const newOtp = [...otp]
    const digits = pastedData.split('')
    digits.forEach((digit, i) => { if (i < 8) newOtp[i] = digit })
    setOtp(newOtp)
    const lastIndex = Math.min(digits.length - 1, 7)
    const lastInput = document.getElementById(`otp-${lastIndex}`)
    if (lastInput) lastInput.focus()
  }

  return (
    <div className="bg-background font-body text-on-surface min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
      
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 relative bg-white dark:bg-background">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary-container/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-tertiary-fixed/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md z-10 space-y-10">
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-[2rem] rotate-6 animate-pulse"></div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 w-full h-full rounded-3xl flex items-center justify-center shadow-2xl border border-white/10 p-5 relative z-10">
                <img src="/logo_branco.png" className="w-full h-full object-contain drop-shadow-lg animate-in zoom-in duration-1000" alt="Água Viva" />
              </div>
            </div>
            <h1 className="font-headline text-3xl font-black tracking-tighter text-on-surface mb-2 uppercase">Água Viva</h1>
            <p className="text-on-surface-variant font-black text-[10px] uppercase tracking-widest bg-surface-container-low px-4 py-1.5 rounded-full shadow-sm">Portal Administrativo</p>
          </div>

          <section className="bg-white dark:bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-outline-variant/10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
             <div className="space-y-6">
                
                {errorMsg && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-xs font-black uppercase tracking-tight flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">warning</span>
                    {errorMsg}
                  </div>
                )}

                {step === 1 ? (
                  <form onSubmit={handleSendCode} className="space-y-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black font-label uppercase tracking-[0.2em] text-on-surface-variant/60 ml-2">Identificação Ministerial</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-on-surface-variant text-xl group-focus-within:text-primary transition-colors">alternate_email</span>
                        </div>
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Digite seu email"
                          className="w-full pl-12 pr-4 py-5 bg-surface-container-low/50 border border-slate-300 dark:border-transparent rounded-[1.25rem] focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-on-surface placeholder:text-outline/30 outline-none text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase text-center pt-2 italic tracking-tight">O e-mail passará pela checagem de Segurança.</p>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading || !email}
                      className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-container hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                      {loading ? 'Consultando Cofre...' : <><span className="material-symbols-outlined text-xl">verified_user</span> Acessar Sistema</>}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-6">
                    <div className="space-y-4 pt-2">
                       <p className="text-center text-xs font-bold text-on-surface-variant/80 px-4 leading-relaxed">Mandamos um código de 8 dígitos para seu e-mail corporativo. Digite abaixo:</p>
                       <div className="flex justify-between gap-1.5" onPaste={handleOtpPaste}>
                          {otp.map((digit, i) => (
                             <input 
                                key={i}
                                id={`otp-${i}`}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(e, i)}
                                onKeyDown={(e) => handleOtpKeyDown(e, i)}
                                className="w-full h-14 text-center text-lg font-black bg-surface-container-low border border-slate-300 dark:border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none focus:bg-white dark:focus:bg-slate-800 transition-all"
                             />
                          ))}
                       </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading || otp.join('').length !== 8}
                      className="w-full py-5 bg-gradient-to-br from-primary to-primary-container text-white font-black rounded-2xl shadow-[0_10px_40px_-10px_rgba(var(--primary-rgb),0.5)] border-none outline-none hover:scale-[1.02] hover:brightness-125 hover:shadow-primary/60 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs ring-4 ring-primary/5"
                    >
                      {loading ? 'Validando...' : 'ENTRAR NO SISTEMA'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setStep(1)}
                      className="w-full py-2 text-xs font-black text-on-surface-variant/40 hover:text-primary transition-colors flex items-center justify-center gap-1 uppercase tracking-tighter"
                    >
                       <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar para identificação
                    </button>
                  </form>
                )}
             </div>
          </section>
        </div>
      </div>

      {/* LADO DIREITO: CAPA DINÂMICA */}
      <div className="hidden lg:flex relative overflow-hidden bg-slate-950 items-center justify-center p-0 select-none group">
          {/* Imagem de Fundo (Robusta com a sua capa oficial como reserva) */}
          <img 
            src={config.url_capa_login || 'https://kfalhtebjoilpnncpkbd.supabase.co/storage/v1/object/public/profiles/01.capa.jpg'}
            key={config.url_capa_login}
            alt="Fundo"
            className="absolute inset-0 w-full h-full object-cover z-0"
            onError={(e) => {
              e.target.src = 'https://kfalhtebjoilpnncpkbd.supabase.co/storage/v1/object/public/profiles/01.capa.jpg'
            }}
          />
          
          {/* Overlay Gradiente Premium (Dinamizado) */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-950/30 to-primary/10 z-10"></div>

          {/* Elementos Decorativos */}
          <div className="absolute top-12 right-12 flex gap-1 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20"></div>)}
          </div>

          <div className="z-20 max-w-lg animate-in fade-in slide-in-from-right-10 duration-1000">
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-6 drop-shadow-2xl">
              {config.slogan_login}
            </h2>
            <div className="w-16 h-1 bg-tertiary-fixed mb-8 rounded-full"></div>
            <p className="text-xl text-white/70 font-medium leading-relaxed">
              {config.subtexto_login}
            </p>
            
          </div>
      </div>
    </div>
  )
}

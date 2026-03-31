import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Email, 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']) // 8 strings
  const [errorMsg, setErrorMsg] = useState(null)
  
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home')
    })
  }, [navigate])

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setErrorMsg(null)

    // PASSO 1: CHECAGEM DA WHITELIST (CATRACA SEGUNDA ETAPA)
    const { data: autorizacao, error: dbError } = await supabase
      .from('usuarios_sistema')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (dbError || !autorizacao) {
       setErrorMsg("Acesso bloqueado! Sua conta não está na lista de e-mails autorizados. Procure a Liderança.")
       setLoading(false)
       return
    }

    // PASSO 2: AUTORIZADO! ENVIANDO OTP
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: autorizacao.email,
      options: {
        shouldCreateUser: true, // Cria Auth baseado no passe-livre
        data: {
          nome: autorizacao.nome,
          telefone: autorizacao.telefone,
          perfil: autorizacao.perfil // Salva as permissões na Identidade Auth
        }
      }
    })

    if (authError) {
      setErrorMsg(authError.message)
      setLoading(false)
    } else {
      setLoading(false)
      setStep(2)
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
       setErrorMsg("Código inválido ou expirado! Tente novamente.")
       setLoading(false)
    } else if (data.session) {
       setLoading(false)
       navigate('/home')
    }
  }

  const handleOtpChange = (e, index) => {
    const val = e.target.value
    if (/[^0-9]/.test(val)) return // aceita só número

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

  return (
    <div className="bg-background font-body text-on-surface min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary-container/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-tertiary-fixed/10 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 mb-6 relative">
            <div className="absolute inset-0 bg-primary rounded-2xl rotate-3 opacity-10"></div>
            <div className="bg-primary-container w-full h-full rounded-2xl flex items-center justify-center shadow-lg border border-primary-container/20">
              <span className="material-symbols-outlined text-tertiary-fixed text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            </div>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary mb-2">
            Acesso Restrito
          </h1>
          <p className="text-on-surface-variant font-medium text-sm max-w-[280px] leading-relaxed">
            Painel Administrativo da Água Viva
          </p>
        </div>

        <section className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(21,28,39,0.06)] border border-outline-variant/10">
          <div className="space-y-6">
            
            {errorMsg && (
              <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-lg text-sm text-center font-bold">
                {errorMsg}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendCode} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold font-label uppercase tracking-widest text-on-surface-variant ml-1">E-mail Oficial</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant text-xl">account_circle</span>
                    </div>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="lider@ibav.com.br"
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all font-bold text-on-surface placeholder:text-outline/40 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant/70 italic text-center pt-2">O e-mail passará pela checagem de Segurança.</p>
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !email}
                  className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Consultando Cofre...' : <><span className="material-symbols-outlined text-xl">mail_lock</span> Conferir Acesso e Mandar Código</>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-xs font-bold font-label uppercase tracking-widest text-on-surface-variant">Código (8 dígitos)</label>
                  </div>
                  <div className="flex justify-between gap-1 sm:gap-2">
                    {otp.map((data, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={data}
                        onChange={(e) => handleOtpChange(e, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="w-8 sm:w-10 h-12 sm:h-14 bg-surface-container-low border border-outline-variant/30 text-center text-xl sm:text-2xl font-black text-primary rounded-md focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] items-center gap-1 flex justify-center text-green-700 font-bold bg-green-100 rounded-full py-1">
                     <span className="material-symbols-outlined text-[12px]">check_circle</span>
                     Enviado para: {email}
                  </p>
                </div>
                
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Autenticando...' : 'Destrancar Painel'}
                  <span className="material-symbols-outlined text-xl">login</span>
                </button>
                
                <div className="text-center pt-2">
                  <p className="text-sm font-medium text-on-surface-variant">
                    <button type="button" onClick={() => {setStep(1); setOtp(['','','','','','','',''])}} className="text-primary font-bold hover:underline">Voltar</button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>

        <footer className="mt-12 text-center flex flex-col items-center">
           <span className="material-symbols-outlined text-outline/30 text-3xl mb-1">verified_user</span>
           <p className="text-[10px] text-outline font-bold tracking-[0.2em] uppercase">Security Engine By Água Viva</p>
        </footer>
      </main>
    </div>
  )
}

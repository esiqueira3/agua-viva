import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function InscricaoMembro() {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [config, setConfig] = useState(null)
  
  const [form, setForm] = useState({
    nome_completo: '', 
    data_nascimento: '', 
    sexo: 'Masculino', 
    estado_civil: 'Solteiro(a)', 
    cpf: '', 
    telefone_principal: '', 
    email: '', 
    endereco_cep: '', 
    endereco_rua: '', 
    endereco_numero: '', 
    endereco_bairro: '', 
    endereco_cidade: '', 
    endereco_estado: '',
    observacoes_gerais: 'Cadastro via Link Público',
    status: false, // Inativo até aprovação
    tipo_membro: 'Congregado'
  })

  useEffect(() => {
    async function loadBranding() {
      const { data } = await supabase.from('configuracoes_gerais').select('*').eq('id', 1).maybeSingle()
      if (data) setConfig(data)
    }
    loadBranding()
  }, [])

  const handleCepChange = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '')
    setForm(f => ({ ...f, endereco_cep: cep }))
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setForm(f => ({
            ...f,
            endereco_rua: data.logradouro,
            endereco_bairro: data.bairro,
            endereco_cidade: data.localidade,
            endereco_estado: data.uf
          }))
        }
      } catch (err) {}
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    let val = value

    if (name === 'nome_completo') val = val.toUpperCase()
    
    if (name === 'cpf') {
      val = val.replace(/\D/g, '')
      if (val.length > 11) val = val.slice(0, 11)
      val = val.replace(/(\d{3})(\d)/, '$1.$2')
      val = val.replace(/(\d{3})(\d)/, '$1.$2')
      val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }

    setForm(f => ({ ...f, [name]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      // 1. Verificar se CPF já existe
      const cleanCpf = form.cpf.replace(/\D/g, '')
      const { data: existing } = await supabase
        .from('membros')
        .select('id')
        .eq('cpf', form.cpf)
        .maybeSingle()

      if (existing) {
        throw new Error('Este CPF já está cadastrado em nossa plataforma. Por favor, entre em contato com a secretaria.')
      }

      // 2. Gerar matrícula sequencial (obrigatória no banco)
      const { data: lastMembro } = await supabase
         .from('membros')
         .select('matricula')
         .order('matricula', { ascending: false })
         .limit(1)
         
      let nextNum = 1
      if (lastMembro && lastMembro.length > 0 && lastMembro[0].matricula) {
         const parsedStr = lastMembro[0].matricula.replace(/\D/g, '')
         if (parsedStr) nextNum = parseInt(parsedStr, 10) + 1
      }
      const finalMatricula = String(nextNum).padStart(6, '0')

      const { error } = await supabase.from('membros').insert([{
        ...form,
        matricula: finalMatricula,
        idade: calculateAge(form.data_nascimento),
        faixa_etaria: getFaixaEtaria(calculateAge(form.data_nascimento))
      }])

      if (error) throw error

      setSucesso(true)
      window.scrollTo(0, 0)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const getFaixaEtaria = (age) => {
    if (age === null) return ''
    if (age <= 11) return 'Criança'
    if (age <= 17) return 'Adolescente'
    if (age <= 29) return 'Jovem'
    if (age <= 59) return 'Adulto'
    return 'Idoso(a)'
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in duration-500">
           <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
           </div>
           <h2 className="text-3xl font-black text-slate-900 mb-4">Cadastro Realizado!</h2>
           <p className="text-slate-500 font-medium leading-relaxed">
             Sua solicitação de membro foi enviada com sucesso para a secretaria da **Água Viva**. 
             Em breve, nossa equipe entrará em contato para confirmar seus dados. 
             <br /><br />
             Seja bem-vindo(a)! 🙏✨
           </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden font-body">
      {/* Elementos Decorativos */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        
        {/* Header da Landing Page */}
        <div className="text-center mb-12">
           <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-16 mx-auto mb-6 drop-shadow-lg"
           />
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
             {config?.slogan_principal || "Faça parte da nossa família"}
           </h1>
           <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
             {config?.subtexto_slogan || "Complete seus dados abaixo para iniciar sua jornada conosco na Água Viva."}
           </p>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
           
           <div className="p-8 md:p-12 space-y-10">
              
              {erro && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                   <span className="material-symbols-outlined">error</span>
                   <p className="text-sm font-bold">{erro}</p>
                </div>
              )}

              {/* Seção 1: Identidade */}
              <section>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">1</div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dados Pessoais</h2>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</label>
                       <input required name="nome_completo" value={form.nome_completo} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold" placeholder="EX: JOÃO DA SILVA" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento *</label>
                       <input required type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF (Verificação) *</label>
                       <input required name="cpf" value={form.cpf} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-mono font-bold" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexo *</label>
                       <select name="sexo" value={form.sexo} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold">
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                       </select>
                    </div>
                 </div>
              </section>

              {/* Seção 2: Contato */}
              <section>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">2</div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Como falamos com você?</h2>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone *</label>
                       <input required type="tel" name="telefone_principal" value={form.telefone_principal} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                       <input type="email" name="email" value={form.email} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold" placeholder="seu@email.com" />
                    </div>
                 </div>
              </section>

              {/* Seção 3: Endereço */}
              <section>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">3</div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Onde você mora?</h2>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                       <input name="endereco_cep" value={form.endereco_cep} onChange={(e) => handleCepChange(e.target.value)} maxLength={9} className="w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold" placeholder="00000-000" />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                       <input name="endereco_rua" value={form.endereco_rua} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                       <input name="endereco_numero" value={form.endereco_numero} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                       <input name="endereco_bairro" value={form.endereco_bairro} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade (UF)</label>
                       <input name="endereco_cidade" value={`${form.endereco_cidade} ${form.endereco_estado}`} readOnly className="w-full p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-500" />
                    </div>
                 </div>
              </section>

              <div className="pt-6">
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                 >
                   {loading ? (
                     <>
                       <span className="material-symbols-outlined animate-spin">refresh</span>
                       PROCESSANDO...
                     </>
                   ) : (
                     <>
                       FINALIZAR MEU CADASTRO
                       <span className="material-symbols-outlined">rocket_launch</span>
                     </>
                   )}
                 </button>
                 <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                    Sua privacidade é importante. Seus dados estão protegidos.
                 </p>
              </div>

           </div>

        </form>

        <div className="mt-12 text-center">
           <p className="text-slate-500 font-bold text-sm">© 2026 Água Viva - Sistema de Gestão Ministerial</p>
        </div>

      </div>
    </div>
  )
}

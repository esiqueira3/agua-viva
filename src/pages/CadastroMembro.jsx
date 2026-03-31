import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

// Instanciando FORA para a engine do React não Unmountar (Bug foco)
const FormField = ({ label, name, type="text", form, onChange, autoFocus }) => (
  <div className="flex flex-col gap-1 mb-4 flex-1">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    <input 
        autoFocus={autoFocus}
        type={type} name={name} 
        value={form[name] || ''} onChange={onChange}
        readOnly={name === 'matricula'}
        className={`p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none ${name === 'matricula' ? 'bg-surface-variant font-mono font-bold text-primary/70 cursor-not-allowed' : ''}`}
    />
  </div>
)

const SelectMenu = ({ label, name, options, form, onChange }) => (
  <div className="flex flex-col gap-1 mb-4 flex-1">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    <select 
       name={name} value={form[name] || ''} onChange={onChange}
       className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none"
    >
       <option value="">-- Selecione --</option>
       {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)

export default function CadastroMembro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [departamentos, setDepartamentos] = useState([])

  const [form, setForm] = useState({
    nome_completo: '', data_nascimento: '', sexo: 'Masculino', estado_civil: 'Solteiro(a)', 
    cpf: '', rg: '', nacionalidade: 'Brasileira', naturalidade: '',
    telefone_principal: '', email: '', 
    endereco_cep: '', endereco_rua: '', endereco_numero: '', endereco_bairro: '', endereco_cidade: '', endereco_estado: '',
    data_conversao: '', data_batismo: '', local_batismo: '',
    tipo_membro: 'Membro', igreja_origem: '', data_entrada: '', departamento_id: '', cargo_funcao: 'Outro',
    nome_conjuge: '', responsavel_menor: '', observacoes_gerais: '', necessidades_especiais: '',
    status: true, matricula: ''
  })

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('departamentos').select('id, nome')
      if (data) setDepartamentos(data)

      if (id) {
        const { data: membro } = await supabase.from('membros').select('*').eq('id', id).single()
        if (membro) {
           ['data_nascimento', 'data_conversao', 'data_batismo', 'data_entrada'].forEach(df => {
              if(membro[df]) membro[df] = membro[df].split('T')[0]
           })
           setForm(membro)
        }
      } else {
        const { data: lastMembro } = await supabase
           .from('membros')
           .select('matricula')
           .order('created_at', { ascending: false })
           .limit(1)
           
        let nextNum = 1
        if (lastMembro && lastMembro.length > 0 && lastMembro[0].matricula) {
           const parsedStr = lastMembro[0].matricula.replace(/\D/g, '')
           if (parsedStr) nextNum = parseInt(parsedStr, 10) + 1
        }
        
        const finalMatricula = String(nextNum).padStart(6, '0')
        setForm(f => ({ ...f, matricula: finalMatricula }))
      }
    }
    init()
  }, [id])

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

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = { ...form }
    if(!payload.departamento_id) payload.departamento_id = null
    const dateFields = ['data_nascimento', 'data_conversao', 'data_batismo', 'data_entrada']
    dateFields.forEach(df => { if(!payload[df]) payload[df] = null })

    let responseError = null
    if (id) {
      const { error } = await supabase.from('membros').update(payload).eq('id', id)
      responseError = error
    } else {
      const { error } = await supabase.from('membros').insert([payload])
      responseError = error
    }
    
    setLoading(false)
    if (responseError) {
      alert("❌ Ocorreu um erro ao persistir as informações:\n\n" + responseError.message)
      console.error(responseError)
      return
    }
    navigate('/membros')
  }

  const handleFormChange = (e) => {
    let { name, value } = e.target
    if (name === 'cpf') {
      value = value.replace(/\D/g, '') // remove letras
      if (value.length > 11) value = value.slice(0, 11) // limite
      // Regex acumulativa Padrão Brasileiro
      value = value.replace(/(\d{3})(\d)/, '$1.$2')
      value = value.replace(/(\d{3})(\d)/, '$1.$2')
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    setForm({...form, [name]: value})
  }

  const tabData = [
    {
      label: "1. Dados Pessoais",
      content: (
        <div className="grid grid-cols-2 gap-4">
           <FormField autoFocus label="Nome Completo *" name="nome_completo" form={form} onChange={handleFormChange} />
           <FormField label="Data de Nascimento *" name="data_nascimento" type="date" form={form} onChange={handleFormChange} />
           
           <SelectMenu label="Sexo *" name="sexo" options={[{label:'Masculino', value:'Masculino'}, {label:'Feminino', value:'Feminino'}]} form={form} onChange={handleFormChange} />
           <SelectMenu label="Estado Civil *" name="estado_civil" options={[{label:'Solteiro(a)', value:'Solteiro(a)'}, {label:'Casado(a)', value:'Casado(a)'}, {label:'Divorciado(a)', value:'Divorciado(a)'}, {label:'Viúvo(a)', value:'Viúvo(a)'}, {label:'União Estável', value:'União Estável'}]} form={form} onChange={handleFormChange} />
           
           <FormField label="CPF" name="cpf" form={form} onChange={handleFormChange} />
           <FormField label="Ident. Estrangeiro" name="rg" form={form} onChange={handleFormChange} />
           <FormField label="Nacionalidade" name="nacionalidade" form={form} onChange={handleFormChange} />
           <FormField label="Naturalidade (Cidade de Nasc.)" name="naturalidade" form={form} onChange={handleFormChange} />
        </div>
      )
    },
    {
      label: "2. Contato",
      content: (
        <div className="grid grid-cols-2 gap-4">
           <FormField label="Telefone / WhatsApp *" name="telefone_principal" form={form} onChange={handleFormChange} />
           <FormField label="Email" name="email" type="email" form={form} onChange={handleFormChange} />
           
           <div className="flex flex-col gap-1 mb-4 flex-1">
             <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-[#E6C364]">CEP (Busca Auto)</label>
             <input type="text" value={form.endereco_cep} onChange={(e) => handleCepChange(e.target.value)} maxLength={9} placeholder="00000-000" className="p-3 bg-[#E6C364]/10 border border-[#E6C364]/30 rounded-lg focus:ring-2 focus:ring-[#E6C364] outline-none font-medium" />
           </div>

           <FormField label="Rua / Logradouro" name="endereco_rua" form={form} onChange={handleFormChange} />
           <FormField label="Número" name="endereco_numero" form={form} onChange={handleFormChange} />
           <FormField label="Bairro" name="endereco_bairro" form={form} onChange={handleFormChange} />
           <FormField label="Cidade" name="endereco_cidade" form={form} onChange={handleFormChange} />
           
           <SelectMenu label="Estado (UF)" name="endereco_estado" options={['SP','RJ','MG','ES','PR','SC','RS','MS','MT','GO','DF','TO','PA','AP','RR','AM','AC','RO','MA','PI','CE','RN','PB','PE','AL','SE','BA'].map(uf => ({label: uf, value: uf}))} form={form} onChange={handleFormChange} />
        </div>
      )
    },
    {
      label: "3. Eclesiásticos",
      content: (
        <div className="grid grid-cols-2 gap-4">
           <FormField label="Data Conversão" name="data_conversao" type="date" form={form} onChange={handleFormChange} />
           <FormField label="Data Batismo" name="data_batismo" type="date" form={form} onChange={handleFormChange} />
           
           <FormField label="Local do Batismo" name="local_batismo" form={form} onChange={handleFormChange} />
           <SelectMenu label="Tipo de Membro *" name="tipo_membro" options={[{label:'Membro', value:'Membro'}, {label:'Congregado', value:'Congregado'}, {label:'Visitante', value:'Visitante'}]} form={form} onChange={handleFormChange} />

           <FormField label="Igreja de Origem" name="igreja_origem" form={form} onChange={handleFormChange} />
           <FormField label="Data de Entrada na Igreja" name="data_entrada" type="date" form={form} onChange={handleFormChange} />

           <SelectMenu label="Ministério / Departamento" name="departamento_id" options={departamentos.map(d => ({ value: d.id, label: d.nome }))} form={form} onChange={handleFormChange} />
           <SelectMenu label="Cargo ou Função" name="cargo_funcao" options={[{label:'Líder', value:'Líder'}, {label:'Diácono', value:'Diácono'}, {label:'Músico', value:'Músico'}, {label:'Voluntário', value:'Voluntário'}, {label:'Outro', value:'Outro'}]} form={form} onChange={handleFormChange} />
        </div>
      )
    },
    {
       label: "4. Familiar",
       content: (
         <div className="grid grid-cols-1 gap-4 max-w-xl">
           <FormField label="Nome do Cônjuge (se houver)" name="nome_conjuge" form={form} onChange={handleFormChange} />
           <FormField label="Responsável (se for Menor de Idade)" name="responsavel_menor" form={form} onChange={handleFormChange} />
         </div>
       )
    },
    {
       label: "5. Administração",
       content: (
         <div className="grid grid-cols-1 gap-4 max-w-xl">
           <FormField label="Número de Matrícula (Gerado Automaticamente)" name="matricula" form={form} onChange={handleFormChange} />
           <div className="flex flex-col gap-1 mb-4 flex-1">
             <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Observações Gerais</label>
             <textarea name="observacoes_gerais" value={form.observacoes_gerais || ''} onChange={handleFormChange} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg outline-none h-24" />
           </div>
         </div>
       )
    },
    {
       label: "6. Especiais",
       content: (
         <div className="grid grid-cols-1 gap-4 max-w-xl">
           <div className="flex flex-col gap-1 mb-4 flex-1">
             <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-[#E6C364]">Necessidades Especiais Médicas ou Outras</label>
             <textarea name="necessidades_especiais" value={form.necessidades_especiais || ''} onChange={handleFormChange} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg outline-none h-24" />
           </div>
         </div>
       )
    }
  ]

  return (
    <form onSubmit={handleSave} className="max-w-7xl mx-auto space-y-6 pb-24 relative">
      <PageHeader title={id ? "Editar Membro" : "Novo Membro Cadastro Integral"} icon="person_add" />
      
      <div className="flex items-center gap-4 bg-primary/5 p-6 rounded-xl border border-primary/10">
         <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl uppercase">
            {form.nome_completo ? form.nome_completo.substring(0,2) : "I"}
         </div>
         <div>
            <h3 className="font-extrabold text-xl text-primary">{form.nome_completo || "Identidade do Membro"}</h3>
            <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 bg-tertiary-fixed-dim/40 rounded-full">{form.matricula}</span>
         </div>
      </div>
      
      <Tabs tabs={tabData} />

      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-outline-variant/20 flex gap-4 justify-end z-40">
        <button type="button" onClick={() => navigate('/membros')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar Ficha Completa'}
        </button>
      </div>
    </form>
  )
}

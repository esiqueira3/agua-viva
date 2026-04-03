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
    status: true, matricula: '', idade: '', faixa_etaria: '', escolaridade: ''
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
    
    // Validação de Pastor Presidente Único
    if (form.tipo_membro === 'Pastor Presidente') {
      const { data: existingPresidents } = await supabase
        .from('membros')
        .select('id, nome_completo')
        .eq('tipo_membro', 'Pastor Presidente')
        .neq('id', id || '00000000-0000-0000-0000-000000000000')
        .limit(1);

      if (existingPresidents && existingPresidents.length > 0) {
        const president = existingPresidents[0];
        alert(`⚠️ Atenção: Já existe um Pastor Presidente cadastrado (${president.nome_completo}). Só é permitido um registro com esse cargo.`);
        setLoading(false);
        return;
      }
    }

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
    const { name } = e.target;
    let { value } = e.target;

    // Padronização para CAIXA ALTA
    if (name === 'nome_completo') {
      value = value.toUpperCase();
    }

    // Formatação de CPF
    if (name === 'cpf') {
      value = value.replace(/\D/g, '') // remove letras
      if (value.length > 11) value = value.slice(0, 11) // limite
      value = value.replace(/(\d{3})(\d)/, '$1.$2')
      value = value.replace(/(\d{3})(\d)/, '$1.$2')
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }

    if (name === 'data_nascimento' && value) {
      const { age, group } = calculateAgeDetails(value)
      setForm(prev => ({ ...prev, [name]: value, idade: age, faixa_etaria: group }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const calculateAgeDetails = (birthDate) => {
    if (!birthDate) return { age: '', group: '' }
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
    }

    let group = ''
    if (age <= 11) group = 'Criança'
    else if (age <= 17) group = 'Adolescente'
    else if (age <= 29) group = 'Jovem'
    else if (age <= 59) group = 'Adulto'
    else group = 'Idoso(a)'

    return { age, group }
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
            
            <div className="flex gap-4 col-span-2 md:col-span-1">
               <div className="flex-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Idade (Auto)</label>
                  <input type="text" value={form.idade || ''} readOnly className="w-full p-3 bg-surface-variant/20 border border-outline-variant/20 rounded-lg font-black text-primary outline-none cursor-not-allowed" />
               </div>
               <div className="flex-[2] relative group">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60 flex items-center gap-1">
                     Faixa Etária (Inteligência)
                     <span className="material-symbols-outlined text-[14px] cursor-help text-primary/50">info</span>
                  </label>
                  <input type="text" value={form.faixa_etaria || ''} readOnly className="w-full p-3 bg-primary/10 border border-primary/20 rounded-lg font-black text-primary outline-none cursor-not-allowed italic" />
                  
                  {/* Tooltip / Help Box */}
                  <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-800 border border-outline-variant/30 rounded-xl shadow-2xl z-50 w-64 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                     <p className="text-[10px] font-black uppercase text-primary mb-2 border-b border-primary/10 pb-1">Regras de Classficação</p>
                     <ul className="space-y-1">
                        <li className="flex justify-between text-[11px] font-bold"><span className="text-on-surface-variant">Criança</span> <span className="text-primary">0 – 11 anos</span></li>
                        <li className="flex justify-between text-[11px] font-bold"><span className="text-on-surface-variant">Adolescente</span> <span className="text-primary">12 – 17 anos</span></li>
                        <li className="flex justify-between text-[11px] font-bold"><span className="text-on-surface-variant">Jovem</span> <span className="text-primary">18 – 29 anos</span></li>
                        <li className="flex justify-between text-[11px] font-bold"><span className="text-on-surface-variant">Adulto</span> <span className="text-primary">30 – 59 anos</span></li>
                        <li className="flex justify-between text-[11px] font-bold"><span className="text-on-surface-variant">Idoso(a)</span> <span className="text-primary">60+ anos</span></li>
                     </ul>
                  </div>
               </div>
            </div>

            <FormField label="Ident. Estrangeiro" name="rg" form={form} onChange={handleFormChange} />
            
            <SelectMenu 
               label="Escolaridade" 
               name="escolaridade" 
               options={[
                  {label:'Educação Infantil', value:'Educação Infantil'},
                  {label:'Ensino Fundamental', value:'Ensino Fundamental'},
                  {label:'Ensino Médio', value:'Ensino Médio'},
                  {label:'Ensino Superior - Tecnólogo', value:'Ensino Superior - Tecnólogo'},
                  {label:'Ensino Superior - Licenciatura', value:'Ensino Superior - Licenciatura'},
                  {label:'Ensino Superior - Bacharelado', value:'Ensino Superior - Bacharelado'},
                  {label:'Ensino Superior - Especialização (Pós-graduação / MBA)', value:'Ensino Superior - Especialização (Pós-graduação / MBA)'},
                  {label:'Ensino Superior - Mestrado', value:'Ensino Superior - Mestrado'},
                  {label:'Ensino Superior - Doutorado', value:'Ensino Superior - Doutorado'},
                  {label:'Ensino Superior - PhD', value:'Ensino Superior - PhD'},
                  {label:'Nenhum', value:'Nenhum'}
               ]} 
               form={form} 
               onChange={handleFormChange} 
            />

            <FormField label="Nacionalidade" name="nacionalidade" form={form} onChange={handleFormChange} />
            <FormField label="Naturalidade" name="naturalidade" form={form} onChange={handleFormChange} />


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
           <SelectMenu 
              label="Tipo de Membro *" 
              name="tipo_membro" 
              options={[
                {label:'Membro', value:'Membro'}, 
                {label:'Congregado', value:'Congregado'}, 
                {label:'Afastado', value:'Afastado'},
                {label:'Visitante', value:'Visitante'},
                {label:'Pastor', value:'Pastor'}, 
                {label:'Pastor Presidente', value:'Pastor Presidente'}, 
                {label:'Vice Presidente', value:'Vice Presidente'}, 
                {label:'Diretoria', value:'Diretoria'}
              ]} 
              form={form} 
              onChange={handleFormChange} 
           />

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

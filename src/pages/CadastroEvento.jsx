import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { MultiSelect } from '../components/ui/MultiSelect'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

// Instanciados FORA para proteger o foco do DOM virtual
const FormField = ({ label, name, type="text", required=false, disabled=false, form, onChange, autoFocus, min }) => (
  <div className="flex flex-col gap-1 mb-4 flex-1">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    <input 
        autoFocus={autoFocus} min={min}
        type={type} name={name} required={required} disabled={disabled}
        value={form[name] || ''} onChange={onChange}
        className={`p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none ${disabled?'bg-surface-variant/50 cursor-not-allowed':''}`}
    />
  </div>
)

const SelectMenu = ({ label, name, options, required=false, form, onChange }) => (
  <div className="flex flex-col gap-1 mb-4 flex-1">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    <select 
       name={name} value={form[name] || ''} onChange={onChange} required={required}
       className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none"
    >
       <option value="">-- Selecione --</option>
       {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)

const Toggle = ({ label, name, form, onChange }) => (
  <div className="flex flex-col gap-1 mb-4">
     <label className="flex items-center cursor-pointer mt-5">
       <div className="relative">
         <input type="checkbox" className="sr-only" name={name} checked={form[name]} onChange={onChange} />
         <div className={`block w-10 h-6 rounded-full transition-colors ${form[name] ? 'bg-primary' : 'bg-outline-variant/50'}`}></div>
         <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form[name] ? 'translate-x-4' : ''}`}></div>
       </div>
       <div className="ml-3 font-semibold text-sm">{label}</div>
     </label>
  </div>
)

export default function CadastroEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const [locais, setLocais] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [membros, setMembros] = useState([])

  const [form, setForm] = useState({
    nome: '', data_evento: '', hora_evento: '', local_id: '', status: 'Agendado',
    departamento_id: '', lider_responsavel_id: '', equipe_envolvida: [],
    limite_participantes: false, quantidade_maxima: '', link_inscricao: '', confirmacao_presenca: false,
    frequencia: 'nao_repetir'
  })

  useEffect(() => {
    async function loadResources() {
      const [ resLocais, resDepts, resMembros ] = await Promise.all([
        supabase.from('locais').select('id, descricao').eq('status', true),
        supabase.from('departamentos').select('id, nome, lider_principal_id'),
        supabase.from('membros').select('id, nome_completo').eq('status', true)
      ])
      
      if(resLocais.data) setLocais(resLocais.data)
      if(resDepts.data) setDepartamentos(resDepts.data)
      if(resMembros.data) setMembros(resMembros.data)

      if (id) {
        const { data } = await supabase.from('eventos').select('*').eq('id', id).single()
        if (data) {
           const ev = {...data}
           if (ev.data_evento) ev.data_evento = ev.data_evento.split('T')[0]
           if (ev.hora_evento) ev.hora_evento = ev.hora_evento.substring(0, 5)
           setForm(ev)
        }
      }
    }
    loadResources()
  }, [id])

  useEffect(() => {
    if(form.departamento_id) {
       const dept = departamentos.find(d => d.id === form.departamento_id)
       if(dept && dept.lider_principal_id) {
          setForm(f => ({...f, lider_responsavel_id: dept.lider_principal_id}))
       }
    }
  }, [form.departamento_id, departamentos])

  const handleFormChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({...form, [e.target.name]: value})
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form }
    
    if(!payload.local_id) payload.local_id = null
    if(!payload.departamento_id) payload.departamento_id = null
    if(!payload.lider_responsavel_id) payload.lider_responsavel_id = null
    if(!payload.quantidade_maxima || !payload.limite_participantes) payload.quantidade_maxima = null
    if(payload.hora_evento.length === 5) payload.hora_evento += ':00'

    // Bloco Validador: Impede inserção de Datas Anteriores para Novos Eventos
    const todayStr = new Date().toISOString().split('T')[0]
    if (!id && payload.data_evento && payload.data_evento < todayStr) {
       alert("⚠️ Erro de Validação:\nNão é permitido planejar e cadastrar Novos Eventos com datas retroativas (anteriores a data de hoje). Para histórico use o módulo correto.")
       setLoading(false)
       return
    }

    let responseError = null
    if (id) {
      const { error } = await supabase.from('eventos').update(payload).eq('id', id)
      responseError = error
    } else {
      const { error } = await supabase.from('eventos').insert([payload])
      responseError = error
    }
    setLoading(false)

    if (responseError) {
      alert("❌ Ocorreu um erro no servidor:\n\n" + responseError.message)
      console.error(responseError)
      return
    }

    navigate('/eventos')
  }

  const membrosOptions = membros.map(m => ({ value: m.id, label: m.nome_completo }))

  const tabData = [
    {
      label: "1. Organização",
      content: (
        <div className="grid grid-cols-2 gap-4 max-w-4xl">
           <SelectMenu label="Departamento Responsável" name="departamento_id" options={departamentos.map(d => ({ value: d.id, label: d.nome }))} form={form} onChange={handleFormChange} />
           <SelectMenu label="Líder Responsável (Editável)" name="lider_responsavel_id" options={membrosOptions} form={form} onChange={handleFormChange} />
           
           <div className="col-span-2">
             <MultiSelect 
               label="Equipe Envolvida no Evento" 
               options={membrosOptions}
               selectedValues={form.equipe_envolvida}
               onChange={(vals) => setForm({...form, equipe_envolvida: vals})}
             />
           </div>
        </div>
      )
    },
    {
      label: "2. Participação e Inscrição",
      content: (
        <div className="grid grid-cols-2 gap-4 max-w-4xl">
           <Toggle label="Habilitar Limite de Participantes?" name="limite_participantes" form={form} onChange={handleFormChange} />
           {form.limite_participantes && (
              <FormField label="Quantidade Máxima de Inscrições" name="quantidade_maxima" type="number" form={form} onChange={handleFormChange} />
           )}
           <div className="col-span-2">
              <FormField label="Link Exclusivo de Inscrição Externa (URL)" name="link_inscricao" type="url" form={form} onChange={handleFormChange} />
           </div>
           <Toggle label="Exigir Confirmação de Presença no Local?" name="confirmacao_presenca" form={form} onChange={handleFormChange} />
        </div>
      )
    }
  ]

  const statusOpts = [
    {label: '🔵 Agendado', value: 'Agendado'},
    {label: '🟢 Confirmado', value: 'Confirmado'},
    {label: '🔴 Cancelado', value: 'Cancelado'},
    {label: '✅ Concluído', value: 'Concluído'}
  ]

  const frequenciaOpts = [
    {label: 'Não repetir', value: 'nao_repetir'},
    {label: 'Todo dia', value: 'diario'},
    {label: 'Toda semana', value: 'semanal'},
    {label: 'Todo mês', value: 'mensal'},
    {label: 'Todo ano', value: 'anual'}
  ]

  return (
    <form onSubmit={handleSave} className="max-w-7xl mx-auto space-y-6 pb-24 relative">
      <PageHeader title={id ? "Editar Evento" : "Hospedar Novo Evento"} icon="festival" />
      
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="col-span-4 md:col-span-2">
            <FormField autoFocus label="Nome do Evento *" name="nome" required form={form} onChange={handleFormChange} />
         </div>
         <FormField 
            label="Data Oficial *" 
            name="data_evento" 
            type="date" 
            required 
            form={form} 
            onChange={handleFormChange} 
            min={!id ? new Date().toISOString().split('T')[0] : undefined}
         />
         <FormField label="Horário *" name="hora_evento" type="time" required form={form} onChange={handleFormChange} />
         
         <div className="col-span-4 md:col-span-2 mt-[-10px]">
            <SelectMenu label="Local do Evento *" name="local_id" options={locais.map(l => ({ value: l.id, label: l.descricao }))} required form={form} onChange={handleFormChange} />
         </div>
         <div className="col-span-4 md:col-span-1 mt-[-10px]">
            <SelectMenu label="Frequência" name="frequencia" options={frequenciaOpts} form={form} onChange={handleFormChange} />
         </div>
         <div className="col-span-4 md:col-span-1 mt-[-10px]">
            <SelectMenu label="Status (Farol)" name="status" options={statusOpts} form={form} onChange={handleFormChange} />
         </div>
      </div>
      
      <Tabs tabs={tabData} />

      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-outline-variant/20 flex gap-4 justify-end z-40">
        <button type="button" onClick={() => navigate('/eventos')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

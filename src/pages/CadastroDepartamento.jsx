import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

// Componentes extraídos do escoppo principal para evitar perda de foco no React (Unmount por closure)
const InputField = ({ label, type="text", name, form, setForm, autoFocus }) => (
  <div className="flex flex-col gap-1 mb-4">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    {type === 'textarea' ? (
       <textarea 
          value={form[name]} onChange={e => setForm({...form, [name]: e.target.value})}
          className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none h-24"
       />
    ) : type === 'toggle' ? (
       <label className="flex items-center cursor-pointer">
         <div className="relative">
           <input type="checkbox" className="sr-only" checked={form[name]} onChange={(e) => setForm({...form, [name]: e.target.checked})} />
           <div className={`block w-10 h-6 rounded-full transition-colors ${form[name] ? 'bg-primary' : 'bg-outline-variant/50'}`}></div>
           <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form[name] ? 'transform translate-x-4' : ''}`}></div>
         </div>
         <div className="ml-3 font-semibold text-sm">Ativo</div>
       </label>
    ) : (
       <input 
          autoFocus={autoFocus}
          type={type} 
          value={form[name]} onChange={e => setForm({...form, [name]: e.target.value})}
          className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none"
       />
    )}
  </div>
)

const SelectField = ({ label, name, options, form, setForm }) => (
  <div className="flex flex-col gap-1 mb-4">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    <select 
       value={form[name] || ''} onChange={e => setForm({...form, [name]: e.target.value})}
       className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none"
    >
       <option value="">-- Selecione --</option>
       {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)

export default function CadastroDepartamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const [membrosValidos, setMembrosValidos] = useState([])
  const [form, setForm] = useState({
    nome: '', descricao: '', status: true,
    tipo_departamento: 'Ministério', publico_alvo: 'Geral',
    lider_principal_id: '', vice_lider_id: ''
  })

  useEffect(() => {
    async function loadResources() {
      const { data } = await supabase.from('membros').select('id, nome_completo').eq('status', true)
      if (data) setMembrosValidos(data)

      if (id) {
        const { data: dept } = await supabase.from('departamentos').select('*').eq('id', id).single()
        if (dept) setForm(dept)
      }
    }
    loadResources()
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = { ...form }
    if(!payload.lider_principal_id) delete payload.lider_principal_id
    if(!payload.vice_lider_id) delete payload.vice_lider_id

    let responseError = null
    if (id) {
      const { error } = await supabase.from('departamentos').update(payload).eq('id', id)
      responseError = error
    } else {
      const { error } = await supabase.from('departamentos').insert([payload])
      responseError = error
    }
    setLoading(false)

    if (responseError) {
      alert("❌ Ocorreu um erro ao salvar o departamento:\n\n" + responseError.message)
      console.error(responseError)
      return
    }
    navigate('/departamentos')
  }

  const tabData = [
    {
      label: "Dados Básicos",
      content: (
        <div className="max-w-xl">
          <InputField autoFocus label="Nome do Departamento" name="nome" form={form} setForm={setForm} />
          <InputField label="Descrição" name="descricao" type="textarea" form={form} setForm={setForm} />
          <InputField label="Status do Departamento" name="status" type="toggle" form={form} setForm={setForm} />
        </div>
      )
    },
    {
      label: "Liderança",
      content: (
        <div className="max-w-xl">
           <SelectField 
              label="Líder Principal" name="lider_principal_id" 
              options={membrosValidos.map(m => ({ value: m.id, label: m.nome_completo }))} 
              form={form} setForm={setForm}
           />
           <SelectField 
              label="Vice Líder / Auxiliar" name="vice_lider_id" 
              options={membrosValidos.map(m => ({ value: m.id, label: m.nome_completo }))} 
              form={form} setForm={setForm}
           />
        </div>
      )
    },
    {
      label: "Organização",
      content: (
        <div className="max-w-xl">
           <SelectField label="Tipo de Departamento" name="tipo_departamento" options={[{label:'Ministério', value:'Ministério'}, {label:'Grupo', value:'Grupo'}, {label:'Célula', value:'Célula'}, {label:'Administrativo', value:'Administrativo'}]} form={form} setForm={setForm} />
           <SelectField label="Público-alvo" name="publico_alvo" options={[{label:'Geral', value:'Geral'}, {label:'Crianças', value:'Crianças'}, {label:'Jovens', value:'Jovens'}, {label:'Casais', value:'Casais'}]} form={form} setForm={setForm} />
        </div>
      )
    }
  ]

  return (
    <form onSubmit={handleSave} className="max-w-7xl mx-auto space-y-6 pb-24 relative">
      <PageHeader title={id ? "Editar Departamento" : "Novo Departamento"} icon="app_registration" />
      <Tabs tabs={tabData} />
      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-outline-variant/20 flex gap-4 justify-end z-40">
        <button type="button" onClick={() => navigate('/departamentos')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

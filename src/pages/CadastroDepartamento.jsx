import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
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
  const [activeTab, setActiveTab] = useState(0) // 0 = primeira aba aberta por padrão
  
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

  // Líder selecionado (para mostrar no card)
  const liderNome = membrosValidos.find(m => m.id === form.lider_principal_id)?.nome_completo

  const tabData = [
    {
      label: "1. Dados Básicos",
      icon: "domain",
      content: (
        <div className="max-w-xl">
          <InputField autoFocus label="Nome do Departamento" name="nome" form={form} setForm={setForm} />
          <InputField label="Descrição" name="descricao" type="textarea" form={form} setForm={setForm} />
          <InputField label="Status do Departamento" name="status" type="toggle" form={form} setForm={setForm} />
        </div>
      )
    },
    {
      label: "2. Liderança",
      icon: "military_tech",
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
      label: "3. Organização",
      icon: "account_tree",
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

      {/* CARD PRINCIPAL — sempre visível */}
      <div className="flex items-center gap-5 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm">
        {/* Avatar / ícone do departamento */}
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
          <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {form.tipo_departamento === 'Ministério' ? 'music_note'
              : form.tipo_departamento === 'Grupo' ? 'groups'
              : form.tipo_departamento === 'Célula' ? 'hub'
              : 'admin_panel_settings'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-xl text-primary leading-tight truncate">
            {form.nome || 'Nome do Departamento'}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {form.tipo_departamento && (
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {form.tipo_departamento}
              </span>
            )}
            {form.publico_alvo && form.publico_alvo !== 'Geral' && (
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/20">
                {form.publico_alvo}
              </span>
            )}
            {liderNome && (
              <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">military_tech</span>
                {liderNome}
              </span>
            )}
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
          form.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          {form.status ? 'Ativo' : 'Inativo'}
        </div>
      </div>

      {/* ABAS EM SANFONA */}
      <div className="space-y-3">
        {tabData.map((tab, index) => {
          const isOpen = activeTab === index
          return (
            <div key={index} className="rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab(isOpen ? null : index)}
                className={`w-full flex items-center justify-between px-6 py-4 font-bold text-sm transition-all ${
                  isOpen
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-primary/5 hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[20px] ${
                    isOpen ? 'text-white/80' : 'text-primary/60'
                  }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {tab.icon}
                  </span>
                  <span className="uppercase tracking-wider text-xs font-black">{tab.label}</span>
                </div>
                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                  isOpen ? 'rotate-180 text-white/70' : 'text-on-surface-variant/40'
                }`}>
                  expand_more
                </span>
              </button>

              {isOpen && (
                <div className="p-6 bg-surface-container-lowest animate-in fade-in slide-in-from-top-2 duration-300">
                  {tab.content}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-outline-variant/20 flex gap-4 justify-end z-40">
        <button type="button" onClick={() => navigate('/departamentos')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

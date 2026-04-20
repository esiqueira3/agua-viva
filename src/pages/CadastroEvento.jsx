import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { MultiSelect } from '../components/ui/MultiSelect'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { usePermissions } from '../context/PermissionsContext'

// Instanciados FORA para proteger o foco do DOM virtual
const FormField = ({ label, name, type="text", required=false, disabled=false, form, onChange, autoFocus, min, step }) => (
  <div className="flex flex-col gap-1 mb-4 flex-1">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
    <input 
        autoFocus={autoFocus} min={min} step={step}
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
  const { isAdmin, meusDepartamentos } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0) // 0 = primeira aba aberta por padrão
  
  const [locais, setLocais] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [membros, setMembros] = useState([])

  const [form, setForm] = useState({
    nome: '', data_evento: '', data_fim: '', hora_evento: '', local_id: '', status: 'Agendado',
    departamento_id: '', lider_responsavel_id: '', equipe_envolvida: [],
    limite_participantes: false, quantidade_maxima: '', link_inscricao: '', 
    link_pagamento_mp: '', confirmacao_presenca: false,
    frequencia: 'nao_repetir',
    pago: false, valor_base: '0.00', taxa_porc: '4.99', taxa_fixa: '0.40', valor_total: '0.00',
    max_parcelas: 1,
    mostrar_link_calendario: true,
    valor_camiseta: '0.00',
    pedir_saude: false,
    pedir_alergia: false,
    pedir_camiseta: false,
    tamanho_referencia_camiseta: '',
    taxa_pix: 0.99
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
           if (ev.data_fim) ev.data_fim = ev.data_fim.split('T')[0]
           if (!ev.data_fim && ev.data_evento) ev.data_fim = ev.data_evento
           if (ev.hora_evento) ev.hora_evento = ev.hora_evento.substring(0, 5)
           // Garantir que mostrar_link_calendario nunca seja null (default true)
           if (ev.mostrar_link_calendario === null || ev.mostrar_link_calendario === undefined) {
             ev.mostrar_link_calendario = true
           }
           setForm(ev)
        }
      }
    }
    loadResources()
  }, [id])

  // Gatilha o líder padrão APENAS se estiver criando novo ou se o campo estiver vazio
  useEffect(() => {
    if(form.departamento_id && !form.lider_responsavel_id) {
       const dept = departamentos.find(d => d.id === form.departamento_id)
       if(dept && dept.lider_principal_id) {
          setForm(f => ({...f, lider_responsavel_id: dept.lider_principal_id}))
       }
    }
  }, [form.departamento_id, departamentos, form.lider_responsavel_id])

  // Lógica de Cálculo de Taxas Automática
  useEffect(() => {
    if (form.pago) {
        const base = parseFloat(form.valor_base) || 0
        const porc = parseFloat(form.taxa_porc) || 0
        const resultadoComPorcentagem = (base + (base * (porc / 100))).toFixed(2)
        setForm(f => ({
          ...f, 
          taxa_fixa: resultadoComPorcentagem,
          valor_total: resultadoComPorcentagem
        }))
    } else {
        setForm(f => ({...f, taxa_fixa: '0.00', valor_total: '0.00'}))
    }
  }, [form.pago, form.valor_base, form.taxa_porc])

  const handleFormChange = (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    let finalValue = value
    if (['max_parcelas', 'valor_camiseta', 'taxa_pix'].includes(e.target.name)) finalValue = Number(value)
    if (e.target.name === 'nome' && typeof value === 'string') {
      finalValue = value.toUpperCase()
    }
    
    const newForm = { ...form, [e.target.name]: finalValue }
    
    // Automatização: Troca de Departamento puxa o Líder Padrão
    if (e.target.name === 'departamento_id' && value) {
       const dept = departamentos.find(d => d.id === value)
       if (dept && dept.lider_principal_id) {
          newForm.lider_responsavel_id = dept.lider_principal_id
       }
    }

    setForm(newForm)
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

    const todayStr = new Date().toISOString().split('T')[0]
    if (!id && payload.data_evento && payload.data_evento < todayStr) {
       alert("⚠️ Erro de Validação:\nNão é permitido planejar e cadastrar Novos Eventos com datas retroativas (anteriores a data de hoje). Para histórico use o módulo correto.")
       setLoading(false)
       return
    }

    if (payload.data_fim && payload.data_fim < payload.data_evento) {
       alert("⚠️ Erro de Validação:\nA data de término não pode ser anterior à data de início.")
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

  // =====================================================================
  // TABS — definidas ANTES do return para ficarem acima no visual
  // =====================================================================
  const tabData = [
    {
      label: "1. Organização",
      content: (
        <div className="grid grid-cols-2 gap-4 max-w-4xl">
           <SelectMenu 
             label="Departamento Responsável" 
             name="departamento_id" 
             options={(isAdmin ? departamentos : departamentos.filter(d => meusDepartamentos.includes(d.id))).map(d => ({ value: d.id, label: d.nome }))} 
             form={form} 
             onChange={handleFormChange} 
           />
           <SearchableSelect 
              label="Líder Responsável (Editável)" 
              name="lider_responsavel_id" 
              options={membrosOptions} 
              value={form.lider_responsavel_id} 
              onChange={handleFormChange} 
           />
           
        </div>
      )
    },
    {
      label: "2. Evento Pago",

      content: (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

           {/* Linha de toggles */}
           <div className="col-span-4 flex items-center justify-between">
             <Toggle label="Evento Pago?" name="pago" form={form} onChange={handleFormChange} />
             {form.pago && (
               <label className="flex items-center cursor-pointer gap-3 bg-[#009EE3]/5 px-4 py-3 rounded-xl border border-[#009EE3]/20 hover:bg-[#009EE3]/10 transition-colors">
                 <div className="relative">
                   <input type="checkbox" className="sr-only" name="mostrar_link_calendario" checked={form.mostrar_link_calendario} onChange={handleFormChange} />
                   <div className={`block w-10 h-6 rounded-full transition-colors ${form.mostrar_link_calendario ? 'bg-[#009EE3]' : 'bg-outline-variant/50'}`}></div>
                   <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form.mostrar_link_calendario ? 'translate-x-4' : ''}`}></div>
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold text-sm text-on-surface">Mostrar link no Calendário?</span>
                   <span className="text-[10px] text-on-surface-variant font-medium">
                     {form.mostrar_link_calendario ? '✅ Botão de inscrição visível no card' : '🔒 Botão oculto no calendário'}
                   </span>
                 </div>
               </label>
             )}
           </div>

           {form.pago && (
              <>
                {/* Banner Mercado Pago */}
                <div className="col-span-4 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
                  style={{ background: 'linear-gradient(135deg, #009EE3 0%, #00BCFF 100%)' }}>
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      {/* Logo MP em SVG */}
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                        <svg viewBox="0 0 48 48" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" fill="#009EE3"/>
                          <path d="M33.5 19.5c0 5.25-4.25 9.5-9.5 9.5S14.5 24.75 14.5 19.5 18.75 10 24 10s9.5 4.25 9.5 9.5z" fill="white"/>
                          <path d="M24 14c-3.03 0-5.5 2.47-5.5 5.5S20.97 25 24 25s5.5-2.47 5.5-5.5S27.03 14 24 14z" fill="#009EE3"/>
                          <path d="M17 30h14l-2 8H19l-2-8z" fill="white" opacity="0.9"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-black text-base uppercase tracking-wider">Mercado Pago</p>
                        <p className="text-white/80 text-[11px] font-medium">Checkout Transparente integrado</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">Referência Externa</p>
                      <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                        <span className="text-white text-[11px] font-black font-mono">{id || 'ID gerado ao salvar'}</span>
                      </div>
                      <p className="text-white/60 text-[9px] mt-1">Cole esse ID no campo "Referência Externa" no MP</p>
                    </div>
                  </div>
                </div>

                 {/* Removido: Usando Checkout Transparente Agora */}

                <div className="col-span-4 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                   <FormField label="Valor Líquido (Igreja) R$" name="valor_base" type="number" step="0.01" form={form} onChange={handleFormChange} />
                   <FormField label="Estimativa Taxa MP (%)" name="taxa_porc" type="number" step="0.01" form={form} onChange={handleFormChange} />
                   <FormField label="Máximo Parcelas Card" name="max_parcelas" type="number" min="1" step="1" form={form} onChange={handleFormChange} />
                   <FormField label="Valor Camiseta (R$)" name="valor_camiseta" type="number" step="0.01" form={form} onChange={handleFormChange} />
                   <FormField label="Taxa PIX (%)" name="taxa_pix" type="number" step="0.01" form={form} onChange={handleFormChange} />
                </div>
                
                <div className="col-span-4 p-6 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl transform transition-all hover:scale-[1.005]"
                  style={{ background: 'linear-gradient(135deg, #009EE3 0%, #00BCFF 100%)' }}>
                   
                   {/* Coluna Cartão */}
                   <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                         <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-70">Final no Cartão</p>
                         <h5 className="text-2xl font-black">R$ {form.valor_total}</h5>
                         <p className="text-[9px] opacity-50 font-bold uppercase">Taxa de {form.taxa_porc}% aplicada</p>
                      </div>
                   </div>

                   {/* Divisor Visual no Desktop */}
                   <div className="hidden md:block w-px h-12 bg-white/20"></div>

                   {/* Coluna PIX */}
                   <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                         <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>pix</span>
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-70 text-emerald-200">Final no PIX</p>
                         <h5 className="text-2xl font-black text-emerald-50">
                            R$ {(parseFloat(form.valor_base || 0) * (1 + parseFloat(form.taxa_pix || 0) / 100)).toFixed(2)}
                         </h5>
                         <p className="text-[9px] text-emerald-200/60 font-bold uppercase">Taxa de {form.taxa_pix}% aplicada</p>
                      </div>
                   </div>

                   <div className="text-right hidden lg:block">
                      <p className="text-[10px] font-bold uppercase opacity-60 tracking-tighter">Fórmula de Gestão</p>
                      <p className="text-[11px] font-black font-mono">Líquido + Taxa %</p>
                   </div>
                </div>
              </>
           )}
        </div>
      )
    },
    {
      label: "3. Campos Adicionais",
      content: (
        <div className="space-y-8 max-w-4xl">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/10 space-y-4">
                 <div className="flex items-center gap-3 mb-2 text-primary">
                    <span className="material-symbols-outlined">medical_services</span>
                    <h4 className="font-black text-xs uppercase tracking-widest">Saúde e Alergias</h4>
                 </div>
                 <Toggle label="Pedir Problemas de Saúde?" name="pedir_saude" form={form} onChange={handleFormChange} />
                 <Toggle label="Pedir Informações de Alergias?" name="pedir_alergia" form={form} onChange={handleFormChange} />
                 <p className="text-[10px] text-on-surface-variant italic">Habilita campos de texto na ficha de inscrição pública.</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/10 space-y-4">
                 <div className="flex items-center gap-3 mb-2 text-primary">
                    <span className="material-symbols-outlined">apparel</span>
                    <h4 className="font-black text-xs uppercase tracking-widest">Vestuário / Camiseta</h4>
                 </div>
                 <Toggle label="Oferecer Camiseta?" name="pedir_camiseta" form={form} onChange={handleFormChange} />
                 <p className="text-[10px] text-on-surface-variant italic">Exibe seleção de tamanhos e escolha de camiseta na inscrição.</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/10 space-y-4">
                 <div className="flex items-center gap-3 mb-2 text-primary">
                    <span className="material-symbols-outlined">group</span>
                    <h4 className="font-black text-xs uppercase tracking-widest">Associação</h4>
                 </div>
                 <Toggle label="Pedir Qual igreja congrega?" name="pedir_membro_agua_viva" form={form} onChange={handleFormChange} />
                 <p className="text-[10px] text-on-surface-variant italic">Habilita a pergunta sobre a igreja onde o participante congrega.</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/10 space-y-4">
                 <div className="flex items-center gap-3 mb-2 text-primary">
                    <span className="material-symbols-outlined">favorite</span>
                    <h4 className="font-black text-xs uppercase tracking-widest">Cônjuge</h4>
                 </div>
                 <Toggle label="Pedir Nome/Zap do Cônjuge?" name="pedir_conjuge" form={form} onChange={handleFormChange} />
                 <p className="text-[10px] text-on-surface-variant italic">Habilita campos para informações do parceiro(a).</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/10 space-y-4">
                 <div className="flex items-center gap-3 mb-2 text-primary">
                    <span className="material-symbols-outlined">family_history</span>
                    <h4 className="font-black text-xs uppercase tracking-widest">Pais (Filiação)</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Toggle label="Pedir Nome/Zap do Pai?" name="pedir_pai" form={form} onChange={handleFormChange} />
                    <Toggle label="Pedir Nome/Zap da Mãe?" name="pedir_mae" form={form} onChange={handleFormChange} />
                 </div>
                 <p className="text-[10px] text-on-surface-variant italic">Habilita campos para informações dos pais.</p>
              </div>
           </div>
        </div>
      )
    }
  ]


  return (
    <form onSubmit={handleSave} className="max-w-7xl mx-auto space-y-6 pb-24 relative">
      <PageHeader title={id ? "Editar Evento" : "Hospedar Novo Evento"} icon="festival" />

      {/* CARD PRINCIPAL — sempre visível */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="col-span-4 md:col-span-1">
            <FormField autoFocus label="Nome do Evento *" name="nome" required form={form} onChange={handleFormChange} />
         </div>
         <FormField 
            label="Inicia em *" 
            name="data_evento" 
            type="date" 
            required 
            form={form} 
            onChange={handleFormChange} 
            min={!id ? new Date().toISOString().split('T')[0] : undefined}
         />
         <FormField 
            label="Termina em *" 
            name="data_fim" 
            type="date" 
            required 
            form={form} 
            onChange={handleFormChange} 
            min={form.data_evento}
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

      {/* ABAS COLAPSÁVEIS — nenhuma aberta por padrão */}
      <div className="space-y-3">
        {tabData.map((tab, index) => {
          const isOpen = activeTab === index
          return (
            <div key={index} className="rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm">
              {/* Cabeçalho da aba — clicável */}
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
                  }`}>
                    {index === 0 ? 'groups' : index === 1 ? 'payments' : 'add_task'}
                  </span>
                  <span className="uppercase tracking-wider text-xs font-black">{tab.label}</span>
                </div>
                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                  isOpen ? 'rotate-180 text-white/70' : 'text-on-surface-variant/40'
                }`}>
                  expand_more
                </span>
              </button>

              {/* Conteúdo — só aparece se aba ativa */}
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
        <button type="button" onClick={() => navigate('/eventos')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

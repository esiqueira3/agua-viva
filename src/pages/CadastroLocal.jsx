import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

export default function CadastroLocal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ codigo: '', descricao: '', status: true })

  useEffect(() => {
    async function loadLocal() {
      if (id) {
        const { data } = await supabase.from('locais').select('*').eq('id', id).single()
        if (data) setForm(data)
      } else {
        // Busca a recém criada última ordenando pela data pra sabermos a sequencia
        const { data: lastLocal } = await supabase
           .from('locais')
           .select('codigo')
           .order('created_at', { ascending: false })
           .limit(1)

        let nextNum = 1
        if (lastLocal && lastLocal.length > 0 && lastLocal[0].codigo) {
           const parsedStr = lastLocal[0].codigo.replace(/\D/g, '') // Extrai a parte numérica
           if (parsedStr) nextNum = parseInt(parsedStr, 10) + 1
        }
        
        const finalCode = String(nextNum).padStart(5, '0')
        setForm(f => ({ ...f, codigo: finalCode }))
      }
    }
    loadLocal()
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    let responseError = null
    if (id) {
      const { error } = await supabase.from('locais').update(form).eq('id', id)
      responseError = error
    } else {
      const { error } = await supabase.from('locais').insert([form])
      responseError = error
    }
    setLoading(false)
    if (responseError) {
      alert("❌ Ocorreu um erro no servidor:\n\n" + responseError.message)
      console.error(responseError)
      return
    }
    navigate('/locais')
  }

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-6 pb-24">
      <PageHeader title={id ? "Editar Local" : "Novo Local de Evento"} icon="room" />

      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-[#E6C364]">Código de Identificação (Automático)</label>
          <input readOnly type="text" value={form.codigo} className="p-3 bg-surface-variant/40 border border-outline-variant/30 rounded-lg outline-none font-mono font-bold text-primary/60 cursor-not-allowed" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Descrição / Nome Oficial</label>
          <input autoFocus type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none" required />
        </div>
        <div className="flex flex-col gap-1 mt-4">
           <label className="flex items-center cursor-pointer">
             <div className="relative">
               <input type="checkbox" className="sr-only" checked={form.status} onChange={(e) => setForm({...form, status: e.target.checked})} />
               <div className={`block w-10 h-6 rounded-full transition-colors ${form.status ? 'bg-primary' : 'bg-outline-variant/50'}`}></div>
               <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form.status ? 'translate-x-4' : ''}`}></div>
             </div>
             <div className="ml-3 font-semibold text-sm">Espaço Disponível/Ativo</div>
           </label>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button type="button" onClick={() => navigate('/locais')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar Local'}
        </button>
      </div>
    </form>
  )
}

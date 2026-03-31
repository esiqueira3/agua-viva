import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

export default function CadastroIgreja() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [matrizesAtivas, setMatrizesAtivas] = useState([])

  const [form, setForm] = useState({ 
    codigo: '', 
    descricao: '', 
    is_filial: false,
    matriz_id: '',
    status: true 
  })

  useEffect(() => {
    async function loadResources() {
      // Buscar apenas igrejas marcadas como Sede (Matriz) para ser possível vinculação
      const { data: mData } = await supabase.from('igrejas').select('id, descricao').eq('is_filial', false).eq('status', true)
      if (mData) setMatrizesAtivas(mData)

      if (id) {
        const { data } = await supabase.from('igrejas').select('*').eq('id', id).single()
        if (data) setForm(data)
      } else {
        // Busca a recém criada última igreja ordenando pela data pra sabermos a sequencia
        const { data: lastIgreja } = await supabase
           .from('igrejas')
           .select('codigo')
           .order('created_at', { ascending: false })
           .limit(1)

        let nextNum = 1
        if (lastIgreja && lastIgreja.length > 0 && lastIgreja[0].codigo) {
           // Pega o número que você salvou por ex "00001" e força a matemática adicionar +1
           const parsedStr = lastIgreja[0].codigo.replace(/\D/g, '') // remove letras
           if (parsedStr) nextNum = parseInt(parsedStr, 10) + 1
        }
        
        // Formata para 0000X
        const finalCode = String(nextNum).padStart(5, '0')
        setForm(f => ({ ...f, codigo: finalCode }))
      }
    }
    loadResources()
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form }
    if(!payload.is_filial || !payload.matriz_id) { payload.matriz_id = null }

    let responseError = null
    if (id) {
      const { error } = await supabase.from('igrejas').update(payload).eq('id', id)
      responseError = error
    } else {
      const { error } = await supabase.from('igrejas').insert([payload])
      responseError = error
    }
    setLoading(false)

    if (responseError) {
      alert("❌ Ocorreu um erro no servidor:\n\n" + responseError.message)
      console.error(responseError)
      return
    }

    navigate('/igrejas')
  }

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-6 pb-24">
      <PageHeader title={id ? "Editar Igreja" : "Nova Congregação Cadastro"} icon="church" />

      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm space-y-4">
        
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 w-1/3">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-[#E6C364]">Código (Automático)</label>
            <input readOnly type="text" value={form.codigo} className="p-3 bg-surface-variant/40 border border-outline-variant/30 rounded-lg outline-none font-mono font-bold text-primary/60 cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1 w-2/3">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nome Oficial / Descrição</label>
            <input autoFocus type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none" required />
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-6 border-t border-outline-variant/20 pt-6">
           <label className="flex items-center cursor-pointer mb-2">
             <input type="checkbox" checked={form.is_filial} onChange={(e) => setForm({...form, is_filial: e.target.checked, matriz_id: ''})} className="w-5 h-5 rounded text-primary focus:ring-primary outline-none mr-2"/>
             <div className="font-bold text-sm text-primary">Esta unidade é uma Filial?</div>
           </label>
           
           {form.is_filial && (
             <div className="flex flex-col gap-1 mt-2 p-4 bg-tertiary-fixed-dim/10 rounded-xl border border-tertiary-fixed/30">
                <label className="text-xs font-bold text-on-tertiary-container uppercase tracking-widest">Selecione a Matriz Sede</label>
                <select required value={form.matriz_id || ''} onChange={e => setForm({...form, matriz_id: e.target.value})} className="p-3 bg-white border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm">
                  <option value="">-- Selecionar --</option>
                  {matrizesAtivas.map(m => (
                    <option key={m.id} value={m.id}>{m.descricao}</option>
                  ))}
                </select>
             </div>
           )}
        </div>

        <div className="flex flex-col gap-1 mt-6 border-t border-outline-variant/20 pt-6">
           <label className="flex items-center cursor-pointer">
             <div className="relative">
               <input type="checkbox" className="sr-only" checked={form.status} onChange={(e) => setForm({...form, status: e.target.checked})} />
               <div className={`block w-10 h-6 rounded-full transition-colors ${form.status ? 'bg-primary' : 'bg-outline-variant/50'}`}></div>
               <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form.status ? 'translate-x-4' : ''}`}></div>
             </div>
             <div className="ml-3 font-semibold text-sm">Igreja Ativa</div>
           </label>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button type="button" onClick={() => navigate('/igrejas')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar Igreja'}
        </button>
      </div>
    </form>
  )
}

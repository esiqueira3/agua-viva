import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

export default function CadastroUsuario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', perfil: 'Liderança', status: true, 
    departamentos_vinculados: []
  })
  const [allDepartamentos, setAllDepartamentos] = useState([])

  useEffect(() => {
    async function loadData() {
      // Busca departamentos para o vínculo
      const { data: depts } = await supabase.from('departamentos').select('id, nome').eq('status', true).order('nome')
      if (depts) setAllDepartamentos(depts)

      if (id) {
        const { data: user } = await supabase.from('usuarios_sistema').select('*').eq('id', id).single()
        if (user) {
          setForm({
            ...user,
            departamentos_vinculados: user.departamentos_vinculados || []
          })
        }
      }
    }
    loadData()
  }, [id])

  const toggleDepto = (deptoId) => {
    const current = [...form.departamentos_vinculados]
    const index = current.indexOf(deptoId)
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(deptoId)
    }
    setForm({ ...form, departamentos_vinculados: current })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if(!emailRegex.test(form.email)) {
       alert("E-mail inválido. O acesso requer um e-mail com formato válido.")
       setLoading(false)
       return
    }

    let responseError = null
    const payload = { ...form }

    // Cria/Atualiza a Whitelist
    if (id) {
      const { error } = await supabase.from('usuarios_sistema').update(payload).eq('id', id)
      responseError = error
    } else {
      const { error } = await supabase.from('usuarios_sistema').insert([payload])
      responseError = error
    }
    
    setLoading(false)

    if (responseError) {
      if(responseError.code === '23505') {
         alert("❌ Conta já existente! Este e-mail já possui passe-livre cadastrado na plataforma.")
      } else {
         alert("❌ Ocorreu um erro ao salvar o usuário:\n\n" + responseError.message)
      }
      return
    }
    navigate('/usuarios')
  }

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6 pb-24 relative">
      <PageHeader 
         title={id ? "Editar Perfil do Colaborador" : "Liberar Novo Acesso (Convite)"} 
         icon="key" 
         description="Nesta tela você insere e-mails na Whitelist. Quando o líder tentar efetuar o Login, o sistema irá reconhecer e destrancar a porta para ele."
      />
      
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm space-y-4">
         <h3 className="text-sm font-bold text-primary mb-6 border-b border-outline-variant/10 pb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">badge</span> Identificação & Autenticador
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1 mb-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nome Completo</label>
              <input required autoFocus type="text" placeholder="Ex: João Ferreira" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>

            <div className="flex flex-col gap-1 mb-2 relative border-l-2 border-primary/20 pl-4">
              <label className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                 <span className="material-symbols-outlined text-[14px]">lock</span> Digite um email
              </label>
              <input required type="email" placeholder="lider@ibav.com.br" value={form.email} onChange={e => setForm({...form, email: e.target.value.toLowerCase().trim()})} className="p-3 bg-white dark:bg-slate-800 border-2 border-primary/40 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm shadow-md" />
              <p className="text-[10px] text-tertiary-fixed-dim font-bold mt-1 uppercase tracking-tighter">* A senha mágica de 8 dígitos (OTP) será disparada para este e-mail.</p>
            </div>

            <div className="flex flex-col gap-1 mb-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Celular / WhatsApp</label>
              <input type="tel" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm" />
            </div>

            <div className="flex flex-col gap-1 mb-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nível de Permissão na Igreja</label>
              <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-on-surface">
                 <option value="Administrador">👑 Administração Geral (Acesso Total)</option>
                 <option value="Secretaria">📝 Secretaria & Fichas Membros</option>
                 <option value="Liderança">🛡️ Líder de Departamento</option>
                 <option value="Financeiro">💰 Tesouraria e Dízimos</option>
              </select>
            </div>
         </div>

         {/* VÍNCULO DE DEPARTAMENTOS - Apenas para Líderes */}
         {form.perfil === 'Liderança' && (
           <div className="mt-6 p-6 bg-surface-container-low/40 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-500">
             <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">account_tree</span> 
                  Departamentos Gerenciados (Acesso a Eventos/Financeiro)
                </label>
                <span className="text-[10px] font-bold text-on-surface-variant bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-outline-variant/20 shadow-sm">
                  {form.departamentos_vinculados.length} selecionado(s)
                </span>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {allDepartamentos.length > 0 ? allDepartamentos.map(depto => {
                  const isSelected = form.departamentos_vinculados.includes(depto.id)
                  return (
                    <button
                      key={depto.id}
                      type="button"
                      onClick={() => toggleDepto(depto.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-2 ${
                        isSelected 
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                          : 'bg-white dark:bg-slate-800 border-outline-variant/20 text-on-surface-variant hover:border-primary/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSelected ? 'check_circle' : 'circle'}
                      </span>
                      {depto.nome}
                    </button>
                  )
                }) : (
                  <p className="text-xs text-on-surface-variant italic">Nenhum departamento ativo encontrado.</p>
                )}
             </div>
             <p className="text-[10px] text-on-surface-variant/60 font-bold mt-4 italic">
               💡 O líder verá apenas os dados e eventos dos departamentos selecionados acima.
             </p>
           </div>
         )}

         <div className="pt-4 mt-4 border-t border-outline-variant/10">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 block">Status de Acesso</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.status} onChange={e => setForm({...form, status: e.target.checked})} />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
              <span className="ml-4 text-sm font-black text-on-surface">
                {form.status ? '✅ Ativo (Acesso Liberado)' : '🛑 Inativo (Acesso Bloqueado)'}
              </span>
            </label>
         </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-outline-variant/20 flex gap-4 justify-end z-40 shadow-2xl">
        <button type="button" onClick={() => navigate('/usuarios')} className="px-8 py-3 rounded-xl font-bold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest transition-all transform active:scale-95">Sair sem Salvar</button>
        <button type="submit" disabled={loading} className="px-10 py-3 rounded-xl font-black text-white bg-green-600 shadow-xl shadow-green-500/20 hover:bg-green-700 hover:shadow-green-600/40 transition-all active:scale-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? 'Processando...' : <><span className="material-symbols-outlined text-[20px]">verified_user</span> Salvar Configurações</>}
        </button>
      </div>
    </form>
  )
}

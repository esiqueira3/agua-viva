import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

export default function CadastroUsuario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', perfil: 'Liderança', status: true
  })

  useEffect(() => {
    async function loadUser() {
      if (id) {
        const { data: user } = await supabase.from('usuarios_sistema').select('*').eq('id', id).single()
        if (user) setForm(user)
      }
    }
    loadUser()
  }, [id])

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

            <div className="flex flex-col gap-1 mb-2 relative">
              <label className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                 <span className="material-symbols-outlined text-[14px]">lock</span> Chave Eletrônica (E-mail)
              </label>
              <input required type="email" placeholder="lider@ibav.com.br" value={form.email} onChange={e => setForm({...form, email: e.target.value.toLowerCase().trim()})} className="p-3 bg-surface-container-low border border-primary/40 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm shadow-inner" />
              <p className="text-[10px] text-tertiary-fixed-dim font-bold mt-1">* A senha mágica de 6 dígitos (OTP) será disparada para cá.</p>
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

            <div className="flex flex-col gap-2 mb-2 justify-center">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status de Acesso</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={form.status} onChange={e => setForm({...form, status: e.target.checked})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                <span className="ml-3 text-sm font-bold text-on-surface">
                  {form.status ? '✅ Ativo (Pode Acessar)' : '🛑 Inativo (Acesso Bloqueado)'}
                </span>
              </label>
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-outline-variant/20 flex gap-4 justify-end z-40">
        <button type="button" onClick={() => navigate('/usuarios')} className="px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
          {loading ? 'Validando...' : <><span className="material-symbols-outlined text-[18px]">security</span> Salvar Autorização</>}
        </button>
      </div>
    </form>
  )
}

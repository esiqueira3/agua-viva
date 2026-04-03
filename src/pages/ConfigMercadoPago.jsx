import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ConfigMercadoPago() {
  const [token, setToken] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    async function loadConfig() {
      setLoading(true)
      const { data } = await supabase
        .from('config_global')
        .select('*')
        .in('chave', ['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY'])
      
      if (data) {
        const t = data.find(c => c.chave === 'MP_ACCESS_TOKEN')
        const p = data.find(c => c.chave === 'MP_PUBLIC_KEY')
        if (t) setToken(t.valor)
        if (p) setPublicKey(p.valor)
      }
      setLoading(false)
    }
    loadConfig()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })

    const { error: err1 } = await supabase
      .from('config_global')
      .upsert({ 
         chave: 'MP_ACCESS_TOKEN', 
         valor: token,
         descricao: 'Token de Acesso do Mercado Pago for Webhooks e Pagamentos'
      }, { onConflict: 'chave' })

    const { error: err2 } = await supabase
      .from('config_global')
      .upsert({ 
         chave: 'MP_PUBLIC_KEY', 
         valor: publicKey,
         descricao: 'Chave Pública do Mercado Pago para Checkout Transparente'
      }, { onConflict: 'chave' })

    if (err1 || err2) {
      setMessage({ text: 'Erro ao salvar configurações.', type: 'error' })
    } else {
      setMessage({ text: 'Configurações de API salvas com sucesso! ✨', type: 'success' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://suaproj.supabase.co'
  const webhookUrl = `${supabaseUrl}/functions/v1/mercado-pago-webhook`

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-2">
        <h2 className="text-4xl font-headline font-black text-primary tracking-tight flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl">payments</span> Conexão Mercado Pago
        </h2>
        <p className="text-on-surface-variant text-lg">Gerencie a integração financeira entre o Água Viva e sua conta MP.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Formulario Principal */}
        <div className="md:col-span-12 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-outline-variant/10 shadow-sm">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">key</span> Public Key
                  </label>
                </div>
                <input 
                  type="text" 
                  placeholder="APP_USR-..."
                  value={publicKey}
                  onChange={e => setPublicKey(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">lock</span> Access Token
                  </label>
                  <a 
                    href="https://www.mercadopago.com.br/developers/panel/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline uppercase"
                  >
                    Minhas Credenciais
                  </a>
                </div>
                <input 
                  type="password" 
                  placeholder="APP_USR-..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-inner"
                />
              </div>
            </div>

            <p className="text-[10px] text-on-surface-variant italic px-2">
              🔒 Suas credenciais são armazenadas de forma segura e usadas apenas para conciliação automática e checkout transparente.
            </p>

            {message.text && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
                message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">save</span>
              {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES API'}
            </button>
          </form>
        </div>

        {/* Guia do Webhook */}
        <div className="md:col-span-12 bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <h3 className="text-xl font-black text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">webhook</span> Configuração de Webhook
            </h3>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
              Copie a URL abaixo e cole no campo <strong>URL de Notificação</strong> no painel de desenvolvedores do Mercado Pago. Isso permitirá que o sistema confirme os pagamentos em tempo real!
            </p>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-outline-variant/10 flex items-center justify-between group">
              <code className="text-[11px] font-bold text-primary break-all">{webhookUrl}</code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl)
                  alert("Link do Webhook copiado! ✨")
                }}
                className="p-2 hover:bg-primary/10 rounded-xl transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">content_copy</span>
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-64 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg border border-outline-variant/10">
             <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-tighter">Eventos Recomendados</h4>
             <ul className="space-y-3">
               {[
                 { id: 1, name: 'Pagamentos', color: 'bg-emerald-500' },
                 { id: 2, name: 'Inscrições', color: 'bg-emerald-500' }
               ].map(item => (
                 <li key={item.id} className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                   <span className="text-xs font-bold text-on-surface">{item.name}</span>
                 </li>
               ))}
             </ul>
             <div className="mt-6 pt-4 border-t border-outline-variant/10">
                <p className="text-[9px] font-medium text-on-surface-variant leading-tight">Certifique-se de escolher "Produção" no painel do MP.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

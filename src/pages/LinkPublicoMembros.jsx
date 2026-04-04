import { PageHeader } from '../components/ui/PageHeader'

export default function LinkPublicoMembros() {
  const publicLink = `${window.location.origin}/inscrever`

  const handleCopy = () => {
     navigator.clipboard.writeText(publicLink)
     alert('✅ Link copiado com sucesso! Agora você pode compartilhar nas redes sociais ou WhatsApp da igreja.')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader title="Link de Auto-Cadastro" icon="link" />

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-outline-variant/10 shadow-2xl overflow-hidden p-10 md:p-16 text-center space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
           <span className="material-symbols-outlined text-5xl">share</span>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
           <h2 className="text-3xl font-black text-on-surface tracking-tight leading-tight">Expanda sua comunidade com praticidade</h2>
           <p className="text-on-surface-variant font-medium leading-relaxed italic">
             Compartilhe o link abaixo com novos membros, visitantes e congregados. Eles mesmos preenchem a ficha e você só precisa aprovar com um clique!
           </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border-2 border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 rounded-[2.5rem] p-8 max-w-xl mx-auto group">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Link Público Oficial</p>
           <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2 pl-6 rounded-2xl border border-outline-variant/20 shadow-sm">
              <span className="text-xs font-mono font-bold text-slate-500 truncate flex-1">{publicLink}</span>
              <button onClick={handleCopy} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                 <span className="material-symbols-outlined text-[20px]">content_copy</span>
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
           {[
             { icon: 'bolt', title: 'Agilidade', desc: 'Fim da redigitação de fichas de papel.', color: 'text-amber-500', bg: 'bg-amber-100/50' },
             { icon: 'verified_user', title: 'Segurança', desc: 'Você valida e aprova cada cadastro.', color: 'text-blue-500', bg: 'bg-blue-100/50' },
             { icon: 'analytics', title: 'Integração', desc: 'Dados inseridos diretamente no sistema.', color: 'text-indigo-500', bg: 'bg-indigo-100/50' }
           ].map((card, i) => (
             <div key={i} className="p-8 rounded-[2rem] bg-white dark:bg-slate-800 border-2 border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 group">
                <div className={`w-16 h-16 ${card.bg} rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                   <span className={`material-symbols-outlined ${card.color} text-3xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
                </div>
                <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-3">{card.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-medium opacity-70">{card.desc}</p>
             </div>
           ))}
        </div>

        <div className="pt-10">
           <a href="/inscrever" target="_blank" className="text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center justify-center gap-2">
              Visualizar como o membro verá <span className="material-symbols-outlined text-[18px]">open_in_new</span>
           </a>
        </div>

      </div>
    </div>
  )
}

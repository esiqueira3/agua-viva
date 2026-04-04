import { PageHeader } from '../components/ui/PageHeader'
import { useNavigate } from 'react-router-dom'

export default function CertificadosHome() {
  const navigate = useNavigate()

  const options = [
    {
      id: 'apresentacao',
      title: 'Apresentação de Criança',
      desc: 'Emita o certificado para bebês e crianças que foram apresentados ao Senhor.',
      icon: 'child_care',
      color: 'bg-blue-500',
      path: '/membros/certificados/apresentacao'
    },
    {
      id: 'batismo',
      title: 'Certificado de Batismo',
      desc: 'Emita o certificado oficial de batismo nas águas para novos convertidos.',
      icon: 'waves',
      color: 'bg-indigo-600',
      path: '/membros/certificados/batismo'
    }
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <PageHeader title="Emissão de Certificados" icon="workspace_premium" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {options.map((opt) => (
          <div 
            key={opt.id}
            onClick={() => navigate(opt.path)}
            className="group cursor-pointer bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-200/60 dark:border-slate-800 p-10 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center"
          >
            <div className={`w-24 h-24 ${opt.color} rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-primary/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
               <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                 {opt.icon}
               </span>
            </div>
            
            <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight mb-4">{opt.title}</h3>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-70 mb-8 max-w-xs">{opt.desc}</p>
            
            <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest border-2 border-primary/10 px-6 py-3 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
               Começar Emissão
               <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-10 border border-outline-variant/10 flex items-center gap-8">
         <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary text-3xl">info</span>
         </div>
         <div className="flex-1">
            <h4 className="font-black text-on-surface uppercase tracking-tight mb-1">Dica de Impressão</h4>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed opacity-70">
              Para melhores resultados, utilize papel de gramatura superior (como 180g ou 240g) e impressora a laser. 
              O layout de impressão já está configurado para ajustar-se automaticamente ao tamanho A4.
            </p>
         </div>
      </div>
    </div>
  )
}

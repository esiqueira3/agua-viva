import { PageHeader } from '../components/ui/PageHeader'

export default function Novidades() {
  const melhorias = [
    {
      title: "Motor Financeiro 2.0",
      icon: "payments",
      color: "text-emerald-500",
      desc: "Implementamos um novo motor de cálculo dinâmico que recalcula automaticamente as taxas do Mercado Pago (PIX e Cartão). Isso garante que o valor que chega para a igreja seja exatamente o esperado, sem sustos com taxas variáveis."
    },
    {
      title: "Blindagem de Segurança",
      icon: "security",
      color: "text-blue-500",
      desc: "Os preços e cálculos agora são validados diretamente no servidor (Supabase Edge Functions). Mesmo que alguém tente alterar o valor no navegador, o sistema bloqueia e processa apenas o valor oficial configurado por você."
    },
    {
      title: "Gestão de Acessos Premium",
      icon: "grid_view",
      color: "text-violet-500",
      desc: "A tela de 'Controle de Acessos' agora conta com visualização em cards modernos, busca instantânea e paginação. Ficou muito mais rápido gerenciar quem tem acesso ao coração do sistema."
    },
    {
      title: "Auditoria de Aceite",
      icon: "task_alt",
      color: "text-orange-500",
      desc: "Agora é possível visualizar a data e hora exata em que cada colaborador aceitou os termos de uso do sistema, garantindo maior transparência e segurança jurídica para a igreja."
    },
    {
      title: "Experiência Mobile 1.0",
      icon: "ad_units",
      color: "text-pink-500",
      desc: "Refatoramos as principais telas financeiras e de listagem para que funcionem perfeitamente no seu iPhone ou Android. Chega de textos cortados ou números espremidos."
    },
    {
      title: "Performance e Relatórios",
      icon: "trending_up",
      color: "text-cyan-500",
      desc: "Melhoramos o tempo de resposta do dashboard em 40% e atualizamos o motor de exportação de dados para Excel e PDF."
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <PageHeader 
        title="Notas de Lançamento" 
        description="Confira todas as evoluções da Versão 1.0 Oficial da plataforma Água Viva."
        icon="auto_awesome"
      />

      <div className="bg-gradient-to-br from-primary to-primary-container p-8 md:p-12 rounded-[3rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Versão 1.0 OFICIAL</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none">BEM-VINDO AO<br/>FUTURO DA GESTÃO.</h1>
          <p className="text-lg md:text-xl font-medium opacity-90 max-w-2xl">O Água Viva acaba de sair da fase BETA. Saiba o que mudou na nossa maior atualização até aqui.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {melhorias.map((m, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm hover:shadow-xl transition-all group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-surface-container-low ${m.color}`}>
              <span className="material-symbols-outlined text-3xl">{m.icon}</span>
            </div>
            <h3 className="text-xl font-black text-on-surface mb-3 uppercase tracking-tight">{m.title}</h3>
            <p className="text-sm font-bold text-on-surface-variant/70 leading-relaxed italic">
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="p-12 bg-surface-container-lowest rounded-[3rem] border border-dashed border-outline-variant/30 text-center">
        <span className="material-symbols-outlined text-5xl text-primary/20 mb-4">rocket_launch</span>
        <h4 className="text-lg font-black text-on-surface mb-2 uppercase">E isso é apenas o começo...</h4>
        <p className="text-xs font-bold text-on-surface-variant/40 max-w-md mx-auto italic">Estamos trabalhando em novos recursos de inteligência artificial e automação pastoral para o próximo trimestre.</p>
        
        <button 
          onClick={() => window.close()} 
          className="mt-8 px-10 py-4 bg-on-surface text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl"
        >
          Fechar e Voltar ao Sistema
        </button>
      </div>
    </div>
  )
}

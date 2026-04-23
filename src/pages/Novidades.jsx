import { PageHeader } from '../components/ui/PageHeader'

export default function Novidades() {
  const melhorias = [
    {
      title: "Login Espião (Ghost Login)",
      icon: "visibility",
      color: "text-amber-500",
      desc: "Agora administradores podem simular o acesso de qualquer líder ou colaborador para validar permissões e visualizar o painel exatamente como eles, sem precisar de senhas."
    },
    {
      title: "Expansão Familiar Detalhada",
      icon: "family_restroom",
      color: "text-blue-600",
      desc: "O cadastro de membros agora conta com campos específicos para Pai, Mãe, Outros Responsáveis e uma lista dinâmica para múltiplos filhos com padronização automática."
    },
    {
      title: "Filtros de Perfil Avançados",
      icon: "hub",
      color: "text-violet-500",
      desc: "Implementamos filtros inteligentes na gestão de usuários, permitindo segmentar rapidamente a lista por Administradores, Líderes, Secretaria ou Financeiro."
    },
    {
      title: "Terminologia Financeira Unificada",
      icon: "payments",
      color: "text-emerald-500",
      desc: "Padronizamos toda a interface financeira para utilizar o termo 'ENTRADAS' em vez de inscritos/confirmados, refletindo melhor a realidade de dízimos e ofertas."
    },
    {
      title: "Cores Dinâmicas por Categoria",
      icon: "palette",
      color: "text-orange-500",
      desc: "O painel financeiro agora diferencia visualmente lançamentos de Cantina (Laranja), Oferta/Dízimo (Roxo) e Inscrições (Verde) para uma leitura rápida."
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <PageHeader 
        title="Notas de Lançamento" 
        description="Confira todas as evoluções da Versão 1.0.3 Oficial da plataforma Água Viva."
        icon="auto_awesome"
      />

      <div className="bg-gradient-to-br from-primary to-primary-container p-8 md:p-12 rounded-[3rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Versão 1.0.3 OFICIAL</span>
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
          className="mt-8 px-10 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-black/10"
        >
          Fechar e Voltar ao Sistema
        </button>

        <div className="mt-12 pt-8 border-t border-outline-variant/10">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/30 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Avadora System — 2026
          </p>
        </div>
      </div>
    </div>
  )
}

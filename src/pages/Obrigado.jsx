export default function Obrigado() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Logo */}
        <img src="/logo.png" alt="Água Viva" className="h-14 mx-auto brightness-0 invert opacity-80" />

        {/* Ícone animado */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
          <div className="relative w-32 h-32 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-6xl text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
          </div>
        </div>

        {/* Mensagem principal */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Obrigado!
          </h1>
          <p className="text-slate-300 font-medium text-lg leading-relaxed">
            Sua inscrição foi confirmada com sucesso.<br />
            Que alegria ter você conosco! 🙌
          </p>
        </div>

        {/* Card de instrução */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 text-left space-y-4">
          <p className="text-xs font-black text-white/50 uppercase tracking-widest">Próximos passos</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary font-black text-xs">1</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Fique de olho no seu e-mail para receber os detalhes do evento.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary font-black text-xs">2</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Anote a data e o local do evento para não esquecer.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary font-black text-xs">3</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Em caso de dúvidas, entre em contato com a equipe da Água Viva.</p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-slate-500 text-xs font-medium">
          Comunidade Evangélica Água Viva · Com amor e gratidão 🕊️
        </p>
      </div>
    </div>
  )
}

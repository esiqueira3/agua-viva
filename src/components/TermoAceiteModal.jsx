import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePermissions } from '../context/PermissionsContext'

export default function TermoAcceptModal() {
  const { user, refetchPermissions } = usePermissions()
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('usuarios_sistema')
        .update({ 
          aceite_termo: true, 
          data_aceite: new Date().toISOString() 
        })
        .eq('email', user.email)

      if (error) throw error
      
      // Atualiza o contexto para remover o modal
      await refetchPermissions()
    } catch (err) {
      console.error("Erro ao aceitar termo:", err)
      alert("Houve um erro ao registrar seu aceite. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    if (window.confirm("Se você não concordar com os termos, sua sessão será encerrada. Deseja sair?")) {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="p-8 pb-4 shrink-0 text-center border-b border-outline-variant/10">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-on-surface uppercase tracking-tight leading-tight">
            Termo de Aceite, Responsabilidade <br/> e Confidencialidade
          </h2>
          <p className="text-xs font-bold text-on-surface-variant/60 mt-2 uppercase tracking-widest">Plataforma Comunidade Evangélica Água Viva</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:px-12 space-y-8 custom-scrollbar">
          <p className="text-sm font-bold text-on-surface leading-relaxed">
            Ao realizar o primeiro acesso à Plataforma da <span className="text-primary font-black">Comunidade Evangélica Água Viva</span>, o usuário declara que leu, compreendeu e concorda integralmente com os termos e condições descritos neste documento.
          </p>

          <section>
            <h3 className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]">info</span> 1. Finalidade da Plataforma
            </h3>
            <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
              A plataforma tem como objetivo auxiliar na organização administrativa, comunicação interna e gestão das atividades da Comunidade Evangélica Água Viva, incluindo departamentos, líderes, membros e processos internos da igreja.
            </p>
          </section>

          <section>
            <h3 className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]">lock</span> 2. Confidencialidade das Informações
            </h3>
            <p className="text-sm font-medium text-on-surface-variant leading-relaxed mb-4">
              O usuário reconhece que poderá ter acesso a informações internas da igreja, que podem incluir, mas não se limitando a:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Dados cadastrais de membros e participantes",
                "Informações administrativas e organizacionais",
                "Informações financeiras da igreja",
                "Meios de pagamento utilizados",
                "Informações estratégicas dos departamentos"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-black text-on-surface/80 bg-primary/5 p-4 rounded-2xl border border-primary/10 italic">
              Todas essas informações são consideradas confidenciais e de propriedade exclusiva da Comunidade Evangélica Água Viva, sendo proibido compartilhar, divulgar, reproduzir ou utilizar qualquer informação fora do contexto das atividades da igreja sem autorização formal da liderança responsável.
            </p>
          </section>

          <section>
            <h3 className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]">policy</span> 3. Proteção de Dados e LGPD
            </h3>
            <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
              O usuário compromete-se a respeitar a privacidade e a integridade dos dados pessoais e sensíveis dos membros. O acesso e uso dessas informações devem ocorrer <span className="font-black text-on-surface underline decoration-primary/30">exclusivamente para fins administrativos, ministeriais e organizacionais da igreja.</span>
            </p>
            <p className="mt-3 text-sm font-medium text-on-surface-variant leading-relaxed">
              O uso indevido poderá resultar em responsabilização conforme previsto na <span className="font-black">Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</span>.
            </p>
          </section>

          <section>
            <h3 className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]">supervisor_account</span> 4. Responsabilidade dos Líderes
            </h3>
            <p className="text-sm font-medium text-on-surface-variant leading-relaxed mb-3">
              É expressamente proibido:
            </p>
            <div className="space-y-2">
              {[
                "Compartilhar dados de membros com terceiros",
                "Divulgar informações internas sem autorização",
                "Expor dados financeiros ou meios de pagamento",
                "Utilizar informações para fins pessoais ou externos"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-bold text-red-500/80">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-amber-50 dark:bg-amber-500/5 p-6 rounded-3xl border border-amber-200 dark:border-amber-500/20">
            <h3 className="text-base font-black text-amber-700 dark:text-amber-500 uppercase tracking-tight flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]">credit_card</span> 5. Uso de Maquininhas de Pagamento
            </h3>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
              Todas as transações devem ocorrer exclusivamente por meio das maquininhas pertencentes à igreja. É <span className="text-red-500 underline">expressamente proibido</span> o uso de maquininhas pessoais ou de terceiros.
            </p>
            <p className="mt-4 text-[11px] font-black text-amber-800 dark:text-amber-400/70 border-t border-amber-200 dark:border-amber-500/10 pt-4 uppercase tracking-wider">
              A violação desta conduta será considerada grave, sujeita a afastamento da função e responsabilização administrativa, civil e criminal no rigor da lei.
            </p>
          </section>

          <section>
            <h3 className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]">shield</span> 6. Conduta e Respeito
            </h3>
            <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
              O descumprimento destas regras poderá resultar em suspensão de acesso, bloqueio da conta ou remoção da função de liderança, conforme decisão da liderança da igreja.
            </p>
          </section>

          <div className="pt-8 border-t border-outline-variant/10 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Comunidade Evangélica Água Viva • 2026</p>
            <p className="text-[9px] font-bold mt-1">Este termo passa a ter validade a partir do primeiro acesso.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-surface-container-low shrink-0 border-t border-outline-variant/10 flex flex-col md:flex-row items-center gap-4">
          <button
            onClick={handleDecline}
            disabled={loading}
            className="w-full md:w-auto px-8 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-red-500 transition-colors"
          >
            Não aceito os termos
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full flex-1 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                Li e concordo com o Termo de Aceite
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

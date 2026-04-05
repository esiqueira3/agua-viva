import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { supabase } from '../lib/supabase'

export default function GestaoAcessos() {
  const [selectedPerfil, setSelectedPerfil] = useState('Liderança')
  const [perfis, setPerfis] = useState(['Administrador', 'Liderança', 'Secretaria', 'Financeiro'])
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPermissions()
  }, [selectedPerfil])

  async function fetchPermissions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('permissoes_sistema')
      .select('config')
      .eq('perfil', selectedPerfil)
      .maybeSingle()

    if (data) {
      setConfig(data.config)
    } else {
      setConfig({})
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('permissoes_sistema')
      .upsert({ perfil: selectedPerfil, config: config })
    
    setSaving(false)
    if (error) {
      alert("❌ Erro ao salvar permissões:\n\n" + error.message)
    } else {
      alert("✅ Permissões de " + selectedPerfil + " atualizadas com sucesso!")
      // Opcional: Recarregar a página para o motor de permissões do usuário logado (se ele for desse perfil) atualizar
      // window.location.reload()
    }
  }

  const togglePerm = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const groups = [
    {
      title: 'Acesso Geral & Início',
      icon: 'dashboard',
      perms: [
        { key: 'menu_home', label: 'Painel Inicial (Dashboard)' },
        { key: 'menu_calendario', label: 'Calendário de Eventos' },
        { key: 'menu_calendario_publico', label: 'Agenda Pública (Link Externo)' },
        { key: 'menu_calendario_edita_proprio', label: 'Editar Apenas Eventos Próprios no Calendário' },
      ]
    },
    {
      title: 'Módulo de Membros',
      icon: 'group',
      perms: [
        { key: 'menu_membros', label: 'Listagem Geral de Membros' },
        { key: 'menu_membros_pre_cadastro', label: 'Acesso ao Pré-Cadastro' },
        { key: 'menu_membros_link', label: 'Gerar Link Público' },
        { key: 'menu_membros_certificados', label: 'Emissão de Certificados' },
      ]
    },
    {
      title: 'Módulo de Eventos & Logística',
      icon: 'event_available',
      perms: [
        { key: 'menu_eventos', label: 'Gestão de Eventos' },
        { key: 'menu_eventos_filtro_lider', label: 'Filtrar: Ver Apenas Meus Eventos (Líder/Vice)' },
        { key: 'menu_departamentos', label: 'Gestão de Departamentos' },
        { key: 'menu_igrejas', label: 'Gestão de Igrejas' },
        { key: 'menu_locais', label: 'Gestão de Locais' },
      ]
    },
    {
      title: 'Módulo Financeiro',
      icon: 'payments',
      perms: [
        { key: 'menu_financeiro', label: 'Financeiro de Eventos' },
        { key: 'menu_financeiro_filtro_lider', label: 'Filtrar: Ver Apenas Financeiro dos Meus Eventos' },
        { key: 'menu_financeiro_mp', label: 'Configurações API Mercado Pago' },
      ]
    },
    {
      title: 'Administração do Sistema',
      icon: 'settings_suggest',
      perms: [
        { key: 'menu_usuarios', label: 'Controle de Acessos (Usuários)' },
        { key: 'menu_configuracoes', label: 'Configurações Gerais' },
        { key: 'menu_configuracoes_adm', label: 'Personalização Visual (Logo/Slogan)' },
      ]
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      <PageHeader 
        title="Gestão de Acessos (RBAC)" 
        description="Configure o que cada perfil de usuário pode visualizar e realizar no sistema."
        icon="security"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LADO ESQUERDO: LISTA DE PERFIS */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">Perfis do Sistema</h3>
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-[2rem] p-3 shadow-sm space-y-2">
            {perfis.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPerfil(p)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                  selectedPerfil === p 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-[20px]">{p === 'Administrador' ? 'shield_person' : 'person_check'}</span>
                   {p}
                </div>
                {selectedPerfil === p && <span className="material-symbols-outlined text-[18px]">verified</span>}
              </button>
            ))}
          </div>

          <div className="p-6 bg-tertiary-container/20 rounded-3xl border border-tertiary-fixed-dim/10">
             <p className="text-[10px] font-black uppercase text-tertiary-fixed-dim mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span> Dica de Segurança
             </p>
             <p className="text-xs text-on-surface-variant leading-relaxed font-medium">As alterações de acesso refletem no próximo login ou após o usuário recarregar a plataforma.</p>
          </div>
        </div>

        {/* LADO DIREITO: GRID DE PERMISSÕES */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex flex-col">
                <h2 className="text-xl font-black text-on-surface tracking-tight uppercase">Permissões para: <span className="text-primary italic">{selectedPerfil}</span></h2>
                <div className="w-12 h-1 bg-primary rounded-full mt-1"></div>
             </div>
             <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 px-4 py-2 rounded-full border border-green-200 dark:border-green-800/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Motor RBAC Ativo</span>
             </div>
          </div>

          {loading ? (
             <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 p-20 flex flex-col items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-6xl text-outline-variant animate-spin">sync</span>
                <p className="text-xs font-black uppercase tracking-widest text-outline mt-4">Carregando Políticas...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {groups.map((group, idx) => (
                 <div key={idx} className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 p-6 shadow-sm hover:shadow-md transition-all group border-b-4 border-b-transparent hover:border-b-primary/30">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-primary">{group.icon}</span>
                       </div>
                       <h3 className="font-black text-on-surface tracking-tight uppercase text-sm">{group.title}</h3>
                    </div>

                    <div className="space-y-3">
                       {group.perms.map(perm => (
                         <div key={perm.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors select-none cursor-pointer" onClick={() => togglePerm(perm.key)}>
                            <span className={`text-xs font-bold transition-colors ${config[perm.key] ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>{perm.label}</span>
                            <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${config[perm.key] ? 'bg-green-500 shadow-inner' : 'bg-outline-variant/30'}`}>
                               <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${config[perm.key] ? 'translate-x-4' : ''}`}></div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
          )}

          <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-outline-variant/20 flex gap-4 justify-center z-40">
             <button 
               onClick={handleSave} 
               disabled={saving || loading}
               className="w-full max-w-md py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-container hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
             >
               {saving ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">save</span>}
               {saving ? 'Publicando Regras...' : 'Salvar Configurações de Perfil'}
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}

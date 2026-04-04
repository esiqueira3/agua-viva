import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'
import { Link } from 'react-router-dom'

export default function MembrosPreCadastro() {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [processingBulk, setProcessingBulk] = useState(false)

  const loadPreCadastro = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('membros')
      .select('*')
      .eq('status', false)
      .order('created_at', { ascending: false })

    if (data) setMembros(data)
    setLoading(false)
    setSelectedIds([])
  }

  useEffect(() => {
    loadPreCadastro()
  }, [])

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === membros.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(membros.map(m => m.id))
    }
  }

  const handleAprovar = async (membro, isBulk = false) => {
    const { id, nome_completo, cpf } = membro
    
    if (!isBulk && !window.confirm(`Deseja aprovar o cadastro de ${nome_completo}?`)) return
    
    try {
      // 1. Checar se já existe membro ATIVO com este CPF
      const { data: existing } = await supabase
        .from('membros')
        .select('id, nome_completo, matricula')
        .eq('cpf', cpf)
        .eq('status', true)
        .maybeSingle()

      if (existing) {
        const confirmMsg = `⚠️ CONFLITO DE CPF: Já existe um membro ativo com o CPF ${cpf} (${existing.nome_completo}).\n\nDeseja SOBRESCREVER os dados do cadastro antigo com as novas informações desta solicitação?\n\n(OK = Sobrescrever / Cancelar = Manter atual e descartar esta solicitação)`
        
        if (window.confirm(confirmMsg)) {
          // SOBRESCREVER: Atualiza o registro ativo com os dados do pendente (exceto o ID e Matricula originais para manter histórico)
          const updateData = { ...membro }
          delete updateData.id
          delete updateData.created_at
          delete updateData.matricula // Mantemos a matrícula que já estava no ativo para não mudar o ID do membro
          updateData.status = true

          const { error: upError } = await supabase
            .from('membros')
            .update(updateData)
            .eq('id', existing.id)

          if (upError) throw upError

          // Deleta a solicitação pendente que foi "absorvida"
          await supabase.from('membros').delete().eq('id', id)
        } else {
          // DESCARTAR: Apenas deleta a solicitação pendente mantendo o que já está na base
          await supabase.from('membros').delete().eq('id', id)
        }
      } else {
        // Fluxo normal: apenas ativa
        const { error } = await supabase
          .from('membros')
          .update({ status: true })
          .eq('id', id)
        if (error) throw error
      }

      if (!isBulk) {
        alert('✅ Processado com sucesso!')
        loadPreCadastro()
      }
    } catch (err) {
      console.error(err)
      if (!isBulk) alert('❌ Erro ao processar: ' + err.message)
    }
  }

  const handleAprovarLote = async () => {
    if (!window.confirm(`Deseja aprovar os ${selectedIds.length} registros selecionados? Solicitações com CPF duplicado serão analisadas uma a uma.`)) return
    
    setProcessingBulk(true)
    for (const id of selectedIds) {
      const membro = membros.find(m => m.id === id)
      if (membro) {
        await handleAprovar(membro, true)
      }
    }
    setProcessingBulk(false)
    alert('✅ Processamento em lote finalizado!')
    loadPreCadastro()
  }

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja DESCARTAR o pré-cadastro de ${nome}?`)) return
    const { error } = await supabase.from('membros').delete().eq('id', id)
    if (!error) {
       alert('🗑️ Registro removido.')
       loadPreCadastro()
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <PageHeader title="Solicitações de Pré-Cadastro" icon="how_to_reg" />

      {/* BARRA DE AÇÕES EM MASSA */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
           <div className="bg-slate-900 border border-white/10 px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 backdrop-blur-xl">
              <span className="text-white font-black text-sm uppercase tracking-widest">
                 {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
              </span>
              <div className="h-6 w-[1px] bg-white/20"></div>
              <button 
                onClick={handleAprovarLote}
                disabled={processingBulk}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-green-600/30"
              >
                {processingBulk ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                )}
                Aprovar em Lote
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-on-surface uppercase tracking-tight">Membros Pendentes</h3>
            <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mt-1">Aprove ou descarte novas solicitações vindas do link público</p>
          </div>
          {membros.length > 0 && (
            <button onClick={toggleSelectAll} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-outline-variant/20 rounded-xl hover:bg-primary/5 text-primary transition-all">
              {selectedIds.length === membros.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                <th className="px-6 py-4 w-10">
                   <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      checked={membros.length > 0 && selectedIds.length === membros.length}
                      onChange={toggleSelectAll}
                   />
                </th>
                <th className="px-4 py-4">Participante</th>
                <th className="px-8 py-4">CPF / Contato</th>
                <th className="px-8 py-4">Data Solicitação</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                 <tr><td colSpan="5" className="text-center py-20 font-bold text-slate-400">Carregando solicitações...</td></tr>
              ) : membros.length === 0 ? (
                 <tr>
                   <td colSpan="5" className="text-center py-20">
                      <span className="material-symbols-outlined text-5xl text-slate-200">person_search</span>
                      <p className="text-slate-400 font-bold italic mt-2">Nenhuma solicitação pendente no momento.</p>
                   </td>
                 </tr>
              ) : membros.map(m => (
                <tr key={m.id} className={`hover:bg-primary/5 transition-colors group ${selectedIds.includes(m.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-6 py-5">
                    <input 
                       type="checkbox" 
                       className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                       checked={selectedIds.includes(m.id)}
                       onChange={() => toggleSelect(m.id)}
                    />
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-primary uppercase shadow-inner">
                          {m.nome_completo.substring(0,2)}
                       </div>
                       <div>
                          <p className="font-black text-on-surface leading-tight text-sm uppercase">{m.nome_completo}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-0.5">{m.tipo_membro}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-on-surface-variant font-mono">{m.cpf}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{m.telefone_principal}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-on-surface-variant">{new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Há {Math.floor((new Date() - new Date(m.created_at))/(1000*60*60*24))} dias</p>
                  </td>
                   <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 transition-all">
                       <Link to={`/membros/editar/${m.id}`} className="p-2 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors bg-primary/5 shadow-sm" title="Ver Ficha / Editar">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                       </Link>
                       <button onClick={() => handleAprovar(m)} className="p-2 text-green-600 hover:bg-green-600/20 rounded-lg transition-colors bg-green-500/10 shadow-sm" title="Aprovar Cadastro">
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                       </button>
                       <button onClick={() => handleExcluir(m.id, m.nome_completo)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors bg-red-500/10 shadow-sm" title="Descartar">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

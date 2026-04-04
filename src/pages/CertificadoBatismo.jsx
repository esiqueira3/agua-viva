import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'

export default function CertificadoBatismo() {
  const [data, setData] = useState({
    nome: '',
    data_batismo: new Date().toISOString().split('T')[0],
    ministrante: 'Pr. [NOME DO MINISTRANTE]',
    igreja: 'COMUNIDADE EVANGÉLICA ÁGUA VIVA',
    local: 'SEDE CENTRAL'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setData(prev => ({ ...prev, [name]: value }))
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <PageHeader title="Certificado de Batismo" icon="waves" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        
        {/* FORMULÁRIO */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-outline-variant/10 shadow-sm p-10 space-y-8 print:hidden order-2 lg:order-1">
          <div className="flex items-center gap-4 mb-2">
             <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">edit_square</span>
             </div>
             <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Dados do Batizado</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome Completo</label>
                <input 
                   name="nome"
                   value={data.nome}
                   onChange={handleChange}
                   placeholder="Digite o nome de quem foi batizado..."
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface placeholder:text-slate-300 focus:border-indigo-500/30 focus:bg-white transition-all outline-none"
                />
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Data do Batismo</label>
                   <input 
                      type="date"
                      name="data_batismo"
                      value={data.data_batismo}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-indigo-500/30 focus:bg-white transition-all outline-none"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Local do Batismo</label>
                   <input 
                      name="local"
                      value={data.local}
                      onChange={handleChange}
                      placeholder="Ex: Piscina da Sede"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-indigo-500/30 focus:bg-white transition-all outline-none"
                   />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Pastor / Ministro</label>
                <input 
                   name="ministrante"
                   value={data.ministrante}
                   onChange={handleChange}
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-indigo-500/30 focus:bg-white transition-all outline-none"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Igreja</label>
                <input 
                   name="igreja"
                   value={data.igreja}
                   onChange={handleChange}
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-indigo-500/30 focus:bg-white transition-all outline-none"
                />
             </div>
          </div>

          <button 
             onClick={handlePrint}
             className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
             <span className="material-symbols-outlined text-[24px]">print</span>
             Imprimir Certificado
          </button>
        </div>

        {/* PRÉ-VISUALIZAÇÃO */}
        <div className="sticky top-10 flex flex-col items-center gap-4 order-1 lg:order-2">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest print:hidden">Visualização do Documento (Horizontal)</p>
           
           {/* O CERTIFICADO EM SI */}
           <div id="certificate" className="w-[297mm] h-[210mm] bg-white border-[12px] border-double border-indigo-900/20 p-6 flex flex-col items-center justify-between shadow-2xl scale-[0.35] sm:scale-[0.45] lg:scale-[0.35] xl:scale-[0.45] origin-top print:shadow-none print:m-0 print:absolute print:inset-0">
              
              {/* Moldura Interna de Batismo */}
              <div className="absolute inset-4 border-2 border-indigo-50 pointer-events-none"></div>

              {/* Topo */}
              <div className="text-center space-y-1 pt-2">
                 <div className="w-20 h-20 flex items-center justify-center mx-auto mb-2">
                    <img src="/logo_certificado.png" alt="Logo Água Viva" className="w-full h-full object-contain" />
                 </div>
                 <h4 className="text-sm font-bold tracking-[0.3em] uppercase opacity-50">{data.igreja}</h4>
                 <h1 className="text-4xl font-black tracking-tight text-indigo-950 mt-1 mb-1 italic" style={{ fontFamily: "'Georgia', serif" }}>Batismo</h1>
                 <h2 className="text-xs font-bold uppercase tracking-[0.5em] text-indigo-500">Certificado de Fé</h2>
              </div>

              {/* Corpo de Batismo */}
              <div className="flex-1 w-full flex flex-col items-center justify-center text-center space-y-6 px-10 py-10">
                 <p className="text-xl font-serif text-slate-600">
                    Certificamos que em obediência ao mandamento do Senhor Jesus
                 </p>
                 <h3 className="text-4xl font-black text-indigo-900 uppercase border-b-2 border-indigo-200 pb-1 min-w-[400px]">
                    {data.nome || '[NOME DO BATIZADO]'}
                 </h3>
                 <p className="text-base font-serif text-slate-600 leading-relaxed max-w-xl space-y-2">
                    Desceu às águas batismais no dia {data.data_batismo ? new Date(data.data_batismo).toLocaleDateString('pt-BR') : '[DATA]'}, <br/>
                    em <strong>{data.local || '______________________'}</strong>,<br/>
                    testificando publicamente sua fé em Cristo e ingresso na família de Deus.
                 </p>
              </div>

              {/* Assinaturas (Espaço para assinar embaixo) */}
              <div className="w-full grid grid-cols-2 gap-20 pb-20 px-20">
                 <div className="text-center space-y-1">
                    <div className="border-t-2 border-indigo-950/20 pt-1">
                       <p className="text-sm font-black uppercase text-indigo-950">{data.ministrante}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pastor Ministrante</p>
                    </div>
                 </div>
                 <div className="text-center space-y-1">
                    <div className="border-t-2 border-indigo-950/20 pt-1">
                       <p className="text-sm font-black uppercase text-indigo-950">Secretaria</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsável Local</p>
                    </div>
                 </div>
              </div>


           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #certificate, #certificate * { visibility: visible; }
          #certificate { 
            position: fixed; 
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) !important;
            width: 282mm;
            height: 195mm;
            margin: 0 !important;
            padding: 1.5cm !important;
            border: 8pt double #1e1b4b !important;
            box-sizing: border-box;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
        }
      `}} />
    </div>
  )
}

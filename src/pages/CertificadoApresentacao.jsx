import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'

export default function CertificadoApresentacao() {
  const [data, setData] = useState({
    nome: '',
    data_nascimento: '',
    pai: '',
    mae: '',
    pastores: 'Pr. [NOME DO PASTOR]',
    data_apresentacao: new Date().toISOString().split('T')[0],
    igreja: 'COMUNIDADE EVANGÉLICA ÁGUA VIVA'
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
      <PageHeader title="Certificado de Apresentação" icon="child_care" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        
        {/* FORMULÁRIO */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-outline-variant/10 shadow-sm p-10 space-y-8 print:hidden order-2 lg:order-1">
          <div className="flex items-center gap-4 mb-2">
             <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
             </div>
             <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Dados da Criança</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome Completo</label>
                <input 
                   name="nome"
                   value={data.nome}
                   onChange={handleChange}
                   placeholder="Digite o nome da criança..."
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface placeholder:text-slate-300 focus:border-primary/30 focus:bg-white transition-all outline-none"
                />
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Data de Nascimento</label>
                   <input 
                      type="date"
                      name="data_nascimento"
                      value={data.data_nascimento}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-primary/30 focus:bg-white transition-all outline-none"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Data da Apresentação</label>
                   <input 
                      type="date"
                      name="data_apresentacao"
                      value={data.data_apresentacao}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-primary/30 focus:bg-white transition-all outline-none"
                   />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome do Pai</label>
                <input 
                   name="pai"
                   value={data.pai}
                   onChange={handleChange}
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface placeholder:text-slate-300 focus:border-primary/30 focus:bg-white transition-all outline-none"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome da Mãe</label>
                <input 
                   name="mae"
                   value={data.mae}
                   onChange={handleChange}
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface placeholder:text-slate-300 focus:border-primary/30 focus:bg-white transition-all outline-none"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Pastores Ministrantes</label>
                <input 
                   name="pastores"
                   value={data.pastores}
                   onChange={handleChange}
                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-on-surface focus:border-primary/30 focus:bg-white transition-all outline-none"
                />
             </div>
          </div>

          <button 
             onClick={handlePrint}
             className="w-full bg-primary text-white py-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
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
              
              {/* Moldura Interna */}
              <div className="absolute inset-4 border-2 border-slate-100 pointer-events-none"></div>

              {/* Topo */}
              <div className="text-center space-y-1 pt-2">
                 <div className="w-20 h-20 flex items-center justify-center mx-auto mb-2">
                    <img src="/logo_certificado.png" alt="Logo Água Viva" className="w-full h-full object-contain" />
                 </div>
                 <h4 className="text-sm font-bold tracking-[0.3em] uppercase opacity-50">{data.igreja}</h4>
                 <h1 className="text-4xl font-black tracking-tight text-slate-900 mt-1 mb-1" style={{ fontFamily: "'Times New Roman', serif" }}>Certificado</h1>
                 <h2 className="text-base font-bold uppercase tracking-[0.4em] text-slate-500 text-[12px]">Apresentação de Criança</h2>
              </div>

              {/* Corpo */}
              <div className="flex-1 w-full flex flex-col items-center justify-center text-center space-y-6 px-10 py-10">
                 <p className="text-lg font-serif text-slate-600 italic">
                    Declaramos que a criança
                 </p>
                 <h3 className="text-4xl font-black text-slate-900 uppercase border-b-2 border-slate-200 pb-1 min-w-[300px]">
                    {data.nome || '[NOME DA CRIANÇA]'}
                 </h3>
                 <p className="text-base font-serif text-slate-600 leading-relaxed space-y-2">
                    Nascida em {data.data_nascimento ? new Date(data.data_nascimento).toLocaleDateString('pt-BR') : '[DATA]'}, filha de <br/>
                    <strong className="text-slate-800">{data.pai || '______________________'}</strong> e <br/>
                    <strong className="text-slate-800">{data.mae || '______________________'}</strong>,<br/>
                    foi apresentada ao Senhor no dia {data.data_apresentacao ? new Date(data.data_apresentacao).toLocaleDateString('pt-BR') : '[DATA]'}<br/>
                    en conformidade com a orientação bíblica.
                 </p>
              </div>

              {/* Assinaturas (Espaço para assinar embaixo) */}
              <div className="w-full grid grid-cols-2 gap-20 pb-20 px-20">
                 <div className="text-center space-y-1">
                    <div className="border-t border-slate-400 pt-1">
                       <p className="text-sm font-black uppercase text-slate-800">{data.pastores}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pastor Ministrante</p>
                    </div>
                 </div>
                 <div className="text-center space-y-1">
                    <div className="border-t border-slate-400 pt-1">
                       <p className="text-sm font-black uppercase text-slate-800">Secretaria</p>
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

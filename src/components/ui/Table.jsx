import { useState } from 'react'

export function Table({ columns, data, onEdit, onDelete, idKey = "id", itemsPerPage = 8 }) {
  const [currentPage, setCurrentPage] = useState(1)

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-12 text-center text-on-surface-variant font-medium">
        Nenhum registro encontrado.
      </div>
    )
  }

  // Lógica de Paginação Local
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const isPaginated = data.length > itemsPerPage
  
  const currentData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1))

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-surface-container-low/50 text-[10px] uppercase text-on-surface-variant font-black tracking-[0.15em] border-b border-outline-variant/20">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="px-6 py-4">{col.label}</th>
              ))}
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {currentData.map((row, rowIndex) => (
              <tr key={row[idKey] || rowIndex} className="hover:bg-surface-variant/30 transition-colors group">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 font-medium text-sm text-on-surface whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap opacity-20 group-hover:opacity-100 transition-opacity">
                   {onEdit && (
                     <button onClick={() => onEdit(row)} className="text-secondary hover:text-primary hover:bg-primary/5 rounded-full p-2 transition-colors inline-flex items-center justify-center active:scale-95" title="Editar Ficha">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                     </button>
                   )}
                   {onDelete && (
                     <button onClick={() => onDelete(row)} className="text-error/70 hover:text-error hover:bg-error/5 rounded-full p-2 transition-colors inline-flex items-center justify-center active:scale-95" title="Excluir Definitivo">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Paginador Elegante */}
      {isPaginated && (
        <div className="bg-surface-container-lowest border-t border-outline-variant/20 px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Registro <span className="text-primary font-black">{(currentPage - 1) * itemsPerPage + 1}</span> ao <span className="text-primary font-black">{Math.min(currentPage * itemsPerPage, data.length)}</span> de <span className="text-primary font-black">{data.length}</span>
          </p>
          
          <div className="flex items-center gap-2">
            <button 
               onClick={handlePrev} 
               disabled={currentPage === 1}
               className="px-4 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-surface-container transition-colors flex items-center gap-1 shadow-sm border border-outline-variant/20 border-b-2 active:border-b active:translate-y-[1px]"
            >
              <span className="material-symbols-outlined text-[16px]">keyboard_arrow_left</span> Anterior
            </button>
            
            <div className="flex items-center justify-center min-w-[3rem] px-2 bg-surface-variant/30 rounded-lg py-1.5 border border-outline-variant/10">
               <span className="text-xs font-black text-primary">{currentPage} <span className="text-on-surface-variant/50 font-medium">/</span> {totalPages}</span>
            </div>

            <button 
               onClick={handleNext} 
               disabled={currentPage === totalPages}
               className="px-4 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-surface-container transition-colors flex items-center gap-1 shadow-sm border border-outline-variant/20 border-b-2 active:border-b active:translate-y-[1px]"
            >
              Próxima <span className="material-symbols-outlined text-[16px]">keyboard_arrow_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

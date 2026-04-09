export function Pagination({ totalItems, itemsPerPage, currentPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  if (totalPages <= 1) return null

  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems)

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
        Exibindo <span className="text-primary">{startIndex}</span> a <span className="text-primary">{endIndex}</span> de <span className="text-primary">{totalItems}</span> resultados
      </p>

      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary hover:border-primary/30 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((page, idx) => (
            page === '...' ? (
              <span key={`dots-${idx}`} className="w-8 text-center text-slate-300">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all ${
                  currentPage === page 
                    ? 'bg-primary text-white shadow-lg scale-110' 
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary hover:border-primary/30 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  )
}

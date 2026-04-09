import { useState } from 'react'

export function ControlBar({ 
  searchPlaceholder = "Buscar...", 
  onSearch, 
  viewMode, 
  onViewModeChange,
  showFilters = true,
  onFiltersClick,
  children 
}) {
  const [searchValue, setSearchValue] = useState('')

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchValue(value)
    if (onSearch) onSearch(value)
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm mb-6">
      {/* Search Input */}
      <div className="relative w-full md:flex-1 group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">
          search
        </span>
        <input 
          type="text"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder={searchPlaceholder}
          className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary active:scale-[0.99] transition-all"
        />
      </div>

      {/* Actions Area */}
      <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
        {showFilters && (
          <button 
            onClick={onFiltersClick}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary/30 transition-all font-black text-[10px] uppercase tracking-widest shrink-0"
          >
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filtros
          </button>
        )}

        {children}

        {/* View Mode Toggle Group */}
        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-300/30 dark:border-white/5 shrink-0">
          <button 
            onClick={() => onViewModeChange('list')}
            title="Visualização em Lista"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
              viewMode === 'list' 
                ? 'bg-white dark:bg-slate-700 text-primary shadow-md scale-105' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">view_list</span>
          </button>
          <button 
            onClick={() => onViewModeChange('cards')}
            title="Visualização em Cards"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
              viewMode === 'cards' 
                ? 'bg-white dark:bg-slate-700 text-primary shadow-md scale-105' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">grid_view</span>
          </button>
        </div>
      </div>
    </div>
  )
}

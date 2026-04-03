import { useState, useEffect, useRef } from 'react'

export function SearchableSelect({ label, name, options = [], value, onChange, placeholder = "-- Selecione --", required = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  // Encontrar o label do valor selecionado atualmente
  const selectedOption = options.find(opt => String(opt.value) === String(value))
  const displayValue = selectedOption ? selectedOption.label : ''

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar opções de busca
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (option) => {
    onChange({ target: { name: name, value: option.value } }) // Mock do evento padrão de formulário
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="flex flex-col gap-1 mb-4 flex-1 relative" ref={containerRef}>
      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus-within:ring-2 focus-within:ring-primary outline-none cursor-pointer flex justify-between items-center ${isOpen ? 'ring-2 ring-primary border-primary/50' : ''}`}
      >
        <span className={`text-sm ${!displayValue ? 'text-outline/40 italic' : 'font-bold text-primary'}`}>
          {displayValue || placeholder}
        </span>
        <span className="material-symbols-outlined text-outline/50 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
           expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-slate-800 border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-outline-variant/10 bg-surface-container-lowest flex items-center gap-2">
             <span className="material-symbols-outlined text-outline/40">search</span>
             <input 
               autoFocus
               type="text" 
               placeholder="Pesquisar por nome..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="flex-1 bg-transparent border-none outline-none text-sm p-1 font-medium"
             />
          </div>
          
          <ul className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <li 
                  key={i} 
                  onClick={() => handleSelect(opt)}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between group ${String(opt.value) === String(value) ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-primary/5 text-on-surface'}`}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && (
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                  )}
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-xs text-outline/40 font-bold uppercase tracking-tight italic">
                 Nenhum resultado encontrado.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

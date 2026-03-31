import { useState, useRef, useEffect } from 'react'

export function MultiSelect({ label, options, selectedValues, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // Ocultar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleOption = (val) => {
    const newValues = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val]
    onChange(newValues)
  }

  // Obter labels das opções checadas
  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.value))
    .map(opt => opt.label)

  return (
    <div className="flex flex-col gap-1 mb-4 flex-1" ref={menuRef}>
      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>
      
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 min-h-[50px] bg-surface-container-low border border-outline-variant/30 rounded-lg cursor-pointer flex flex-wrap gap-2 items-center"
        >
          {selectedLabels.length === 0 && <span className="text-on-surface-variant/60">-- Selecionar múltiplos --</span>}
          {selectedLabels.map((lbl, idx) => (
            <span key={idx} className="bg-primary-fixed text-primary px-2 py-1 text-xs font-bold rounded flex items-center gap-1">
              {lbl}
            </span>
          ))}
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 flex flex-col gap-1">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 p-2 hover:bg-surface-container-low rounded cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedValues.includes(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                  className="w-4 h-4 text-primary rounded outline-none"
                />
                <span className="text-sm font-semibold">{opt.label}</span>
              </label>
            ))}
            {options.length === 0 && (
               <div className="p-2 text-xs text-center text-on-surface-variant">Vazio</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

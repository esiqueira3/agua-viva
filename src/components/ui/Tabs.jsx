import { useState } from 'react'

export function Tabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="w-full">
      <div className="flex overflow-x-auto border-b border-outline-variant/30 hide-scrollbar gap-6 mb-6">
        {tabs.map((tab, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveTab(index)}
            className={`whitespace-nowrap py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === index 
              ? 'text-primary border-primary' 
              : 'text-on-surface-variant/60 border-transparent hover:text-primary hover:border-primary/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-4 bg-surface-container-low/20 rounded-xl">
        {tabs[activeTab].content}
      </div>
    </div>
  )
}

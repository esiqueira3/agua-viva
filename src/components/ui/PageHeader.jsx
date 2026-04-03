import { Link } from 'react-router-dom'

export function PageHeader({ title, description, buttonLabel, buttonAction, buttonLink, icon }) {
  return (
    <section className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10">
      <div className="max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-primary flex items-center gap-3">
          {icon && <span className="material-symbols-outlined text-tertiary-fixed-dim text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
          {title}
        </h2>
        {description && <p className="text-on-surface-variant mt-2 font-body text-base md:text-lg opacity-80">{description}</p>}
      </div>
      
      {buttonLabel && (
        <div className="shrink-0 w-full md:w-auto">
          {buttonLink ? (
            <Link to={buttonLink} className="flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all active:scale-95 text-sm uppercase tracking-widest w-full md:w-auto">
              <span className="material-symbols-outlined">add_circle</span> {buttonLabel}
            </Link>
          ) : (
            <button onClick={buttonAction} className="flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all active:scale-95 text-sm uppercase tracking-widest w-full md:w-auto">
              <span className="material-symbols-outlined">add_circle</span> {buttonLabel}
            </button>
          )
        }
        </div>
      )}
    </section>
  )
}

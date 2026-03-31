import { Link } from 'react-router-dom'

export function PageHeader({ title, description, buttonLabel, buttonAction, buttonLink, icon }) {
  return (
    <section className="flex justify-between items-end mb-8">
      <div>
        <h2 className="text-3xl font-headline font-extrabold tracking-tight text-primary flex items-center gap-2">
          {icon && <span className="material-symbols-outlined text-tertiary-fixed-dim text-3xl">{icon}</span>}
          {title}
        </h2>
        {description && <p className="text-on-surface-variant mt-2 font-body">{description}</p>}
      </div>
      
      {buttonLabel && (
        buttonLink ? (
          <Link to={buttonLink} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95">
            <span className="material-symbols-outlined">add</span> {buttonLabel}
          </Link>
        ) : (
          <button onClick={buttonAction} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 hover:shadow-green-600/30 transition-all active:scale-95">
            <span className="material-symbols-outlined">add</span> {buttonLabel}
          </button>
        )
      )}
    </section>
  )
}

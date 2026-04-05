import { Navigate } from 'react-router-dom'
import { usePermissions } from '../../context/PermissionsContext'

export function ProtectedRoute({ children, permission }) {
  const { canAccess, loading } = usePermissions()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl">sync</span>
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant/40">Validando Chaves de Acesso...</p>
        </div>
      </div>
    )
  }

  if (permission && !canAccess(permission)) {
    console.warn(`ACESSO NEGADO: Tentativa de entrada em recurso restrito (${permission})`)
    return <Navigate to="/home" replace />
  }

  return children
}

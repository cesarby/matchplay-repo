import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-5xl">404</h1>
      <p className="text-muted-foreground">Página no encontrada</p>
      <Link to="/" className="text-blue underline">
        Volver al inicio
      </Link>
    </div>
  )
}

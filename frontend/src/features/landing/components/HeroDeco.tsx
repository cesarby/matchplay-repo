/**
 * Decoración abstracta del fondo del hero.
 * Puramente visual — aria-hidden="true".
 * Tiles y dots posicionados con absolute positioning.
 */
export function HeroDeco() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Círculo grande rojo — esquina superior derecha */}
      <div className="absolute -right-20 -top-20 size-80 rounded-full bg-red opacity-[0.08] lg:h-[420px] lg:w-[420px]" />

      {/* Círculo azul — esquina inferior izquierda */}
      <div className="absolute -bottom-16 -left-16 size-60 rounded-full bg-blue opacity-[0.07] lg:size-72" />

      {/* Tile verde — mitad superior derecha */}
      <div className="absolute right-1/3 top-16 size-20 rotate-12 rounded-2xl bg-green opacity-[0.06] lg:size-28" />

      {/* Tile amarillo — zona media izquierda */}
      <div className="absolute left-1/4 top-1/2 size-12 -rotate-6 rounded-xl bg-yellow opacity-[0.10]" />

      {/* Dots decorativos — grupo de 4 */}
      <div className="absolute right-1/4 top-1/3 grid grid-cols-2 gap-2 opacity-15">
        <div className="size-2 rounded-full bg-foreground" />
        <div className="size-2 rounded-full bg-foreground" />
        <div className="size-2 rounded-full bg-foreground" />
        <div className="size-2 rounded-full bg-foreground" />
      </div>
    </div>
  )
}

import { useEffect } from 'react'

/**
 * Hook que activa el efecto "reveal on scroll" en todos los elementos con
 * clase `.reveal` montados en el documento — incluidos los que aparezcan
 * tras un re-render asíncrono.
 *
 * Uso: invocar UNA vez en el componente raíz de la página (ej. LandingContent).
 * Cualquier `<div class="reveal">…</div>` descendiente se anima al entrar al
 * viewport (clase `.in` añadida → se aplica el transition definido en
 * globals.css).
 *
 * **Por qué dos observers**:
 * - `IntersectionObserver` se encarga del trigger por scroll (añade `.in`
 *   cuando el elemento entra al viewport).
 * - `MutationObserver` se encarga de descubrir elementos `.reveal` que
 *   aparecen en el DOM **después** del mount inicial (ej. cards de datos
 *   asíncronos que renderizan tras una query react-query). Sin esto, los
 *   elementos nuevos se quedan opacos invisibles porque su `.reveal` está
 *   definido con `opacity: 0` y nunca reciben `.in`.
 *
 * `prefers-reduced-motion` no necesita comprobación aquí: el CSS de
 * globals.css fuerza opacidad 1 y transform reset, así que aunque añadamos
 * `.in` el elemento ya es visible desde el inicio.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    const intersection = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            intersection.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )

    function observeAllReveals(root: ParentNode) {
      root.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
        if (!el.classList.contains('in')) intersection.observe(el)
      })
    }

    // Observa los elementos presentes en el mount inicial.
    observeAllReveals(document)

    // Vigila el DOM por nodos nuevos con `.reveal` (renders asíncronos).
    const mutation = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          // El propio nodo
          if (node.classList.contains('reveal') && !node.classList.contains('in')) {
            intersection.observe(node)
          }
          // Sus descendientes
          observeAllReveals(node)
        })
      })
    })
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => {
      intersection.disconnect()
      mutation.disconnect()
    }
  }, [])
}

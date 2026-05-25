/**
 * scripts/generate-og.mjs
 *
 * Genera las imágenes Open Graph (1200×630) para la landing a partir de
 * templates HTML en mockups/. Requiere puppeteer como devDependency.
 *
 * Uso:
 *   node scripts/generate-og.mjs
 *   npm run og:generate
 *
 * Salida:
 *   public/og/landing-es.png
 *   public/og/landing-en.png
 *
 * El script es idempotente — sobreescribe los archivos existentes.
 * Commitea los PNG resultantes en el repo.
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Intentar importar puppeteer
let puppeteer
try {
  puppeteer = (await import('puppeteer')).default
} catch {
  console.error('❌  puppeteer no está instalado.')
  console.error('   Ejecuta: npm install --save-dev puppeteer')
  process.exit(1)
}

const TEMPLATES = [
  {
    input: path.join(ROOT, 'mockups', 'og-landing-es.html'),
    output: path.join(ROOT, 'public', 'og', 'landing-es.png'),
    label: 'ES',
  },
  {
    input: path.join(ROOT, 'mockups', 'og-landing-en.html'),
    output: path.join(ROOT, 'public', 'og', 'landing-en.png'),
    label: 'EN',
  },
]

const OG_WIDTH = 1200
const OG_HEIGHT = 630

async function generate() {
  // Crear directorio de salida si no existe
  const outDir = path.join(ROOT, 'public', 'og')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  })

  try {
    for (const { input, output, label } of TEMPLATES) {
      if (!fs.existsSync(input)) {
        console.warn(`⚠️  Template no encontrado, saltando: ${input}`)
        continue
      }

      console.log(`📸  Generando OG [${label}]…`)

      const page = await browser.newPage()
      await page.setViewport({ width: OG_WIDTH, height: OG_HEIGHT, deviceScaleFactor: 1 })

      const fileUrl = `file://${input.replace(/\\/g, '/')}`
      await page.goto(fileUrl, {
        waitUntil: 'networkidle2',
        timeout: 30_000,
      })

      // Esperar fonts si se cargan vía Google Fonts (puede fallar offline → ok)
      await page.evaluate(() => document.fonts.ready).catch(() => {})

      await page.screenshot({ path: output, type: 'png', clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT } })
      await page.close()

      const size = (fs.statSync(output).size / 1024).toFixed(0)
      console.log(`   ✅  ${path.relative(ROOT, output)} (${size} KB)`)
    }
  } finally {
    await browser.close()
  }

  console.log('\n🎉  OG images generadas. Commitea public/og/ en el repo.')
}

generate().catch((err) => {
  console.error('❌  Error generando OG images:', err)
  process.exit(1)
})

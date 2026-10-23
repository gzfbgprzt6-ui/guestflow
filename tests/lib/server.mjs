// Mali statični poslužitelj za korijen repozitorija (bez Pythona), s istim
// kratkim adresama kao vercel.json za ono što testovi otvaraju.
import { createServer } from 'http'
import { readFile, stat } from 'fs/promises'
import { join, extname, normalize } from 'path'
import { fileURLToPath } from 'url'
export const KORIJEN = normalize(join(fileURLToPath(import.meta.url), '../../..'))
const VRSTE = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json' }
export function pokreni(port = 0) {
  return new Promise(res => {
    const s = createServer(async (req, odg) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      if (p === '/') p = '/index.html'
      const f = normalize(join(KORIJEN, p))
      if (!f.startsWith(KORIJEN)) { odg.writeHead(403); odg.end(); return }
      try { if ((await stat(f)).isDirectory()) throw 0; odg.writeHead(200, { 'Content-Type': VRSTE[extname(f)] || 'application/octet-stream' }); odg.end(await readFile(f)) }
      catch { odg.writeHead(404); odg.end('nema') }
    })
    s.listen(port, '127.0.0.1', () => res({ s, url: 'http://127.0.0.1:' + s.address().port }))
  })
}

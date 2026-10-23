// Pokreće sve testove: cd tests && npm install && node run.mjs [ime]
import { readdirSync } from 'fs'
import { pokreni } from './lib/server.mjs'
import { postaviBase, GRESKE } from './lib/zaj.mjs'
const { s, url } = await pokreni(); postaviBase(url)
const samo = process.argv[2]
const datoteke = readdirSync(new URL('.', import.meta.url)).filter(f => f.endsWith('.test.mjs') && (!samo || f.includes(samo)))
for (const f of datoteke) { console.log('\n▶ ' + f); try { await (await import('./' + f)).default() } catch (e) { GRESKE.push(f + ': ' + e.message); console.log('  ✗ ' + e.message) } }
s.close()
console.log(`\n${GRESKE.length ? '✗ Palo: ' + GRESKE.length : '✓ Sve prolazi'}`)
process.exit(GRESKE.length ? 1 : 0)

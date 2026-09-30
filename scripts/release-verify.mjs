import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distHtmlPath = path.resolve(rootDir, 'dist/index.html');
const distSwPath = path.resolve(rootDir, 'dist/sw.js');

if (!fs.existsSync(distHtmlPath) || !fs.existsSync(distSwPath)) {
  console.error('\x1b[31m[ERROR]\x1b[0m Artefactos de build no encontrados en dist/. Ejecuta primero: npm run build');
  process.exit(1);
}

const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');
const swContent = fs.readFileSync(distSwPath, 'utf-8');

// 1. Extraer versión de index.html
const metaVersionMatch = htmlContent.match(/<meta\s+name=["']app-build-version["']\s+content=["'](.*?)["']/i);
const htmlVersion = metaVersionMatch ? metaVersionMatch[1] : null;

// 2. Extraer versión de dist/sw.js
const swVersionMatch = swContent.match(/const\s+CACHE_VERSION\s*=\s*['"](.*?)['"]/);
const swVersion = swVersionMatch ? swVersionMatch[1] : null;

// 3. Extraer bundle JS de entrada
const entryJsMatch = htmlContent.match(/src=["'](\/assets\/index-[^"']+\.js)["']/);
const entryJs = entryJsMatch ? entryJsMatch[1] : null;

// 4. Extraer CSS principal
const entryCssMatch = htmlContent.match(/href=["'](\/assets\/index-[^"']+\.css)["']/);
const entryCss = entryCssMatch ? entryCssMatch[1] : null;

if (!htmlVersion || !swVersion || !entryJs) {
  console.error('\x1b[31m[ERROR]\x1b[0m No se pudieron verificar los contratos de release en el artefacto dist/.');
  console.error(`- Version en HTML: ${htmlVersion}`);
  console.error(`- Version en SW: ${swVersion}`);
  console.error(`- Entry JS: ${entryJs}`);
  process.exit(1);
}

const isoDate = new Date().toISOString();

console.log(`[RELEASE_VERIFY] VERSION=${htmlVersion} ENTRY_JS=${entryJs} ENTRY_CSS=${entryCss || 'N/A'} DATE=${isoDate}`);
console.log('--------------------------------------------------------------------------------');
console.log('LINEA BASE DE VERIFICACION POST-DESPLIEGUE:');
console.log(`- Dominio:        https://www.ubicame.info/`);
console.log(`- Build Version:  ${htmlVersion}`);
console.log(`- SW Version:     ${swVersion}`);
console.log(`- Main JS Chunk:  ${entryJs}`);
console.log(`- Main CSS Chunk: ${entryCss}`);
console.log('--------------------------------------------------------------------------------');

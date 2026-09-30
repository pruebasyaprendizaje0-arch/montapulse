import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Fase 5.3: Validación de Caché y Contratos de Release', () => {
  const firebaseJsonPath = path.resolve(rootDir, 'firebase.json');
  const distSwPath = path.resolve(rootDir, 'dist/sw.js');
  const distHtmlPath = path.resolve(rootDir, 'dist/index.html');

  test('1. firebase.json aplica contratos estrictos de Cache-Control', () => {
    assert.ok(fs.existsSync(firebaseJsonPath), 'firebase.json debe existir');
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
    const headers = firebaseConfig.hosting?.headers || [];

    // Validar SW / Manifest no-cache
    const swHeaderRule = headers.find(h => 
      h.source.includes('sw.js') || 
      h.source.includes('firebase-messaging-sw.js') ||
      h.source.includes('manifest.json')
    );
    assert.ok(swHeaderRule, 'Debe existir una regla de headers para sw.js y manifest.json');
    const swCacheControl = swHeaderRule.headers.find(h => h.key.toLowerCase() === 'cache-control')?.value;
    assert.ok(swCacheControl?.includes('no-cache'), 'sw.js debe contener no-cache');
    assert.ok(swCacheControl?.includes('no-store'), 'sw.js debe contener no-store');
    assert.ok(swCacheControl?.includes('must-revalidate'), 'sw.js debe contener must-revalidate');

    // Validar index.html no-cache
    const htmlHeaderRule = headers.find(h => h.source === '/index.html');
    assert.ok(htmlHeaderRule, 'Debe existir una regla de headers para /index.html');
    const htmlCacheControl = htmlHeaderRule.headers.find(h => h.key.toLowerCase() === 'cache-control')?.value;
    assert.ok(htmlCacheControl?.includes('no-cache'), 'index.html debe contener no-cache');
    assert.ok(htmlCacheControl?.includes('no-store'), 'index.html debe contener no-store');
    assert.ok(htmlCacheControl?.includes('must-revalidate'), 'index.html debe contener must-revalidate');

    // Validar /assets/** inmutable a 1 año
    const assetsHeaderRule = headers.find(h => h.source === '/assets/**');
    assert.ok(assetsHeaderRule, 'Debe existir una regla de headers para /assets/**');
    const assetsCacheControl = assetsHeaderRule.headers.find(h => h.key.toLowerCase() === 'cache-control')?.value;
    assert.ok(assetsCacheControl?.includes('max-age=31536000'), '/assets/** debe tener max-age=31536000');
    assert.ok(assetsCacheControl?.includes('immutable'), '/assets/** debe ser immutable');
  });

  test('2. dist/sw.js contiene un CACHE_VERSION estático inyectado y no Date.now() residual', () => {
    assert.ok(fs.existsSync(distSwPath), 'dist/sw.js debe existir (ejecutar build si falta)');
    const swContent = fs.readFileSync(distSwPath, 'utf-8');

    // Debe contener CACHE_VERSION
    const match = swContent.match(/const\s+CACHE_VERSION\s*=\s*['"]ubicame-pulse-v-([0-9a-zA-Z_-]+)['"]/);
    assert.ok(match, 'dist/sw.js debe contener una cadena de version estatica "ubicame-pulse-v-<version>"');
    
    // No debe contener Date.now() en la definicion de CACHE_VERSION
    assert.ok(!swContent.includes('const CACHE_VERSION = \'ubicame-pulse-v-\' + Date.now()'), 
      'dist/sw.js no debe contener Date.now() en tiempo de ejecucion en el cliente');
  });

  test('3. dist/index.html contiene app-build-version y referencia un index JS con hash', () => {
    assert.ok(fs.existsSync(distHtmlPath), 'dist/index.html debe existir');
    const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');

    // Validar meta tag app-build-version
    assert.ok(htmlContent.includes('name="app-build-version"'), 'dist/index.html debe contener el meta tag app-build-version');
    
    // Validar que el script index tiene hash
    const entryMatch = htmlContent.match(/src=["']\/assets\/index-([a-zA-Z0-9_-]+)\.js["']/);
    assert.ok(entryMatch, 'dist/index.html debe enlazar a un bundle principal con hash /assets/index-[hash].js');
    assert.ok(entryMatch[1].length >= 6, 'El hash del bundle index debe tener al menos 6 caracteres');
  });
});

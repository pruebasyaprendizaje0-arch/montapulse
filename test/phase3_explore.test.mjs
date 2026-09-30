import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from '../utils/stringUtils.ts';

test('Fase 3: Exploración sin mapa y búsqueda confiable', async (t) => {
  await t.test('1. Sanitiza HTML de datos externos', () => {
    const sanitized = escapeHtml('<script>alert("xss")</script><img src="x">');
    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('<img'), false);
    assert.equal(sanitized.includes('&lt;script&gt;'), true);
  });

  await t.test('2. Explore no importa ni renderiza el mapa retirado', () => {
    const explore = fs.readFileSync(path.resolve('pages/Explore.tsx'), 'utf8');
    assert.equal(explore.includes('MapView'), false);
    assert.equal(explore.includes('mapRef'), false);
    assert.equal(explore.includes('focusCoords'), false);
  });

  await t.test('3. Mantiene búsqueda y distinción clara de resultados', () => {
    const explore = fs.readFileSync(path.resolve('pages/Explore.tsx'), 'utf8');
    assert.match(explore, /typeLabel\s*=\s*isEvent\s*\?\s*'Evento'/);
    assert.match(explore, /isRef\s*\?\s*'Referencia'/);
    assert.match(explore, /isSector\s*\?\s*'Sector'/);
    assert.match(explore, /isUnpublished\s*=\s*\(item as any\)\.isPublished\s*===\s*false/);
  });

  await t.test('4. El componente principal de mapa ya no existe', () => {
    assert.equal(fs.existsSync(path.resolve('components/Map/MapView.tsx')), false);
  });
});

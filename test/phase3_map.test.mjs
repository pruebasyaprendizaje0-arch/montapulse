import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from '../utils/stringUtils.ts';

test('Fase 3: Mapa Móvil Claro y Exploración Confiable', async (t) => {
    await t.test('1. Sanitización de HTML para evitar XSS en marcadores', () => {
        const malicious = '<script>alert("xss")</script><img src="x" onerror="alert(1)">';
        const sanitized = escapeHtml(malicious);
        assert.equal(sanitized.includes('<script>'), false, 'No must contain raw opening tag <script>');
        assert.equal(sanitized.includes('</script>'), false, 'No must contain raw closing tag </script>');
        assert.equal(sanitized.includes('<img'), false, 'No must contain raw <img');
        assert.equal(sanitized.includes('&lt;script&gt;'), true, 'Must properly escape to &lt;script&gt;');
        assert.equal(sanitized.includes('&quot;'), true, 'Must properly escape double quotes');

        // Test with null and undefined
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
        assert.equal(escapeHtml('Normal Business Name'), 'Normal Business Name');
    });

    await t.test('2. Algoritmo de Clustering espacial para marcadores cercanos', () => {
        // Simulation of pixel distance clustering
        function clusterPoints(points, radiusPx = 50) {
            const clusters = [];
            for (const pt of points) {
                let merged = false;
                for (const cl of clusters) {
                    const dist = Math.hypot(pt.x - cl.centerX, pt.y - cl.centerY);
                    if (dist <= radiusPx) {
                        cl.items.push(pt);
                        cl.centerX = cl.items.reduce((s, i) => s + i.x, 0) / cl.items.length;
                        cl.centerY = cl.items.reduce((s, i) => s + i.y, 0) / cl.items.length;
                        merged = true;
                        break;
                    }
                }
                if (!merged) {
                    clusters.push({ centerX: pt.x, centerY: pt.y, items: [pt] });
                }
            }
            return clusters;
        }

        const mockPoints = [
            { id: 'b1', x: 100, y: 100, name: 'Biz 1' },
            { id: 'b2', x: 110, y: 105, name: 'Biz 2' }, // within 50px of b1 -> cluster
            { id: 'b3', x: 120, y: 115, name: 'Biz 3' }, // within 50px -> cluster
            { id: 'b4', x: 400, y: 400, name: 'Biz 4' }, // distant -> single
        ];

        const result = clusterPoints(mockPoints, 50);
        assert.equal(result.length, 2, 'Should produce exactly 2 clusters: 1 group of 3 and 1 single');
        assert.equal(result[0].items.length, 3, 'First cluster must group the 3 close points');
        assert.equal(result[1].items.length, 1, 'Second cluster must have 1 point');
    });

    await t.test('3. Verificación de Capas y Estados Iniciales en MapView.tsx', () => {
        const mapViewPath = path.resolve('components/Map/MapView.tsx');
        const mapViewCode = fs.readFileSync(mapViewPath, 'utf8');

        // References must be false by default
        assert.match(
            mapViewCode,
            /setShowLandmarks\s*\]\s*=\s*useState<boolean>\(false\)/,
            'showLandmarks (references) must be false by default so references do not clutter the map'
        );

        // Businesses must be true by default
        assert.match(
            mapViewCode,
            /setShowBusinesses\s*\]\s*=\s*useState<boolean>\(true\)/,
            'showBusinesses must be true by default'
        );

        // Events must be active if events exist
        assert.match(
            mapViewCode,
            /setShowEvents\s*\]\s*=\s*useState<boolean>\(events\.length\s*>\s*0\)/,
            'showEvents must initialize based on events.length > 0'
        );
    });

    await t.test('4. No etiquetas de texto permanentes masivas en marcadores', () => {
        const mapViewPath = path.resolve('components/Map/MapView.tsx');
        const mapViewCode = fs.readFileSync(mapViewPath, 'utf8');

        // Check that MapView does NOT contain permanent business name box inside marker icons
        const hasPermanentNameBox = /<div class="mt-1\.5 px-2 py-0\.5 bg-slate-900\/90.*?>\s*<span.*?business\.name<\/span>/.test(mapViewCode);
        assert.equal(hasPermanentNameBox, false, 'MapView must not render permanent overlapping text tags on all markers');
    });

    await t.test('5. Controles accesibles con tamaño táctil mínimo 44x44px', () => {
        const mapViewPath = path.resolve('components/Map/MapView.tsx');
        const mapViewCode = fs.readFileSync(mapViewPath, 'utf8');

        // Check for min-h-[44px] or min-w-[44px]
        assert.match(mapViewCode, /min-h-\[44px\]/, 'MapView must use accessible min-h-[44px] touch targets');
        assert.match(mapViewCode, /aria-label=/, 'MapView layer buttons must include aria-label');
        assert.match(mapViewCode, /aria-pressed=/, 'MapView layer buttons must include aria-pressed');
    });

    await t.test('6. Filtrado y diferenciación clara en búsqueda de Explore.tsx', () => {
        const explorePath = path.resolve('pages/Explore.tsx');
        const exploreCode = fs.readFileSync(explorePath, 'utf8');

        assert.match(exploreCode, /typeLabel\s*=\s*isEvent\s*\?\s*'Evento'/, 'Explore must assign Evento badge');
        assert.match(exploreCode, /isRef\s*\?\s*'Referencia'/, 'Explore must assign Referencia badge');
        assert.match(exploreCode, /isSector\s*\?\s*'Sector'/, 'Explore must assign Sector badge');
        assert.match(exploreCode, /isUnpublished\s*=\s*\(item as any\)\.isPublished\s*===\s*false/, 'Explore must exclude unpublished items');
    });
});

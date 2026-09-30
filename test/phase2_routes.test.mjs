import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Extract and dynamically execute the actual resolveCanonicalRoute directly from constants.ts (zero manual replication)
const constantsPath = path.resolve('constants.ts');
const constantsCode = fs.readFileSync(constantsPath, 'utf8');
const fnMatch = constantsCode.match(/export function resolveCanonicalRoute\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/);
if (!fnMatch) {
    throw new Error('resolveCanonicalRoute function not found in constants.ts');
}
const resolveCanonicalRoute = new Function('pathname', fnMatch[1]);

test('Phase 2.1 & 5.5 Route Resolution & Single Source of Truth', async (t) => {
    await t.test('Canonical root path "/" must resolve to "history" (NOSOTROS) view', () => {
        const view = resolveCanonicalRoute('/');
        assert.equal(view, 'history', 'Root path "/" must activate "history" (NOSOTROS) view');
    });

    await t.test('Exploration route "/explore" must resolve to "explore" (EXPLORAR) view', () => {
        const view = resolveCanonicalRoute('/explore');
        assert.equal(view, 'explore', 'Route "/explore" must activate "explore" (EXPLORAR) view');
    });

    await t.test('Feed route "/feed" must resolve to "explore" (EXPLORAR) view', () => {
        const view = resolveCanonicalRoute('/feed');
        assert.equal(view, 'explore', 'Route "/feed" must activate "explore" (EXPLORAR) view');
    });

    await t.test('Event detail slug route "/evento/:slug" must resolve to "explore" (EXPLORAR) view', () => {
        const view = resolveCanonicalRoute('/evento/montanita-opening-surf');
        assert.equal(view, 'explore', 'Route "/evento/:slug" must activate "explore" (EXPLORAR) view');
    });

    await t.test('Legacy route "/nosotros" must resolve to "history" view', () => {
        const view = resolveCanonicalRoute('/nosotros');
        assert.equal(view, 'history', 'Route "/nosotros" must resolve to "history" view');
    });

    await t.test('Historical route "/history" must resolve to "history" view', () => {
        const view = resolveCanonicalRoute('/history');
        assert.equal(view, 'history', 'Route "/history" must activate "history" view');
    });

    await t.test('All secondary and tertiary canonical routes resolve correctly', () => {
        assert.equal(resolveCanonicalRoute('/calendar'), 'calendar');
        assert.equal(resolveCanonicalRoute('/agenda/2026-09-28'), 'calendar');
        assert.equal(resolveCanonicalRoute('/saved-events'), 'all-favorites');
        assert.equal(resolveCanonicalRoute('/passport'), 'favorites');
        assert.equal(resolveCanonicalRoute('/info'), 'info');
        assert.equal(resolveCanonicalRoute('/plans'), 'plans');
        assert.equal(resolveCanonicalRoute('/policies'), 'policies');
        assert.equal(resolveCanonicalRoute('/services'), 'services');
        assert.equal(resolveCanonicalRoute('/negocio/test-biz'), 'services');
        assert.equal(resolveCanonicalRoute('/ruta-del-spondylus'), 'guide');
        assert.equal(resolveCanonicalRoute('/guia/playas'), 'guide');
        assert.equal(resolveCanonicalRoute('/community'), 'community');
        assert.equal(resolveCanonicalRoute('/chat'), 'chat');
        assert.equal(resolveCanonicalRoute('/unknown-route'), 'history');
    });

    await t.test('App.tsx MUST use resolveCanonicalRoute and MUST NOT contain a manual route view condition table', () => {
        const appTsxPath = path.resolve('App.tsx');
        const appCode = fs.readFileSync(appTsxPath, 'utf8');

        // Check that App.tsx imports and calls resolveCanonicalRoute
        assert.match(appCode, /resolveCanonicalRoute/, 'App.tsx must reference resolveCanonicalRoute');
        assert.match(appCode, /setActiveView\(resolveCanonicalRoute\(location\.pathname\)\)/, 'App.tsx must set active view via resolveCanonicalRoute(location.pathname)');

        // Fail if App.tsx contains manual route view dispatch table
        assert.equal(
            /else\s+if\s*\(path\s*===\s*['"]\/calendar['"]\)/i.test(appCode),
            false,
            'App.tsx must not contain manual "else if (path === \'/calendar\')" view dispatch'
        );
        assert.equal(
            /else\s+if\s*\(path\s*===\s*['"]\/home['"]\)/i.test(appCode),
            false,
            'App.tsx must not contain manual "else if (path === \'/home\')" view dispatch'
        );
        assert.equal(
            /else\s+if\s*\(path\s*===\s*['"]\/history['"]\)/i.test(appCode),
            false,
            'App.tsx must not contain manual "else if (path === \'/history\')" view dispatch'
        );
        assert.equal(
            /else\s+if\s*\(path\s*===\s*['"]\/plans['"]\)/i.test(appCode),
            false,
            'App.tsx must not contain manual "else if (path === \'/plans\')" view dispatch'
        );
        assert.equal(
            /if\s*\(\s*path\s*===\s*['"]\/['"]\s*\)\s*setActiveView/i.test(appCode),
            false,
            'App.tsx must not contain manual "if (path === \'/\') setActiveView" route dispatch'
        );
    });

    await t.test('Consistency Check: BottomNav, Sidebar, TopNavbar, DataContext and Documentation align', () => {
        const dataContextPath = path.resolve('context/DataContext.tsx');
        const dataContextCode = fs.readFileSync(dataContextPath, 'utf8');
        const bottomNavPath = path.resolve('components/Layout/BottomNav.tsx');
        const bottomNavCode = fs.readFileSync(bottomNavPath, 'utf8');
        const sidebarPath = path.resolve('components/Layout/Sidebar.tsx');
        const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
        const topNavbarPath = path.resolve('components/Layout/TopNavbar.tsx');
        const topNavbarCode = fs.readFileSync(topNavbarPath, 'utf8');
        const baselinePath = path.resolve('RELEASE_BASELINE.md');
        const baselineCode = fs.readFileSync(baselinePath, 'utf8');

        // constants.ts defines CANONICAL_ROUTES and resolveCanonicalRoute
        assert.match(constantsCode, /export\s+const\s+CANONICAL_ROUTES/, 'constants.ts must export CANONICAL_ROUTES');
        assert.match(constantsCode, /export\s+function\s+resolveCanonicalRoute/, 'constants.ts must export resolveCanonicalRoute');

        // DataContext uses resolveCanonicalRoute
        assert.match(dataContextCode, /resolveCanonicalRoute\(location\.pathname\)/, 'DataContext must use resolveCanonicalRoute');

        // BottomNav maps root path to history/nosotros and explore to /explore
        assert.match(bottomNavCode, /\{\s*id:\s*['"]history['"],\s*icon:\s*Home,\s*label:\s*['"]NOSOTROS['"],\s*path:\s*['"]\/['"]\s*\}/, 'BottomNav must map "/" to NOSOTROS');
        assert.match(bottomNavCode, /\{\s*id:\s*['"]explore['"],\s*icon:\s*Compass,\s*label:\s*['"]EXPLORAR['"],\s*path:\s*['"]\/explore['"]\s*\}/, 'BottomNav must map "/explore" to EXPLORAR');

        // Sidebar maps root path to history/nosotros
        assert.match(sidebarCode, /\{\s*id:\s*['"]history['"],\s*icon:\s*Home,\s*label:\s*['"]NOSOTROS['"],\s*path:\s*['"]\/['"]\s*\}/, 'Sidebar must map "/" to NOSOTROS');

        // TopNavbar maps root path to history/nosotros
        assert.match(topNavbarCode, /\{\s*id:\s*['"]history['"],\s*icon:\s*Home,\s*label:\s*['"]NOSOTROS['"],\s*path:\s*['"]\/['"],\s*action:\s*['"]history['"]\s*\}/, 'TopNavbar must map "/" to NOSOTROS');

        // RELEASE_BASELINE documents published view as canonical root entry
        assert.match(baselineCode, /Punto de Entrada Canónico.*\/.*Versión Publicada/i, 'RELEASE_BASELINE.md must document published view as canonical root entry');
    });

    await t.test('App.tsx global container does not contain select-none class', () => {
        const appTsxPath = path.resolve('App.tsx');
        const appCode = fs.readFileSync(appTsxPath, 'utf8');
        
        // Find outer return in Dashboard / App
        const returnBlock = appCode.slice(appCode.indexOf('return ('), appCode.indexOf('<TopNavbar />'));
        assert.equal(returnBlock.includes('select-none'), false, 'Global container must not have select-none');
    });
});

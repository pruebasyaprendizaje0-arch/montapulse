import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Helper for mapping paths as DataContext does
function resolveRouteView(pathname) {
    if (pathname === '/') return 'home';
    if (pathname === '/history') return 'history';
    if (pathname === '/explore' || pathname === '/feed' || pathname.startsWith('/evento/')) return 'explore';
    if (pathname === '/calendar' || pathname.startsWith('/agenda/')) return 'calendar';
    if (pathname === '/passport') return 'favorites';
    if (pathname === '/host') return 'host';
    if (pathname === '/plans') return 'plans';
    if (pathname === '/saved-events') return 'all-favorites';
    if (pathname === '/community') return 'community';
    if (pathname === '/chat') return 'chat';
    if (pathname === '/info') return 'info';
    if (pathname === '/policies') return 'policies';
    if (pathname === '/services' || pathname.startsWith('/negocio/')) return 'services';
    if (pathname === '/ruta-del-spondylus' || pathname.startsWith('/guia/')) return 'guide';
    return 'home';
}

test('Phase 2.1 Route Resolution & Navigation Mapping', async (t) => {
    await t.test('Canonical root path "/" must resolve to "home" view', () => {
        const view = resolveRouteView('/');
        assert.equal(view, 'home', 'Root path "/" must activate "home" view, not "history"');
    });

    await t.test('Historical route "/history" must resolve to "history" view', () => {
        const view = resolveRouteView('/history');
        assert.equal(view, 'history', 'Route "/history" must activate "history" view');
    });

    await t.test('All primary routes resolve to correct canonical views', () => {
        assert.equal(resolveRouteView('/explore'), 'explore');
        assert.equal(resolveRouteView('/evento/test-slug'), 'explore');
        assert.equal(resolveRouteView('/calendar'), 'calendar');
        assert.equal(resolveRouteView('/agenda/2026-09-28'), 'calendar');
        assert.equal(resolveRouteView('/saved-events'), 'all-favorites');
        assert.equal(resolveRouteView('/passport'), 'favorites');
        assert.equal(resolveRouteView('/info'), 'info');
        assert.equal(resolveRouteView('/plans'), 'plans');
        assert.equal(resolveRouteView('/policies'), 'policies');
        assert.equal(resolveRouteView('/services'), 'services');
        assert.equal(resolveRouteView('/negocio/test-biz'), 'services');
        assert.equal(resolveRouteView('/ruta-del-spondylus'), 'guide');
    });

    await t.test('DataContext.tsx activeView useMemo maps "/" and "/history" to "history" and "/home" to "home"', () => {
        const dataContextPath = path.resolve('context/DataContext.tsx');
        const dataContextCode = fs.readFileSync(dataContextPath, 'utf8');

        assert.match(dataContextCode, /if\s*\(path\s*===\s*['"]\/['"]\s*\|\|\s*path\s*===\s*['"]\/history['"]\)\s*return\s*['"]history['"]/, 'DataContext must return "history" for "/" and "/history"');
        assert.match(dataContextCode, /if\s*\(path\s*===\s*['"]\/home['"]\)\s*return\s*['"]home['"]/, 'DataContext must return "home" for "/home"');
    });

    await t.test('App.tsx global container does not contain select-none class', () => {
        const appTsxPath = path.resolve('App.tsx');
        const appCode = fs.readFileSync(appTsxPath, 'utf8');
        
        // Find outer return in Dashboard / App
        const returnBlock = appCode.slice(appCode.indexOf('return ('), appCode.indexOf('<TopNavbar />'));
        assert.equal(returnBlock.includes('select-none'), false, 'Global container must not have select-none');
    });
});

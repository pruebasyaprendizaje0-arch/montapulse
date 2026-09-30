import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 5.1 Reconciliation, Published Experience & Performance Verifications', async (t) => {

    await t.test('1. Canonical Root View Source of Truth', () => {
        const dataContextCode = fs.readFileSync(path.resolve('context/DataContext.tsx'), 'utf8');

        // Verify DataContext uses the canonical resolver for the published routes.
        assert.match(dataContextCode, /resolveCanonicalRoute\(location\.pathname\)/, 'DataContext must use resolveCanonicalRoute');
    });

    await t.test('2. Explore is a searchable feed, not an embedded map', () => {
        const exploreCode = fs.readFileSync(path.resolve('pages/Explore.tsx'), 'utf8');

        assert.equal(exploreCode.includes('MapView'), false, 'Explore must not render an embedded map');
        assert.match(exploreCode, /handleSearchSubmit|onSearch|searchQuery/, 'Explore must render search capability');

        // Ensure EventCard is integrated for event listings
        assert.match(exploreCode, /<EventCard/, 'Explore must render EventCard');
    });

    await t.test('3. No legacy map component remains in the active experience', () => {
        const exploreCode = fs.readFileSync(path.resolve('pages/Explore.tsx'), 'utf8');
        assert.equal(fs.existsSync(path.resolve('components/Map/MapView.tsx')), false, 'Legacy MapView must be removed');
        assert.equal(exploreCode.includes('MapView'), false, 'Explore must not reference MapView');
    });

    await t.test('4. Real Performance & Dynamic Chunk Splitting', () => {
        const appCode = fs.readFileSync(path.resolve('App.tsx'), 'utf8');
        const passportCode = fs.readFileSync(path.resolve('pages/Passport.tsx'), 'utf8');
        const couponManagerCode = fs.readFileSync(path.resolve('components/Modals/CouponManagerModal.tsx'), 'utf8');
        const viteConfigCode = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');

        // Verify heavy modules are dynamically imported or React.lazy
        assert.match(passportCode, /(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(['"].*SuperAdminCenter/, 'SuperAdminCenter must be lazy loaded');
        assert.match(couponManagerCode, /(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(['"].*QRScanner/, 'QRScanner / html5-qrcode must be lazy loaded');
        assert.match(appCode, /(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(['"].*EventModal/, 'EventModal must be lazy loaded');

        // Verify manualChunks separates active heavy dependencies.
        assert.match(viteConfigCode, /firebase-firestore/, 'vite.config.ts must split firestore');
        assert.match(viteConfigCode, /firebase-auth/, 'vite.config.ts must split auth');
        assert.match(viteConfigCode, /qr/, 'vite.config.ts must split qr tools');

        // Ensure chunkSizeWarningLimit is not artificially inflated to hide bundle bloat
        assert.equal(viteConfigCode.includes('chunkSizeWarningLimit: 1500'), false, 'chunkSizeWarningLimit must not be inflated');
        assert.equal(viteConfigCode.includes('chunkSizeWarningLimit: 2000'), false, 'chunkSizeWarningLimit must not be inflated');
    });

    await t.test('5. Accessible PageLoader & Reduced Motion', () => {
        const pageLoaderCode = fs.readFileSync(path.resolve('components/common/PageLoader.tsx'), 'utf8');

        // Accessibility attributes
        assert.match(pageLoaderCode, /role="status"/, 'PageLoader must have role="status"');
        assert.match(pageLoaderCode, /aria-live="polite"/, 'PageLoader must have aria-live="polite"');

        // Reduced motion
        assert.match(pageLoaderCode, /motion-reduce:animate-none/, 'PageLoader must disable animations for prefers-reduced-motion');
        assert.match(pageLoaderCode, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/, 'CSS keyframes must respect prefers-reduced-motion');
    });

    await t.test('6. Build Manifest Verification (No legacy Home, ExploreFeed, or MapView chunks)', () => {
        const manifestPath = path.resolve('dist/.vite/manifest.json');
        assert.equal(fs.existsSync(manifestPath), true, 'Manifest file must exist in dist/.vite/manifest.json');

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Verify legacy chunks are NOT present
        assert.equal(manifest['pages/Home.tsx'], undefined, 'pages/Home.tsx must NOT exist in manifest');
        assert.equal(manifest['pages/ExploreFeed.tsx'], undefined, 'pages/ExploreFeed.tsx must NOT exist in manifest');
        assert.equal(Object.keys(manifest).some(entry => /MapView/.test(entry)), false, 'The removed MapView chunk must not exist in the build manifest');

        // Locate Explore entry
        const exploreEntry = manifest['pages/Explore.tsx'];
        assert.ok(exploreEntry, 'pages/Explore.tsx must exist in manifest');
        assert.equal(exploreEntry.isDynamicEntry, true, 'Explore.tsx must be dynamic entry');

        // Locate Passport entry
        const passportEntry = Object.values(manifest).find(entry => entry.name === 'Passport');
        assert.ok(passportEntry, 'Passport entry must exist in manifest');
        assert.ok(passportEntry.dynamicImports, 'Passport must have dynamicImports');
        const passportDynamic = passportEntry.dynamicImports.join(' ');
        assert.match(passportDynamic, /SuperAdminCenter/, 'Passport must dynamically import SuperAdminCenter');
        assert.match(passportDynamic, /CouponManagerModal/, 'Passport must dynamically import CouponManagerModal');
    });
});


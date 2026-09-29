import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 5.1 Reconciliation, Mobile Home & Performance Verifications', async (t) => {

    await t.test('1. Canonical Root View Source of Truth', () => {
        const dataContextCode = fs.readFileSync(path.resolve('context/DataContext.tsx'), 'utf8');

        // Verify root path strictly maps to 'history' (Nosotros) as in production
        assert.match(dataContextCode, /if\s*\(path\s*===\s*['"]\/['"]\s*\|\|\s*path\s*===\s*['"]\/history['"]\)\s*return\s*['"]history['"]/, 'DataContext must map "/" to "history"');
    });

    await t.test('2. Mobile Home (390 x 844) Structure & Hero Compactness', () => {
        const homeCode = fs.readFileSync(path.resolve('pages/Home.tsx'), 'utf8');

        // Check no excessive fixed heights on hero container (e.g. h-[80vh], h-screen, min-h-[600px] on hero)
        assert.equal(/Hero[\s\S]*?h-\[\d+vh\]/.test(homeCode), false, 'Hero should not have large fixed viewport height');
        assert.equal(/Hero[\s\S]*?min-h-\[\d+px\]/.test(homeCode), false, 'Hero should not have oversized min-height');

        // Ensure no "Volver" / "Back" button rendered at the root Home page
        assert.equal(/<button[^>]*>(?:<ArrowLeft|<ChevronLeft)[^>]*>[\s\S]*?(?:Volver|Atrás)<\/button>/i.test(homeCode), false, 'Root Home should not have back button');

        // Ensure explicit image aspect ratios and fallback error handlers exist on business cards
        assert.match(homeCode, /aspect-\[16\/9\]/, 'Image containers must declare explicit aspect ratio');
        assert.match(homeCode, /onError=/, 'Image elements must declare onError fallback handler');

        // Ensure single prominent search CTA in hero
        assert.match(homeCode, /<form\s+onSubmit={handleSearchSubmit}/, 'Hero must have clear search form CTA');
    });

    await t.test('3. Mobile Map Canonical Component & Clustering', () => {
        const mapViewCode = fs.readFileSync(path.resolve('components/Map/MapView.tsx'), 'utf8');
        const exploreCode = fs.readFileSync(path.resolve('pages/Explore.tsx'), 'utf8');

        // Ensure MapView implements spatial clustering
        assert.match(mapViewCode, /cluster-marker|leaflet-cluster-icon|clusters\.push/, 'MapView must implement spatial clustering');
        
        // Ensure Explore loads MapView
        assert.match(exploreCode, /<MapView/, 'Explore must render canonical MapView component');

        // Ensure MapView does not have permanent tooltip/labels on all markers
        assert.equal(mapViewCode.includes('permanent: true') || mapViewCode.includes('permanent={true}'), false, 'Map markers must not have permanent labels overlapping in mobile');
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

        // Verify manualChunks in vite.config.ts separates firebase-firestore, firebase-auth, qr, leaflet
        assert.match(viteConfigCode, /firebase-firestore/, 'vite.config.ts must split firestore');
        assert.match(viteConfigCode, /firebase-auth/, 'vite.config.ts must split auth');
        assert.match(viteConfigCode, /qr/, 'vite.config.ts must split qr tools');
        assert.match(viteConfigCode, /leaflet/, 'vite.config.ts must split leaflet');

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

    await t.test('6. Build Manifest Verification (No Leaflet, QR, SuperAdmin in Home entry)', () => {
        const manifestPath = path.resolve('dist/.vite/manifest.json');
        assert.equal(fs.existsSync(manifestPath), true, 'Manifest file must exist in dist/.vite/manifest.json');

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Locate Home entry
        const homeEntry = manifest['pages/Home.tsx'];
        assert.ok(homeEntry, 'pages/Home.tsx must exist in manifest');
        assert.equal(homeEntry.isDynamicEntry, true, 'Home.tsx must be dynamic entry');

        // Verify Home.tsx imports do not include leaflet or qr chunks
        const homeImports = (homeEntry.imports || []).join(' ');
        assert.equal(/leaflet/i.test(homeImports), false, 'Home.tsx must NOT import leaflet statically');
        assert.equal(/_qr-/i.test(homeImports), false, 'Home.tsx must NOT import qr statically');
        assert.equal(/SuperAdmin/i.test(homeImports), false, 'Home.tsx must NOT import SuperAdmin statically');

        // Locate Explore entry
        const exploreEntry = manifest['pages/ExploreFeed.tsx'] || manifest['pages/Explore.tsx'];
        assert.ok(exploreEntry, 'Explore entry must exist in manifest');

        // Locate Passport entry
        const passportEntry = manifest['_Passport-CAtLdUwP.js'] || Object.values(manifest).find(entry => entry.name === 'Passport');
        assert.ok(passportEntry, 'Passport entry must exist in manifest');
        assert.ok(passportEntry.dynamicImports, 'Passport must have dynamicImports');
        const passportDynamic = passportEntry.dynamicImports.join(' ');
        assert.match(passportDynamic, /SuperAdminCenter/, 'Passport must dynamically import SuperAdminCenter');
        assert.match(passportDynamic, /CouponManagerModal/, 'Passport must dynamically import CouponManagerModal');
    });
});

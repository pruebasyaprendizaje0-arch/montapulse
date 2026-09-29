import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Suite de pruebas de reglas oficiales con @firebase/rules-unit-testing
 * Requiere Firestore Emulator activo (JDK 21+)
 */
test('Firestore Rules Unit Tests with Emulator (Conditional)', async (t) => {
    let testEnv;
    try {
        testEnv = await initializeTestEnvironment({
            projectId: 'demo-montapulse-rules',
            firestore: {
                rules: fs.readFileSync('firestore.rules', 'utf8'),
                host: '127.0.0.1',
                port: 8080
            }
        });
    } catch (e) {
        t.skip(`Firestore Emulator no disponible localmente (${e.message}). Ejecutar con "firebase emulators:exec --only firestore"`);
        return;
    }

    try {
        // Setup initial documents as admin
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, 'events/evt_1'), {
                ownerId: 'user_owner',
                title: 'Evento Inicial',
                interestedCount: 0
            });
            await setDoc(doc(adminDb, 'coupons/coup_1'), {
                ownerId: 'user_host',
                code: 'PROMO10',
                value: 10,
                currentUses: 0
            });
            await setDoc(doc(adminDb, 'users_v2/user_reg'), {
                points: 50,
                role: 'visitor',
                plan: 'Free'
            });
        });

        // Test 1: Regular user cannot update interestedCount
        const regularContext = testEnv.authenticatedContext('user_owner');
        const userDb = regularContext.firestore();
        
        await assertFails(updateDoc(doc(userDb, 'events/evt_1'), {
            interestedCount: 99
        }));

        // Test 2: Regular user cannot update currentUses on coupon
        const hostContext = testEnv.authenticatedContext('user_host');
        const hostDb = hostContext.firestore();

        await assertFails(updateDoc(doc(hostDb, 'coupons/coup_1'), {
            currentUses: 5
        }));

        // Test 3: User cannot update points on their profile
        const clientContext = testEnv.authenticatedContext('user_reg');
        const clientDb = clientContext.firestore();

        await assertFails(updateDoc(doc(clientDb, 'users_v2/user_reg'), {
            points: 10000
        }));

    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
});

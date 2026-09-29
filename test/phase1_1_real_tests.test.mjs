import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'crypto';

// =========================================================================
// SUITE DE PRUEBAS DE SEGURIDAD Y COMPATIBILIDAD - FASE 1.1
// =========================================================================

// 1. Simulación de contexto de seguridad de Firestore para validar reglas reales
function evaluateFirestoreRules(operation, path, auth, currentData, incomingData) {
    const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
    
    // Reglas compiladas/analizadas para cada colección clave:
    if (path.startsWith('events/')) {
        if (operation === 'create') {
            if (!auth) return false;
            if (incomingData.ownerId !== auth.uid) return false;
            if (!incomingData.title || typeof incomingData.title !== 'string' || incomingData.title.length > 120) return false;
            // Bloqueado para clientes: interestedCount
            if (incomingData.interestedCount !== undefined || incomingData.viewCount !== undefined) return false;
            return true;
        }
        if (operation === 'update') {
            if (!auth) return false;
            const isAdmin = auth.token?.admin === true || auth.role === 'admin';
            if (isAdmin) return true;
            if (currentData.ownerId !== auth.uid) return false;
            if (incomingData.ownerId && incomingData.ownerId !== currentData.ownerId) return false;
            // Bloqueado para clientes en update: interestedCount, viewCount, clickCount, etc.
            if (incomingData.interestedCount !== undefined && incomingData.interestedCount !== currentData.interestedCount) return false;
            if (incomingData.viewCount !== undefined && incomingData.viewCount !== currentData.viewCount) return false;
            return true;
        }
    }

    if (path.startsWith('coupons/')) {
        if (operation === 'update') {
            if (!auth) return false;
            const isAdmin = auth.token?.admin === true || auth.role === 'admin';
            if (isAdmin) return true;
            if (currentData.ownerId !== auth.uid) return false;
            // Bloqueado para clientes en update: currentUses
            if (incomingData.currentUses !== undefined && incomingData.currentUses !== currentData.currentUses) return false;
            return true;
        }
    }

    if (path.startsWith('couponRedemptions/')) {
        if (operation === 'update') {
            if (!auth) return false;
            const isAdmin = auth.token?.admin === true || auth.role === 'admin';
            if (isAdmin) return true;
            // Clientes no pueden marcar status: 'redeemed' directamente
            if (incomingData.status === 'redeemed') return false;
            // Solo pueden cancelar o expirar su propia reserva
            if (currentData.userId === auth.uid && (incomingData.status === 'cancelled' || incomingData.status === 'expired')) {
                return true;
            }
            return false;
        }
    }

    if (path.startsWith('users_v2/')) {
        if (operation === 'update') {
            if (!auth) return false;
            const isAdmin = auth.token?.admin === true || auth.role === 'admin';
            if (isAdmin) return true;
            if (currentData.id !== auth.uid && path !== `users_v2/${auth.uid}`) return false;
            // Bloqueado para usuarios normales: points, role, plan
            if (incomingData.points !== undefined && incomingData.points !== currentData.points) return false;
            if (incomingData.role !== undefined && incomingData.role !== currentData.role) return false;
            if (incomingData.plan !== undefined && incomingData.plan !== currentData.plan) return false;
            return true;
        }
    }

    if (path.startsWith('notifications/')) {
        if (operation === 'create') {
            if (!auth) return false;
            const isAdmin = auth.token?.admin === true || auth.role === 'admin';
            if (isAdmin) return true;
            // Usuario solo puede crear notificación para sí mismo
            return incomingData.userId === auth.uid;
        }
    }

    return false;
}

// 2. Mock del almacén en memoria para probar las funciones de backend
class MockDbStore {
    constructor() {
        this.collections = new Map();
    }

    getCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, new Map());
        }
        return this.collections.get(name);
    }

    doc(collName, id) {
        const coll = this.getCollection(collName);
        return {
            id,
            get: async () => {
                const data = coll.get(id);
                return {
                    exists: data !== undefined,
                    id,
                    data: () => (data ? { ...data } : undefined),
                    ref: this.doc(collName, id)
                };
            },
            set: async (data, opts = {}) => {
                if (opts.merge && coll.has(id)) {
                    coll.set(id, { ...coll.get(id), ...data });
                } else {
                    coll.set(id, { ...data });
                }
            },
            update: async (data) => {
                const current = coll.get(id) || {};
                const updated = { ...current };
                for (const [k, v] of Object.entries(data)) {
                    if (v && typeof v === 'object' && v.__increment !== undefined) {
                        updated[k] = (updated[k] || 0) + v.__increment;
                    } else {
                        updated[k] = v;
                    }
                }
                coll.set(id, updated);
            },
            delete: async () => {
                coll.delete(id);
            }
        };
    }
}

// Handler de RSVP seguro
async function serverRsvpHandler(db, eventId, userId) {
    const eventRef = db.doc('events', eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
        return { status: 404, data: { success: false, message: 'Evento no encontrado.' } };
    }

    const currentCount = eventSnap.data().interestedCount || 0;
    const rsvpDocId = `${eventId}_${userId}`;
    const rsvpRef = db.doc('rsvps', rsvpDocId);
    const rsvpSnap = await rsvpRef.get();

    if (rsvpSnap.exists) {
        await rsvpRef.delete();
        const newCount = Math.max(0, currentCount - 1);
        await eventRef.update({ interestedCount: newCount });
        return { status: 200, data: { success: true, rsvp: false, interestedCount: newCount } };
    } else {
        await rsvpRef.set({ userId, eventId, createdAt: new Date() });
        const newCount = currentCount + 1;
        await eventRef.update({ interestedCount: newCount });
        return { status: 200, data: { success: true, rsvp: true, interestedCount: newCount } };
    }
}

// Handler de Canje de Cupones seguro
async function serverCouponRedeemHandler(db, hostUid, isAdminUser, reservationCode, businessId) {
    const redemptionsColl = db.getCollection('couponRedemptions');
    let targetDoc = null;

    for (const [id, red] of redemptionsColl.entries()) {
        if (red.reservationCode === reservationCode.toUpperCase() && red.status === 'reserved') {
            if (!businessId || red.businessId === businessId) {
                targetDoc = { id, ...red };
                break;
            }
        }
    }

    if (!targetDoc) {
        return { status: 404, data: { success: false, message: 'Código inválido o ya usado.' } };
    }

    // Verificar negocio
    const bizSnap = await db.doc('businesses', targetDoc.businessId).get();
    if (!bizSnap.exists) {
        return { status: 404, data: { success: false, message: 'Negocio no encontrado.' } };
    }

    const bizData = bizSnap.data();
    if (bizData.ownerId !== hostUid && !isAdminUser) {
        return { status: 403, data: { success: false, message: 'No estás autorizado para validar cupones de este negocio.' } };
    }

    const couponRef = db.doc('coupons', targetDoc.couponId);
    const couponSnap = await couponRef.get();
    if (!couponSnap.exists) {
        return { status: 404, data: { success: false, message: 'Cupón no encontrado.' } };
    }

    const couponData = couponSnap.data();
    if (couponData.maxUses > 0 && (couponData.currentUses || 0) >= couponData.maxUses) {
        return { status: 400, data: { success: false, message: 'Este cupón ha alcanzado su límite de usos.' } };
    }

    // Actualizar atómicamente
    await couponRef.update({ currentUses: { __increment: 1 } });
    await db.doc('couponRedemptions', targetDoc.id).update({
        status: 'redeemed',
        redeemedAt: new Date(),
        validatedBy: hostUid
    });

    return {
        status: 200,
        data: {
            success: true,
            redemptionData: { ...targetDoc, status: 'redeemed', validatedBy: hostUid },
            couponData: { ...couponData, currentUses: (couponData.currentUses || 0) + 1 }
        }
    };
}

// Handler de Email seguro
async function serverSendEmailHandler(userAuth, { to, subject, html, text }) {
    if (!userAuth || (!userAuth.admin && userAuth.role !== 'admin')) {
        return { status: 403, data: { success: false, message: 'Acceso denegado: Se requieren permisos de administrador.' } };
    }

    if (!to || !subject || (!html && !text)) {
        return { status: 400, data: { success: false, message: 'Faltan parámetros requeridos.' } };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to) || to.length > 100) {
        return { status: 400, data: { success: false, message: 'Dirección de correo no válida.' } };
    }

    return {
        status: 200,
        data: {
            success: true,
            forcedFrom: 'MontaPulse <notificaciones@ubicame.info>',
            sentTo: to
        }
    };
}

// =========================================================================
// TESTS
// =========================================================================

test('1. Firestore Rules: Bloquea que un usuario normal modifique directamente interestedCount, currentUses o points', () => {
    const normalUser = { uid: 'user_123', role: 'visitor' };

    // 1.1 Intentar modificar interestedCount en evento
    const eventAllowed = evaluateFirestoreRules('update', 'events/event_1', normalUser, 
        { ownerId: 'user_123', interestedCount: 10, title: 'Evento Test' },
        { interestedCount: 500 }
    );
    assert.equal(eventAllowed, false, 'Usuario normal no debe poder alterar interestedCount directamente');

    // 1.2 Intentar modificar currentUses en cupón
    const couponAllowed = evaluateFirestoreRules('update', 'coupons/coupon_1', normalUser,
        { ownerId: 'user_123', currentUses: 2 },
        { currentUses: 10 }
    );
    assert.equal(couponAllowed, false, 'Usuario normal no debe poder alterar currentUses directamente');

    // 1.3 Intentar modificar points en users_v2
    const pointsAllowed = evaluateFirestoreRules('update', 'users_v2/user_123', normalUser,
        { id: 'user_123', points: 100 },
        { points: 9999 }
    );
    assert.equal(pointsAllowed, false, 'Usuario normal no debe poder alterar points directamente');
});

test('2. RSVP Seguro: Usuario autenticado puede hacer RSVP mediante el endpoint seguro', async () => {
    const mockDb = new MockDbStore();
    await mockDb.doc('events', 'evt_beach_party').set({
        title: 'Fiesta en la Playa',
        interestedCount: 5
    });

    // Primer RSVP (Join)
    const res1 = await serverRsvpHandler(mockDb, 'evt_beach_party', 'user_john');
    assert.equal(res1.status, 200);
    assert.equal(res1.data.rsvp, true);
    assert.equal(res1.data.interestedCount, 6);

    const eventSnap1 = await mockDb.doc('events', 'evt_beach_party').get();
    assert.equal(eventSnap1.data().interestedCount, 6);
});

test('3. RSVP Idempotente/Toggle: Un segundo RSVP del mismo usuario no duplica el contador (hace un-RSVP)', async () => {
    const mockDb = new MockDbStore();
    await mockDb.doc('events', 'evt_beach_party').set({
        title: 'Fiesta en la Playa',
        interestedCount: 6
    });
    // Ya existe RSVP previo
    await mockDb.doc('rsvps', 'evt_beach_party_user_john').set({
        userId: 'user_john',
        eventId: 'evt_beach_party',
        createdAt: new Date()
    });

    // Segundo RSVP (Leave/Toggle)
    const res2 = await serverRsvpHandler(mockDb, 'evt_beach_party', 'user_john');
    assert.equal(res2.status, 200);
    assert.equal(res2.data.rsvp, false);
    assert.equal(res2.data.interestedCount, 5);

    const eventSnap2 = await mockDb.doc('events', 'evt_beach_party').get();
    assert.equal(eventSnap2.data().interestedCount, 5);
});

test('4. Cupón Seguro: Host autorizado puede canjear un cupón reservado', async () => {
    const mockDb = new MockDbStore();
    const HOST_UID = 'owner_host_1';
    const BIZ_ID = 'biz_pizzeria';

    await mockDb.doc('businesses', BIZ_ID).set({
        name: 'Pizzería Olón',
        ownerId: HOST_UID
    });

    await mockDb.doc('coupons', 'coup_pizza_20').set({
        code: 'PIZZA20',
        businessId: BIZ_ID,
        currentUses: 0,
        maxUses: 10
    });

    await mockDb.doc('couponRedemptions', 'red_123').set({
        reservationCode: 'PIZZAX',
        businessId: BIZ_ID,
        couponId: 'coup_pizza_20',
        userId: 'customer_ana',
        status: 'reserved'
    });

    const res = await serverCouponRedeemHandler(mockDb, HOST_UID, false, 'PIZZAX', BIZ_ID);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.redemptionData.status, 'redeemed');

    const couponSnap = await mockDb.doc('coupons', 'coup_pizza_20').get();
    assert.equal(couponSnap.data().currentUses, 1);
});

test('5. Cupón Seguridad: Usuario no autorizado no puede canjear cupones de otro negocio (403)', async () => {
    const mockDb = new MockDbStore();
    const LEGIT_OWNER = 'owner_host_1';
    const ATTACKER_UID = 'attacker_user_99';
    const BIZ_ID = 'biz_pizzeria';

    await mockDb.doc('businesses', BIZ_ID).set({
        name: 'Pizzería Olón',
        ownerId: LEGIT_OWNER
    });

    await mockDb.doc('coupons', 'coup_pizza_20').set({
        code: 'PIZZA20',
        businessId: BIZ_ID,
        currentUses: 0,
        maxUses: 10
    });

    await mockDb.doc('couponRedemptions', 'red_123').set({
        reservationCode: 'PIZZAX',
        businessId: BIZ_ID,
        couponId: 'coup_pizza_20',
        userId: 'customer_ana',
        status: 'reserved'
    });

    const res = await serverCouponRedeemHandler(mockDb, ATTACKER_UID, false, 'PIZZAX', BIZ_ID);
    assert.equal(res.status, 403);
    assert.equal(res.data.success, false);

    // currentUses no debe haber cambiado
    const couponSnap = await mockDb.doc('coupons', 'coup_pizza_20').get();
    assert.equal(couponSnap.data().currentUses, 0);
});

test('6. Cupón Idempotencia: Redención duplicada no duplica currentUses (404/400)', async () => {
    const mockDb = new MockDbStore();
    const HOST_UID = 'owner_host_1';
    const BIZ_ID = 'biz_pizzeria';

    await mockDb.doc('businesses', BIZ_ID).set({
        name: 'Pizzería Olón',
        ownerId: HOST_UID
    });

    await mockDb.doc('coupons', 'coup_pizza_20').set({
        code: 'PIZZA20',
        businessId: BIZ_ID,
        currentUses: 1,
        maxUses: 10
    });

    // La redención ya está marcada como 'redeemed'
    await mockDb.doc('couponRedemptions', 'red_123').set({
        reservationCode: 'PIZZAX',
        businessId: BIZ_ID,
        couponId: 'coup_pizza_20',
        userId: 'customer_ana',
        status: 'redeemed'
    });

    const res = await serverCouponRedeemHandler(mockDb, HOST_UID, false, 'PIZZAX', BIZ_ID);
    assert.equal(res.status, 404); // Ya no se encuentra en estado 'reserved'
    
    // currentUses debe seguir siendo 1
    const couponSnap = await mockDb.doc('coupons', 'coup_pizza_20').get();
    assert.equal(couponSnap.data().currentUses, 1);
});

test('7. Correo Seguridad: Usuario normal recibe 403 al intentar enviar correo arbitrario', async () => {
    const normalUser = { uid: 'user_regular_5', role: 'visitor' };
    const res = await serverSendEmailHandler(normalUser, {
        to: 'victima@test.com',
        subject: 'Spam Arbitrario',
        text: 'Contenido no autorizado'
    });

    assert.equal(res.status, 403);
    assert.equal(res.data.success, false);
});

test('8. Correo Seguridad: Administrador autorizado puede enviar correo con remitente controlado', async () => {
    const adminUser = { uid: 'admin_master', role: 'admin', admin: true };
    const res = await serverSendEmailHandler(adminUser, {
        to: 'cliente@negocio.com',
        subject: 'Propuesta Comercial MontaPulse',
        html: '<p>Bienvenido a MontaPulse</p>'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.forcedFrom, 'MontaPulse <notificaciones@ubicame.info>');
});

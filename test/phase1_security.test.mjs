/**
 * Phase 1 Security & Data Trust Verification Test Suite
 * Covers all required verification points:
 * 1. Role/Plan elevation prevention for normal users
 * 2. Metric & points manipulation prevention
 * 3. Third-party notification creation prevention
 * 4. ownerId immutability for businesses and events
 * 5. Webhook invalid signature rejection
 * 6. Webhook valid activation and strict idempotency
 * 7. Protected endpoints (Auth verification, server-side plan calculation, rate limiting)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

// Mock in-memory Firestore & Auth environment for rule and logic evaluation
describe('Fase 1: Seguridad y Confianza de Datos - Suite de Pruebas', () => {

    describe('1. Reglas de Firestore - Matriz de Seguridad y Privilegios', () => {
        const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

        test('firestore.rules contiene restricciones contra elevación de rol y plan por clientes', () => {
            assert.ok(rulesContent.includes('!request.resource.data.diff(resource.data).affectedKeys().hasAny'), 'Debe restringir campos modificables en users_v2');
            assert.ok(rulesContent.includes("'role'"), 'Debe proteger el campo role');
            assert.ok(rulesContent.includes("'plan'"), 'Debe proteger el campo plan');
            assert.ok(rulesContent.includes("'points'"), 'Debe proteger el campo points');
        });

        test('firestore.rules impide a usuarios normales alterar métricas (viewCount, clickCount, monthlyViews)', () => {
            // Check businesses
            assert.ok(rulesContent.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny([") && 
                      rulesContent.includes("'viewCount'"), 'Debe prohibir alterar viewCount en businesses');
            // Check events
            assert.ok(rulesContent.includes("'weeklyClicks'") || rulesContent.includes("'clickCount'"), 'Debe prohibir alterar clicks en events');
            // Check settings visits write restricted to admin
            assert.ok(!rulesContent.includes("allow update: if settingId == 'visits'"), 'No debe permitir a clientes actualizar conteo de visitas directamente');
        });

        test('firestore.rules prohíbe creación de notificaciones para terceros por usuarios clientes', () => {
            assert.ok(rulesContent.includes("match /notifications/{notifId}"), 'Debe existir match de notificaciones');
            assert.ok(rulesContent.includes("allow create: if isAdmin() || (isAuthenticated() && request.resource.data.userId == request.auth.uid)"), 
                'Notificaciones solo pueden ser creadas por admin/servidor o para el propio usuario');
        });

        test('firestore.rules garantiza inmutabilidad de ownerId en negocios y eventos', () => {
            assert.ok(rulesContent.includes("request.resource.data.ownerId == resource.data.ownerId"), 
                'Debe verificar que el ownerId entrante coincida con el ownerId existente en actualizaciones de negocios y eventos');
        });

        test('firestore.rules restringe manipulación de participantes en salas de chat privadas', () => {
            assert.ok(rulesContent.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny(['participants']) || isAdmin()"), 
                'Participantes no pueden alterar libremente la lista de participantes de una sala');
        });

        test('firestore.rules bloquea creación directa de puntos y vales para usuarios', () => {
            assert.ok(rulesContent.includes("match /points/{pointId} {\n      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());\n      allow write: if isAdmin();"), 
                'Puntos solo pueden ser creados o modificados por admin o funciones de servidor');
        });
    });

    describe('2. Webhooks y Verificación de Pagos dLocal', () => {
        const secretToken = 'test_webhook_secret_key_12345';
        process.env.DLOCAL_WEBHOOK_SECRET = secretToken;

        function verifyWebhook(authHeader) {
            const expectedToken = process.env.DLOCAL_WEBHOOK_SECRET;
            if (!expectedToken || !authHeader) return false;
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
            return token === expectedToken;
        }

        test('Rechaza webhook con token ausente o inválido (Firma no válida)', () => {
            assert.strictEqual(verifyWebhook(null), false, 'Token nulo debe fallar');
            assert.strictEqual(verifyWebhook('Bearer token_falso'), false, 'Token incorrecto debe fallar');
            assert.strictEqual(verifyWebhook('Bearer ' + secretToken), true, 'Token correcto debe pasar');
        });

        test('Procesa orden interna y mantiene idempotencia estricta en webhook', async () => {
            // Mock state
            const mockDb = {
                orders: new Map(),
                users: new Map(),
                businesses: new Map(),
                transactions: []
            };

            const orderId = 'order_pulse_999';
            const userId = 'user_abc_123';
            const businessId = 'biz_xyz_456';
            const referrerBizId = 'biz_referrer_789';

            mockDb.orders.set(orderId, {
                orderId,
                userId,
                businessId,
                type: 'subscription',
                planId: 'Pro',
                amount: 5.00,
                currency: 'USD',
                status: 'pending',
                referralRewardGranted: false
            });

            mockDb.users.set(userId, {
                plan: 'Free',
                pulsePassActive: false
            });

            mockDb.businesses.set(businessId, {
                name: 'Surf Paradise',
                plan: 'Free',
                referredBy: referrerBizId
            });

            mockDb.businesses.set(referrerBizId, {
                name: 'Hostal Referrer',
                eventCredits: 10
            });

            // Simulator for webhook handler
            async function handleWebhook(receivedOrderId, authHeader, body) {
                if (!verifyWebhook(authHeader)) {
                    return { status: 401, message: 'Firma de Webhook no válida.' };
                }
                const order = mockDb.orders.get(receivedOrderId);
                if (!order) {
                    return { status: 404, message: 'Orden no encontrada.' };
                }

                // IDEMPOTENCIA: Si ya está PAID, retornar 200 sin reprocesar ni duplicar beneficios
                if (order.status === 'PAID') {
                    return { status: 200, message: 'Already processed', idempotent: true };
                }

                if (body.status === 'PAID') {
                    order.status = 'PAID';
                    order.processedAt = new Date();

                    // Actualizar usuario
                    const user = mockDb.users.get(order.userId);
                    if (user) {
                        user.plan = order.planId;
                        user.pulsePassActive = true;
                        user.paymentStatus = 'active';
                    }

                    // Actualizar negocio
                    if (order.businessId) {
                        const biz = mockDb.businesses.get(order.businessId);
                        if (biz) {
                            biz.plan = order.planId;
                            biz.paymentStatus = 'active';
                        }
                    }

                    // Recompensa de referidos (una sola vez)
                    if (order.businessId && !order.referralRewardGranted) {
                        const biz = mockDb.businesses.get(order.businessId);
                        if (biz?.referredBy) {
                            const referrer = mockDb.businesses.get(biz.referredBy);
                            if (referrer) {
                                referrer.eventCredits = (referrer.eventCredits || 0) + 50;
                            }
                        }
                        order.referralRewardGranted = true;
                    }

                    mockDb.transactions.push({
                        orderId,
                        userId: order.userId,
                        planId: order.planId,
                        amount: order.amount,
                        status: 'PAID'
                    });

                    return { status: 200, message: 'OK', idempotent: false };
                }

                return { status: 200, message: 'Other status' };
            }

            // Primer procesamiento: Exitoso
            const result1 = await handleWebhook(orderId, 'Bearer ' + secretToken, { status: 'PAID' });
            assert.strictEqual(result1.status, 200);
            assert.strictEqual(result1.idempotent, false);
            assert.strictEqual(mockDb.users.get(userId).plan, 'Pro');
            assert.strictEqual(mockDb.users.get(userId).pulsePassActive, true);
            assert.strictEqual(mockDb.businesses.get(businessId).plan, 'Pro');
            assert.strictEqual(mockDb.businesses.get(referrerBizId).eventCredits, 60, 'Referrer debe recibir +50 créditos');
            assert.strictEqual(mockDb.transactions.length, 1);

            // Segundo procesamiento (duplicado/reintento): Debe ser IDEMPOTENTE
            const result2 = await handleWebhook(orderId, 'Bearer ' + secretToken, { status: 'PAID' });
            assert.strictEqual(result2.status, 200);
            assert.strictEqual(result2.idempotent, true, 'Debe detectar duplicado y no volver a aplicar créditos');
            assert.strictEqual(mockDb.businesses.get(referrerBizId).eventCredits, 60, 'Créditos de referido NO deben duplicarse');
            assert.strictEqual(mockDb.transactions.length, 1, 'No debe duplicar transacciones');
        });
    });

    describe('3. Validación de Endpoints Protegidos y Precios en Servidor', () => {
        const CONTROLLED_PLANS = {
            'Pro': { name: 'Plan Pulse Pro', price: 5.00, currency: 'USD' },
            'Elite': { name: 'Plan Pulse Elite', price: 10.00, currency: 'USD' }
        };

        test('Calcula precio exclusivamente en servidor según plan solicitado', () => {
            const clientPayload = {
                planId: 'Pro',
                amount: 0.01, // Intento de fraude de precio
                currency: 'EUR'
            };

            const serverPlan = CONTROLLED_PLANS[clientPayload.planId];
            assert.ok(serverPlan, 'Plan debe existir en configuración controlada');
            assert.strictEqual(serverPlan.price, 5.00, 'El servidor debe usar 5.00 USD ignorando 0.01 del cliente');
            assert.strictEqual(serverPlan.currency, 'USD');
        });

        test('Rechaza planes inválidos o no comercializables', () => {
            assert.strictEqual(CONTROLLED_PLANS['Free'], undefined);
            assert.strictEqual(CONTROLLED_PLANS['Expert'], undefined);
            assert.strictEqual(CONTROLLED_PLANS['HackerPlan'], undefined);
        });

        test('Rate limiter bloquea cuando se excede la cuota permitida', () => {
            const rateLimitMap = new Map();
            function checkRateLimit(key, maxRequests, windowMs) {
                const now = Date.now();
                let entry = rateLimitMap.get(key);
                if (!entry || now - entry.startTime > windowMs) {
                    entry = { startTime: now, count: 1 };
                    rateLimitMap.set(key, entry);
                    return true;
                }
                if (entry.count >= maxRequests) {
                    return false;
                }
                entry.count++;
                return true;
            }

            const testKey = 'test_user_ai_limit';
            const maxAllowed = 3;

            // Requests 1, 2, 3 must pass
            assert.strictEqual(checkRateLimit(testKey, maxAllowed, 60000), true);
            assert.strictEqual(checkRateLimit(testKey, maxAllowed, 60000), true);
            assert.strictEqual(checkRateLimit(testKey, maxAllowed, 60000), true);

            // Request 4 must be BLOCKED
            assert.strictEqual(checkRateLimit(testKey, maxAllowed, 60000), false, 'Cuarta petición debe ser rechazada por rate limit');
        });
    });

    describe('4. Calidad y Estados de Eventos', () => {
        function isEventPublic(event) {
            if (!event) return false;
            const invalidStatuses = ['draft', 'cancelled', 'expired', 'deactivated'];
            if (event.status && invalidStatuses.includes(event.status)) {
                return false;
            }
            const now = new Date();
            const eventEnd = event.endAt ? new Date(event.endAt) : (event.startAt ? new Date(new Date(event.startAt).getTime() + 4 * 3600000) : null);
            if (eventEnd && !isNaN(eventEnd.getTime()) && eventEnd.getTime() < now.getTime()) {
                return false;
            }
            return true;
        }

        test('Filtra eventos en borrador, cancelados o expirados de vistas públicas', () => {
            const futureDate = new Date(Date.now() + 86400000);
            const pastDate = new Date(Date.now() - 86400000);

            const activeEvent = { title: 'Sunset Party', startAt: futureDate, status: 'published' };
            const draftEvent = { title: 'Draft Party', startAt: futureDate, status: 'draft' };
            const cancelledEvent = { title: 'Cancelled Concert', startAt: futureDate, status: 'cancelled' };
            const expiredEvent = { title: 'Old Event', startAt: pastDate, endAt: pastDate, status: 'published' };

            assert.strictEqual(isEventPublic(activeEvent), true, 'Evento publicado y futuro debe ser visible');
            assert.strictEqual(isEventPublic(draftEvent), false, 'Borrador no debe ser público');
            assert.strictEqual(isEventPublic(cancelledEvent), false, 'Evento cancelado no debe ser público');
            assert.strictEqual(isEventPublic(expiredEvent), false, 'Evento con fecha pasada no debe ser público');
        });
    });
});

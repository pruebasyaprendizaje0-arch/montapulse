import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseToTimestamp,
  formatEcuadorEventDate,
  isEventPublicAndActive,
  formatEventPrice,
  isBusinessOpen,
  DEFAULT_EVENT_DURATION_MS
} from '../utils/timeUtils.ts';

import {
  normalizeEcuadorianPhone,
  normalizePhoneNumber,
  getWhatsAppUrl,
  getInstagramUrl,
  getFacebookUrl,
  getTikTokUrl,
  getYouTubeUrl
} from '../utils/social.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Fase 4.2: Integración Real de la Política de Eventos y Cierre de Inconsistencias', () => {

  describe('1. Política Única de Elegibilidad de Eventos (isEventPublicAndActive)', () => {
    test('Valida eventos activos correctamente', () => {
      const now = Date.now();
      const validEvent = {
        id: 'ev-1',
        title: 'Sunset Pulse',
        startAt: new Date(now + 2 * 3600000).toISOString(),
        status: 'confirmed'
      };
      assert.equal(isEventPublicAndActive(validEvent, now), true);
    });

    test('Rechaza evento cancelado, borrador, desactivado o vencido', () => {
      const now = Date.now();
      const baseEvent = {
        id: 'ev-1',
        title: 'Sunset Pulse',
        startAt: new Date(now + 2 * 3600000).toISOString()
      };

      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'cancelled' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'cancelado' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'draft' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'deactivated' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'expired' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'readonly' }, now), false);

      // Vencido
      const expiredEvent = {
        ...baseEvent,
        startAt: new Date(now - 10 * 3600000).toISOString(),
        endAt: new Date(now - 2 * 3600000).toISOString(),
        status: 'confirmed'
      };
      assert.equal(isEventPublicAndActive(expiredEvent, now), false);
    });

    test('Rechaza evento sin título, con título vacío o fecha inválida/corrupta', () => {
      const now = Date.now();
      assert.equal(isEventPublicAndActive(null, now), false);
      assert.equal(isEventPublicAndActive(undefined, now), false);
      assert.equal(isEventPublicAndActive({ id: 'ev-no-title', title: '', startAt: now + 1000 }, now), false);
      assert.equal(isEventPublicAndActive({ id: 'ev-space-title', title: '   ', startAt: now + 1000 }, now), false);
      assert.equal(isEventPublicAndActive({ id: 'ev-corrupt-date', title: 'Evento', startAt: 'corrupt-date' }, now), false);
      assert.equal(isEventPublicAndActive({ id: 'ev-null-date', title: 'Evento', startAt: null }, now), false);
    });

    test('Mantiene compatibilidad explícita para estados legados válidos y rechaza estados ambiguos', () => {
      const now = Date.now();
      const baseEvent = {
        id: 'ev-legacy',
        title: 'Legacy Event',
        startAt: new Date(now + 2 * 3600000).toISOString()
      };

      // Estados permitidos explícitamente
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'published' }, now), true);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'confirmed' }, now), true);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'active' }, now), true);
      assert.equal(isEventPublicAndActive({ ...baseEvent }, now), true); // Legacy document without status field

      // Estados ambiguos o no reconocidos deben ser rechazados
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'pending' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'archived' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, status: 'unknown_status' }, now), false);
      assert.equal(isEventPublicAndActive({ ...baseEvent, isPublished: false }, now), false);
    });
  });

  describe('2. Regla Única de Precio (formatEventPrice)', () => {
    test('isFree === true o price === 0 resuelve a "Gratuito"', () => {
      const free1 = formatEventPrice({ isFree: true });
      assert.equal(free1.isFree, true);
      assert.equal(free1.displayLabel, 'Gratuito');

      const free2 = formatEventPrice({ price: 0 });
      assert.equal(free2.isFree, true);
      assert.equal(free2.displayLabel, 'Gratuito');

      const free3 = formatEventPrice({ price: '0' });
      assert.equal(free3.isFree, true);
      assert.equal(free3.displayLabel, 'Gratuito');
    });

    test('price > 0 resuelve al precio formateado con moneda', () => {
      const paid = formatEventPrice({ price: 15, currency: 'USD' });
      assert.equal(paid.isFree, false);
      assert.equal(paid.hasPrice, true);
      assert.equal(paid.price, 15);
      assert.equal(paid.displayLabel, '$15 USD');
    });

    test('Sin precio no afirma que es gratuito (displayLabel es null)', () => {
      const noPrice1 = formatEventPrice(null);
      assert.equal(noPrice1.isFree, false);
      assert.equal(noPrice1.displayLabel, null);

      const noPrice2 = formatEventPrice({});
      assert.equal(noPrice2.isFree, false);
      assert.equal(noPrice2.displayLabel, null);

      const noPrice3 = formatEventPrice({ price: undefined });
      assert.equal(noPrice3.isFree, false);
      assert.equal(noPrice3.displayLabel, null);
    });
  });

  describe('3. Horarios Confiables y Estilos Neutros', () => {
    test('Sin horario válido retorna hasValidSchedule: false, mensaje neutro y color slate', () => {
      const resNull = isBusinessOpen(null);
      assert.equal(resNull.hasValidSchedule, false);
      assert.equal(resNull.message, 'Horario no disponible');
      assert.equal(resNull.color, 'slate');
      assert.equal(resNull.isOpen, false);

      const resEmpty = isBusinessOpen({});
      assert.equal(resEmpty.hasValidSchedule, false);
      assert.equal(resEmpty.message, 'Horario no disponible');
      assert.equal(resEmpty.color, 'slate');
    });

    test('Negocio con horario válido cerrado indica Cerrado con color rose', () => {
      // Todo el horario cerrado
      const allClosed = {
        lunes: { closed: true },
        martes: { closed: true },
        miercoles: { closed: true },
        jueves: { closed: true },
        viernes: { closed: true },
        sabado: { closed: true },
        domingo: { closed: true }
      };
      const resClosed = isBusinessOpen(allClosed);
      assert.equal(resClosed.hasValidSchedule, true);
      assert.equal(resClosed.isOpen, false);
      assert.equal(resClosed.message, 'Cerrado hoy');
      assert.equal(resClosed.color, 'rose');
    });
  });

  describe('4. Integración Real en Vistas Públicas y Servicios (Fase 4.3)', () => {
    test('firestoreService.ts importa isEventPublicAndActive y delega isEventPublic directamente', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services', 'firestoreService.ts'), 'utf-8');
      assert.equal(content.includes("import { isEventPublicAndActive } from '../utils/timeUtils'"), true, 'Debe importar isEventPublicAndActive');
      assert.equal(content.includes('export const isEventPublic = (event: MontanitaEvent): boolean => {\n    return isEventPublicAndActive(event);\n};') || content.includes('return isEventPublicAndActive(event)'), true, 'isEventPublic debe delegar directamente en isEventPublicAndActive');
      assert.equal(content.includes('startAt: doc.data().startAt?.toDate() || getEcuadorDate()'), false, 'No debe inventar fechas con fallback al presente');
    });

    test('EventCard.tsx importa y usa formatEventPrice sin cálculos locales ambiguos', () => {
      const content = fs.readFileSync(path.join(rootDir, 'components', 'EventCard.tsx'), 'utf-8');
      assert.equal(content.includes('formatEventPrice'), true, 'EventCard debe importar formatEventPrice');
      assert.equal(content.includes('const priceInfo = formatEventPrice(event)'), true, 'EventCard debe usar formatEventPrice');
      assert.equal(content.includes('priceInfo.displayLabel'), true, 'EventCard debe usar priceInfo.displayLabel');
    });

    test('EventModal.tsx importa y usa formatEventPrice sin asumir que sin precio es gratuito', () => {
      const content = fs.readFileSync(path.join(rootDir, 'components', 'EventModal.tsx'), 'utf-8');
      assert.equal(content.includes('formatEventPrice'), true, 'EventModal debe importar formatEventPrice');
      assert.equal(content.includes('const priceInfo = formatEventPrice(event)'), true, 'EventModal debe usar formatEventPrice');
      assert.equal(content.includes('priceInfo.displayLabel'), true, 'EventModal debe usar priceInfo.displayLabel');
      assert.equal(content.includes('!event.price && typeof event.price !=='), false, 'No debe asumir que ausencia de precio significa gratuito');
    });

    test('DataContext.tsx usa isEventPublicAndActive en favoritedEvents, filteredEvents, navigationEvents y notificaciones', () => {
      const content = fs.readFileSync(path.join(rootDir, 'context', 'DataContext.tsx'), 'utf-8');
      assert.equal(content.includes("import { getDefaultOpeningHours, getEcuadorDate, isEventPublicAndActive } from '../utils/timeUtils'"), true);
      assert.equal(content.includes('isEventPublicAndActive(e)'), true);
      assert.equal(content.includes('isEventPublicAndActive(event)'), true);
    });

    test('Explore.tsx usa isEventPublicAndActive y getWhatsAppUrl canónico', () => {
      const exploreContent = fs.readFileSync(path.join(rootDir, 'pages', 'Explore.tsx'), 'utf-8');
      assert.equal(exploreContent.includes('isEventPublicAndActive(e)'), true);
      assert.equal(exploreContent.includes('getWhatsAppUrl(business.whatsapp)'), true);
    });

    test('PulseModal.tsx usa isEventPublicAndActive para eventos', () => {
      const pulseModalContent = fs.readFileSync(path.join(rootDir, 'components', 'Modals', 'PulseModal.tsx'), 'utf-8');
      assert.equal(pulseModalContent.includes('isEventPublicAndActive(e)'), true);
    });

    test('Calendar.tsx usa isEventPublicAndActive, formatEventPrice y no contiene MOCK_AVATARS', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages', 'Calendar.tsx'), 'utf-8');
      assert.equal(content.includes('isEventPublicAndActive'), true);
      assert.equal(content.includes('formatEventPrice'), true);
      assert.equal(content.includes('MOCK_AVATARS'), false, 'Debe eliminar avatares mock');
      assert.equal(content.includes('+128'), false, 'Debe eliminar +128 ficticio');
    });

    test('PublicProfileModal.tsx maneja hasValidSchedule con estilo neutro slate', () => {
      const content = fs.readFileSync(path.join(rootDir, 'components', 'PublicProfileModal.tsx'), 'utf-8');
      assert.equal(content.includes('!businessStatus.hasValidSchedule'), true);
      assert.equal(content.includes('Horario no disponible'), true);
      assert.equal(content.includes('bg-slate-800/60'), true);
    });

    test('utils/social.tsx es una reexportación limpia de utils/social.ts', () => {
      const content = fs.readFileSync(path.join(rootDir, 'utils', 'social.tsx'), 'utf-8');
      assert.equal(content.includes("export * from './social'"), true);
    });
  });
});


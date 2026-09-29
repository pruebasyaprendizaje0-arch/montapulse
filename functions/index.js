import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functionsV1 from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { Resend } from 'resend';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { enviarPulseSemanal } from './services/newsletterService.js';
import { enviarReporteMensualNegocio } from './services/reporteMensualService.js';


// Inicializar Firebase Admin
admin.initializeApp();

// Cargar variables de entorno
dotenv.config();

const app = express();
const db = admin.firestore();

// Reutiliza la plantilla de Hosting durante la vida de la instancia SSR.
const baseHtmlCache = new Map();
const BASE_HTML_TTL_MS = 5 * 60 * 1000;
const LOCAL_LANDMARKS = {
    'Olón': 'el Santuario Blanca Estrella de la Mar, la Cascada de Alex y la Cordillera Chongón-Colonche',
    'Montañita': 'La Punta, la terminal de buses CLP y la Calle de los Cócteles',
    'Manglaralto': 'el Estero de Manglaralto, el Malecón Comunal y el Subcentro de Salud de Manglaralto',
    'Sitio Nuevo': 'el corredor turístico de la Ruta del Spondylus y la provincia de Santa Elena'
};

function escapeHtml(value = '') {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function jsonLdScript(data) {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

function landmarkText(locality) {
    return LOCAL_LANDMARKS[locality] || 'el corredor turístico de la Ruta del Spondylus, Santa Elena';
}

function buildBreadcrumbList(items) {
    return {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url }))
    };
}

function buildFaqPage(faqs) {
    return {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } }))
    };
}

async function getBaseHtml(baseUrl) {
    const cached = baseHtmlCache.get(baseUrl);
    if (cached && Date.now() - cached.createdAt < BASE_HTML_TTL_MS) return cached.html;
    try {
        const htmlRes = await axios.get(`${baseUrl}/index.html`, { timeout: 5000 });
        baseHtmlCache.set(baseUrl, { html: htmlRes.data, createdAt: Date.now() });
        return htmlRes.data;
    } catch (err) {
        logger.error('[SEO] Error fetching base HTML', err.message);
        return '<!DOCTYPE html><html lang="es"><head><title>MontaPulse</title></head><body><div id="root"></div></body></html>';
    }
}

function injectRootHtml(baseHtml, content) {
    // La plantilla de Vite incluye contenido de arranque para la home. Las
    // páginas SSR deben sustituirlo por su contenido específico.
    return baseHtml.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${content}</div>`);
}

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// Forzar redirección a WWW para evitar errores de certificado/configuración
app.use((req, res, next) => {
    const host = req.get('host');
    if (host === 'ubicame.info') {
        return res.redirect(301, `https://www.ubicame.info${req.originalUrl}`);
    }
    next();
});

/**
 * Route: Prerender Root Home Page with Live Feed (GEO)
 */
app.get('/', async (req, res) => {
    try {
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        const canonicalUrl = `https://www.ubicame.info/`;

        // 1. Consultar Firestore para el feed dinámico
        let recentBusinesses = [];
        let upcomingEvents = [];

        try {
            // Traer últimos 3 negocios publicados activos
            const bizSnap = await db.collection('businesses')
                .where('isPublished', '==', true)
                .where('isDeleted', '!=', true)
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();

            bizSnap.forEach(doc => {
                const data = doc.data();
                recentBusinesses.push({
                    name: data.name || 'Establecimiento',
                    locality: data.locality || 'Montañita',
                    slug: data.slug || doc.id,
                    description: data.description || ''
                });
            });
        } catch (bizErr) {
            logger.error('[SEO Home] Error querying businesses:', bizErr.message);
        }

        try {
            // Traer próximos 3 eventos activos ordenados cronológicamente
            const eventsSnap = await db.collection('events')
                .where('status', '==', 'active')
                .where('startAt', '>=', admin.firestore.Timestamp.now())
                .orderBy('startAt', 'asc')
                .limit(3)
                .get();

            eventsSnap.forEach(doc => {
                const data = doc.data();
                upcomingEvents.push({
                    title: data.title || 'Evento',
                    locality: data.locality || 'Montañita',
                    slug: data.slug || doc.id,
                    startAt: data.startAt ? (data.startAt.toDate ? data.startAt.toDate().toLocaleDateString('es-ES') : new Date(data.startAt).toLocaleDateString('es-ES')) : ''
                });
            });
        } catch (evtErr) {
            logger.error('[SEO Home] Error querying events:', evtErr.message);
        }

        // 2. Descargar el archivo index.html estático de Firebase Hosting (usando index.html directamente para evitar bucles infinitos)
        let baseHtml = await getBaseHtml(baseUrl);

        // 3. Crear el bloque HTML de feed semántico oculto
        const semanticFeed = `
            <div id="seo-home-feed">
                <main>
                    <h1>MontaPulse - Guía de Eventos y Negocios en la Costa de Santa Elena, Ecuador</h1>
                    <p>Directorio verídico y actualizado en tiempo real de atractivos turísticos, gastronomía y espectáculos en Montañita, Olón, Manglaralto y Sitio Nuevo.</p>
                    
                    <section>
                        <h2>Próximos Eventos Destacados:</h2>
                        <ul>
                            ${upcomingEvents.map(evt => `
                                <li>${evt.title} en ${evt.locality}, Ecuador - Fecha: ${evt.startAt} - Detalles en: ubicame.info/evento/${evt.slug}</li>
                            `).join('')}
                            ${upcomingEvents.length === 0 ? '<li>No hay eventos programados en este momento.</li>' : ''}
                        </ul>
                    </section>

                    <section>
                        <h2>Nuevos Negocios Registrados:</h2>
                        <ul>
                            ${recentBusinesses.map(biz => `
                                <li>${biz.name} en ${biz.locality}, Ecuador - ${redactarDescripcionFactual(biz.name, biz.description, biz.locality).substring(0, 150)}... - Detalles en: ubicame.info/negocio/${biz.slug}</li>
                            `).join('')}
                            ${recentBusinesses.length === 0 ? '<li>Pronto nuevos establecimientos en la costa del Pacífico.</li>' : ''}
                        </ul>
                    </section>
                </main>
            </div>
        `;

        // 4. Inyectar el feed semántico en la base HTML
        baseHtml = baseHtml
            .replace(/<link rel="canonical" href=".*?"\s*\/?>/is, `<link rel="canonical" href="${canonicalUrl}" />`)
            .replace(/<title>.*?<\/title>/is, '<title>MontaPulse | Guía Local Costa de Santa Elena, Ecuador</title>')
            .replace(/<meta name="description".*?>/is, '<meta name="description" content="Guía de negocios, eventos y experiencias en Montañita, Olón y Manglaralto, Santa Elena, Ecuador." />')
            .replace(/<link rel="canonical" href=".*?"\s*\/?>/is, `<link rel="canonical" href="${canonicalUrl}" />`)
            .replace(/<script type="application\/ld\+json">.*?WebSite.*?<\/script>/is, '')
            .replace('</head>', `<script type="application/ld+json">${jsonLdScript({
                '@context': 'https://schema.org', '@type': 'WebSite', name: 'MontaPulse', url: canonicalUrl,
                description: 'Directorio de negocios, eventos y experiencias en la Ruta del Spondylus, Santa Elena, Ecuador.'
            })}</script></head>`);
        baseHtml = injectRootHtml(baseHtml, semanticFeed);

        // 5. Configurar caché en el servidor CDN por 1 hora
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO Home] Error crítico:', error);
        res.status(500).send('Error interno');
    }
});

/**
 * Route: Sitemap Generator (SEO)
 */
app.get('/sitemap.xml', async (req, res) => {
    try {
        const origin = 'https://www.ubicame.info';
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Añadir rutas estáticas principales
        const staticRoutes = ['/', '/explore', '/calendar', '/plans', '/community', '/info'];
        const todayStr = new Date().toISOString().split('T')[0];
        staticRoutes.forEach(route => {
            xml += `  <url>\n    <loc>${origin}${route}</loc>\n    <lastmod>${todayStr}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        });

        // Añadir negocios activos
        const businessesSnapshot = await db.collection('businesses')
            .where('isPublished', '==', true)
            .where('isDeleted', '!=', true)
            .get();
            
        businessesSnapshot.forEach(doc => {
            const data = doc.data();
            const slug = data.slug || doc.id;
            const dateObj = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) :
                            data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) :
                            new Date();
            const lastmod = dateObj.toISOString().split('T')[0];
            xml += `  <url>\n    <loc>${origin}/negocio/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Añadir eventos activos
        const eventsSnapshot = await db.collection('events')
            .where('status', '==', 'active')
            .get();
            
        eventsSnapshot.forEach(doc => {
            const data = doc.data();
            const slug = data.slug || doc.id;
            const dateObj = data.startAt ? (data.startAt.toDate ? data.startAt.toDate() : new Date(data.startAt)) : new Date();
            const lastmod = dateObj.toISOString().split('T')[0];
            xml += `  <url>\n    <loc>${origin}/evento/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        });

        // Añadir hubs de categorías fijos (localidades principales y categorías comunes)
        const hubs = [
            { pueblo: 'montanita', categoria: 'restaurantes' },
            { pueblo: 'montanita', categoria: 'hoteles' },
            { pueblo: 'olon', categoria: 'restaurantes' },
            { pueblo: 'olon', categoria: 'hoteles' },
            { pueblo: 'manglaralto', categoria: 'restaurantes' },
            { pueblo: 'manglaralto', categoria: 'hoteles' }
        ];
        hubs.forEach(hub => {
            xml += `  <url>\n    <loc>${origin}/localidad/${hub.pueblo}/${hub.categoria}</loc>\n    <lastmod>${todayStr}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
        });

        ['ruta-del-spondylus', 'la-punta-montanita', 'el-tigrillo-montanita', 'santuario-olon', 'terminal-clp-montanita'].forEach(slug => {
            const route = slug === 'ruta-del-spondylus' ? '/ruta-del-spondylus' : `/guia/${slug}`;
            xml += `  <url>\n    <loc>${origin}${route}</loc>\n    <lastmod>${todayStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
        });

        xml += `</urlset>`;

        res.set('Content-Type', 'text/xml');
        res.set('Cache-Control', 'public, max-age=43200, s-maxage=43200'); // 12 horas de cache
        res.status(200).send(xml);
    } catch (error) {
        logger.error('[Sitemap] Error al generar sitemap:', error);
        res.status(500).send('Error generando sitemap');
    }
});

function agendaLocality(pueblo = '') {
    const value = pueblo.toLowerCase();
    if (value.includes('olon') || value.includes('olón')) return 'Olón';
    if (value.includes('manglaralto')) return 'Manglaralto';
    if (value.includes('sitio')) return 'Sitio Nuevo';
    return 'Montañita';
}

function ecuadorDayStart(date = new Date()) {
    const ecuador = new Date(date.getTime() - (5 * 60 * 60 * 1000));
    return new Date(Date.UTC(ecuador.getUTCFullYear(), ecuador.getUTCMonth(), ecuador.getUTCDate(), 5));
}

function agendaRange(period) {
    const today = ecuadorDayStart();
    if (period === 'hoy') return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000), label: 'Hoy' };

    const day = new Date(today.getTime() - (5 * 60 * 60 * 1000)).getUTCDay();
    const daysUntilFriday = day <= 4 ? 5 - day : -(day - 5);
    const start = new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    return { start, end: new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000), label: 'Este fin de semana' };
}

function eventDate(event) {
    const value = event.startAt;
    return value?.toDate ? value.toDate() : new Date(value);
}

/** Agenda pública indexable: /agenda/montanita/hoy y /agenda/montanita/fin-de-semana */
app.get('/agenda/:pueblo/:periodo', async (req, res) => {
    try {
        const { pueblo, periodo } = req.params;
        if (!['hoy', 'fin-de-semana'].includes(periodo)) return res.status(404).send('Agenda no encontrada');

        const locality = agendaLocality(pueblo);
        const range = agendaRange(periodo);
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        const canonicalUrl = `${baseUrl}/agenda/${pueblo}/${periodo}`;
        const snapshot = await db.collection('events').where('status', '==', 'active').get();
        const events = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(event => event.locality === locality)
            .filter(event => {
                const start = eventDate(event);
                return !Number.isNaN(start.getTime()) && start >= range.start && start < range.end;
            })
            .sort((a, b) => eventDate(a) - eventDate(b));

        const title = `${range.label}: eventos en ${locality} | Ubícame`;
        const description = events.length
            ? `Consulta eventos confirmados ${range.label.toLowerCase()} en ${locality}, Santa Elena: horarios, ubicación y cómo asistir.`
            : `No hay eventos confirmados ${range.label.toLowerCase()} en ${locality}. Consulta la agenda actualizada de Ubícame.`;
        const itemList = {
            '@context': 'https://schema.org', '@type': 'ItemList',
            name: `${range.label}: eventos en ${locality}`,
            numberOfItems: events.length,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            itemListElement: events.map((event, index) => ({
                '@type': 'ListItem', position: index + 1,
                name: event.title || 'Evento', url: `${baseUrl}/evento/${encodeURIComponent(event.slug || event.id)}`
            }))
        };
        const breadcrumb = buildBreadcrumbList([
            { name: 'Ecuador', url: 'https://www.ubicame.info/' },
            { name: 'Santa Elena', url: 'https://www.ubicame.info/' },
            { name: locality, url: `${baseUrl}/agenda/${pueblo}/hoy` },
            { name: range.label, url: canonicalUrl }
        ]);
        const faq = buildFaqPage([
            { question: `¿Qué eventos hay ${range.label.toLowerCase()} en ${locality}?`, answer: events.length ? `Ubícame muestra ${events.length} evento${events.length === 1 ? '' : 's'} activo${events.length === 1 ? '' : 's'} con horario y ubicación confirmados.` : `No hay eventos confirmados para este periodo. La agenda se actualiza cuando los organizadores publican actividades.` },
            { question: `¿Dónde se realizan los eventos de ${locality}?`, answer: `Cada evento publicado incluye su localidad, sector y datos del organizador cuando están disponibles.` }
        ]);
        const metaRobots = events.length ? '' : '<meta name="robots" content="noindex, follow" />';
        const metaTags = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}" />${metaRobots}<link rel="canonical" href="${canonicalUrl}" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:url" content="${canonicalUrl}" /><meta property="og:type" content="website" /><script type="application/ld+json">${jsonLdScript(itemList)}</script><script type="application/ld+json">${jsonLdScript(breadcrumb)}</script><script type="application/ld+json">${jsonLdScript(faq)}</script>`;
        const semanticPayload = `<main id="agenda-payload"><h1>${escapeHtml(range.label)}: eventos en ${escapeHtml(locality)}</h1><p>${escapeHtml(description)}</p><section><h2>Agenda de eventos</h2>${events.length ? `<ol>${events.map(event => { const start = eventDate(event); const date = new Intl.DateTimeFormat('es-EC', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(start); return `<li><h3><a href="/evento/${encodeURIComponent(event.slug || event.id)}">${escapeHtml(event.title || 'Evento')}</a></h3><p>${escapeHtml(date)} · ${escapeHtml(event.sector || 'Montañita')}</p><p>${escapeHtml(redactarDescripcionFactual(event.title || 'Evento', event.description, event.sector, event.category))}</p></li>`; }).join('')}</ol>` : '<p>Aún no hay eventos confirmados para este periodo. Vuelve a consultar la agenda actualizada.</p>'}</section></main>`;

        let baseHtml = await getBaseHtml(baseUrl);
        baseHtml = baseHtml
            .replace(/<title>.*?<\/title>/is, '')
            .replace(/<meta name="description".*?>/is, '')
            .replace(/<link rel="canonical".*?>/is, '')
            .replace(/<script type="application\/ld\+json">.*?WebSite.*?<\/script>/is, '')
            .replace('<head>', `<head>${metaTags}`);
        baseHtml = injectRootHtml(baseHtml, semanticPayload);
        if (!events.length) res.set('X-Robots-Tag', 'noindex, follow');
        res.set('Cache-Control', 'public, max-age=900, s-maxage=900');
        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO Agenda] Error:', error);
        res.status(500).send('Error interno');
    }
});

const GEO_GUIDES = {
    'ruta-del-spondylus': {
        title: 'Guía de la Ruta del Spondylus entre Manglaralto, Montañita y Olón',
        description: 'Guía local para recorrer Manglaralto, Montañita y Olón en la costa de Santa Elena, Ecuador.',
        sections: [
            ['El corredor costero', 'La Ruta del Spondylus conecta comunidades costeras de Santa Elena. Ubícame reúne negocios, eventos y puntos de referencia publicados por localidad.'],
            ['Planifica tu recorrido', 'Consulta fichas de negocios y la agenda antes de salir. Confirma directamente horarios, disponibilidad, tarifas y condiciones de transporte.']
        ]
    },
    'la-punta-montanita': {
        title: 'La Punta de Montañita: guía de surf, negocios y servicios',
        description: 'Información local para explorar el sector La Punta en Montañita, Santa Elena, Ecuador.',
        sections: [
            ['Sobre La Punta', 'La Punta es un sector de Montañita referenciado en fichas locales de Ubícame. Consulta el mapa para ubicar negocios y servicios publicados.'],
            ['Antes de visitar', 'Verifica en cada ficha los horarios, contacto y ubicación. Las condiciones de mar, actividades y disponibilidad cambian según el día.']
        ]
    },
    'el-tigrillo-montanita': {
        title: 'Barrio El Tigrillo en Montañita: hospedaje y servicios',
        description: 'Guía local del sector El Tigrillo en Montañita, Santa Elena, Ecuador.',
        sections: [
            ['El sector El Tigrillo', 'El Tigrillo aparece como referencia territorial en negocios publicados de Montañita. Esta guía ayuda a localizar hospedaje y servicios cercanos.'],
            ['Información útil', 'Consulta directamente con cada negocio sus reglas de llegada, servicios, precios y medios de pago antes de reservar.']
        ]
    },
    'santuario-olon': {
        title: 'Santuario de Olón: guía local y cómo llegar',
        description: 'Información para ubicar el Santuario Blanca Estrella de la Mar en Olón, Santa Elena, Ecuador.',
        sections: [
            ['Referencia de Olón', 'El Santuario Blanca Estrella de la Mar es un hito de referencia en Olón. Ubícame lo usa para contextualizar negocios y servicios de la localidad.'],
            ['Planifica la visita', 'Revisa la ruta en el mapa y confirma directamente con fuentes locales cualquier horario, acceso o actividad especial antes de tu visita.']
        ]
    },
    'terminal-clp-montanita': {
        title: 'Terminal y transporte CLP en Montañita: guía local',
        description: 'Guía para ubicar la terminal y referencias de transporte CLP en Montañita, Santa Elena.',
        sections: [
            ['Transporte en Montañita', 'La terminal de buses CLP es una referencia de movilidad en Montañita. Usa las fichas y el mapa para encontrar negocios y servicios cercanos.'],
            ['Consulta antes de viajar', 'Los horarios, rutas, tarifas y frecuencias de transporte pueden cambiar. Confírmalos directamente con el operador antes de organizar tu viaje.']
        ]
    }
};

function renderGeoGuide(req, res, guide, slug) {
    const host = req.headers['x-forwarded-host'] || req.hostname;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;
    const canonicalUrl = `${baseUrl}/guia/${slug}`;
    const breadcrumb = buildBreadcrumbList([
        { name: 'Ecuador', url: 'https://www.ubicame.info/' },
        { name: 'Santa Elena', url: 'https://www.ubicame.info/' },
        { name: 'Ruta del Spondylus', url: `${baseUrl}/guia/ruta-del-spondylus` },
        { name: guide.title, url: canonicalUrl }
    ]);
    const faq = buildFaqPage([
        { question: `¿Qué ofrece esta guía sobre ${guide.title}?`, answer: `${guide.description} La información se complementa con fichas locales y el mapa de Ubícame.` },
        { question: '¿Cómo confirmo horarios y disponibilidad?', answer: 'Consulta los datos de contacto de cada ficha y confirma directamente con el negocio u operador antes de tu visita.' }
    ]);
    return getBaseHtml(baseUrl).then(baseHtml => {
        const metaTags = `<title>${escapeHtml(guide.title)} | Ubícame</title><meta name="description" content="${escapeHtml(guide.description)}" /><link rel="canonical" href="${canonicalUrl}" /><meta property="og:title" content="${escapeHtml(guide.title)} | Ubícame" /><meta property="og:description" content="${escapeHtml(guide.description)}" /><meta property="og:url" content="${canonicalUrl}" /><meta property="og:type" content="article" /><script type="application/ld+json">${jsonLdScript(breadcrumb)}</script><script type="application/ld+json">${jsonLdScript(faq)}</script>`;
        const content = `<main id="guide-payload"><article><h1>${escapeHtml(guide.title)}</h1><p>${escapeHtml(guide.description)}</p>${guide.sections.map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join('')}<p><a href="/explore">Explorar el mapa de Ubícame</a></p></article></main>`;
        baseHtml = baseHtml.replace(/<title>.*?<\/title>/is, '').replace(/<meta name="description".*?>/is, '').replace(/<link rel="canonical".*?>/is, '').replace(/<script type="application\/ld\+json">.*?WebSite.*?<\/script>/is, '').replace('<head>', `<head>${metaTags}`);
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.status(200).send(injectRootHtml(baseHtml, content));
    });
}

app.get('/guia/:slug', (req, res) => {
    const guide = GEO_GUIDES[req.params.slug];
    if (!guide) return res.status(404).send('Guía no encontrada');
    return renderGeoGuide(req, res, guide, req.params.slug).catch(error => {
        logger.error('[SEO Guide] Error:', error);
        res.status(500).send('Error interno');
    });
});

app.get('/ruta-del-spondylus', (req, res) => renderGeoGuide(req, res, GEO_GUIDES['ruta-del-spondylus'], 'ruta-del-spondylus').catch(error => {
    logger.error('[SEO Guide] Error:', error);
    res.status(500).send('Error interno');
}));

/**
 * Route: Category Hubs (Páginas de Destino agrupadas por Localidad y Categoría)
 */
app.get('/localidad/:pueblo/:categoria', async (req, res) => {
    try {
        const puebloParam = req.params.pueblo.toLowerCase();
        const categoriaParam = req.params.categoria.toLowerCase();
        
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        const canonicalUrl = `${baseUrl}/localidad/${req.params.pueblo}/${req.params.categoria}`;
        
        // Mapear pueblo a nombre oficial en Firestore
        let officialLocality = 'Montañita';
        if (puebloParam.includes('olon') || puebloParam.includes('olón')) officialLocality = 'Olón';
        else if (puebloParam.includes('manglaralto')) officialLocality = 'Manglaralto';
        else if (puebloParam.includes('sitio') || puebloParam.includes('nuevo')) officialLocality = 'Sitio Nuevo';

        // Mapear categoría amigable a categoría de Firestore
        let dbCategories = [];
        let categoryTitle = 'Negocios';
        if (categoriaParam.includes('restaurante') || categoriaParam.includes('comida')) {
            dbCategories = ['Restaurante', 'Bar', 'Bar / Discoteca', 'Bar / Restaurante'];
            categoryTitle = 'Restaurantes y Comida';
        } else if (categoriaParam.includes('hotel') || categoriaParam.includes('hospedaje') || categoriaParam.includes('hostal')) {
            dbCategories = ['Hospedaje', 'Hotel', 'Hostal'];
            categoryTitle = 'Hospedaje y Hoteles';
        } else if (categoriaParam.includes('surf') || categoriaParam.includes('escuela')) {
            dbCategories = ['Centro de Surf', 'Escuela de Surf'];
            categoryTitle = 'Escuelas de Surf y Deportes';
        } else if (categoriaParam.includes('tienda') || categoriaParam.includes('shopping') || categoriaParam.includes('compras')) {
            dbCategories = ['Tienda / Shopping'];
            categoryTitle = 'Tiendas y Shopping';
        }

        // Consultar Firestore
        // Evita depender de un índice compuesto para una landing pública. El
        // filtro final preserva la misma regla de publicación y borrado lógico.
        const snapshot = await db.collection('businesses')
            .where('isPublished', '==', true)
            .get();
        const results = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const belongsToLocality = data.locality === officialLocality;
            const isActive = data.isDeleted !== true;
            const belongsToCategory = dbCategories.length === 0 || dbCategories.includes(data.category);
            if (belongsToLocality && isActive && belongsToCategory) {
                results.push({ id: doc.id, ...data });
            }
        });

        // Ordenar destacados primero
        results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

        let baseHtml = await getBaseHtml(baseUrl);

        const title = `${categoryTitle} en ${officialLocality} | MontaPulse`;
        const cleanDescription = `Directorio y guía de los mejores ${categoryTitle.toLowerCase()} en ${officialLocality}, costa de Santa Elena, Ecuador. Información verídica y en tiempo real.`;
        
        // Generar marcado JSON-LD ItemList
        const itemListElement = results.map((biz, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `${baseUrl}/negocio/${biz.slug || biz.id}`,
            "name": biz.name
        }));

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": `Lista de ${categoryTitle} en ${officialLocality}`,
            "description": cleanDescription,
            "itemListElement": itemListElement
        };
        const hubFaq = buildFaqPage([
            {
                question: `¿Dónde encontrar ${categoryTitle.toLowerCase()} en ${officialLocality}?`,
                answer: `Esta guía reúne negocios publicados de ${categoryTitle.toLowerCase()} en ${officialLocality}, Santa Elena, Ecuador, dentro de la Ruta del Spondylus.`
            },
            {
                question: `¿Qué información muestra esta guía de ${officialLocality}?`,
                answer: 'Cada ficha publicada incluye categoría, ubicación, descripción factual y datos de contacto cuando el negocio los ha proporcionado.'
            },
            {
                question: `¿Qué lugares de referencia hay cerca de ${officialLocality}?`,
                answer: `Como referencias locales están ${landmarkText(officialLocality)}.`
            }
        ]);
        const breadcrumb = buildBreadcrumbList([
            { name: 'Ecuador', url: 'https://www.ubicame.info/' },
            { name: 'Santa Elena', url: 'https://www.ubicame.info/' },
            { name: officialLocality, url: `${baseUrl}/localidad/${req.params.pueblo}/${req.params.categoria}` },
            { name: categoryTitle, url: canonicalUrl }
        ]);

        const hubRobots = results.length ? '' : '<meta name="robots" content="noindex, follow" />';
        const metaTags = `
            <title>${title}</title>
            <meta name="description" content="${cleanDescription}" />
            ${hubRobots}
            <link rel="canonical" href="${canonicalUrl}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${cleanDescription}" />
            <meta property="og:image" content="${baseUrl}/favicon.ico" />
            <meta property="og:url" content="${canonicalUrl}" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="${title}" />
            <meta name="twitter:description" content="${cleanDescription}" />
            <script type="application/ld+json">${jsonLdScript(jsonLd)}</script>
            <script type="application/ld+json">${jsonLdScript(hubFaq)}</script>
            <script type="application/ld+json">${jsonLdScript(breadcrumb)}</script>
        `;

        // Payload HTML semántico tipo "Hub" / enciclopédico
        const semanticPayload = `
            <div id="seo-payload-hub">
                <article>
                    <h1>Guía de ${categoryTitle} en ${officialLocality}, Ecuador</h1>
                    <p>${escapeHtml(cleanDescription)}</p>
                    <p>Referencias geográficas de ${escapeHtml(officialLocality)}: ${escapeHtml(landmarkText(officialLocality))}.</p>
                    <section>
                        <h2>Negocios e Instalaciones Recomendadas:</h2>
                        <ol>
                            ${results.map(biz => `
                                <li>
                                    <h3><a href="/negocio/${encodeURIComponent(biz.slug || biz.id)}">${escapeHtml(biz.name)}</a></h3>
                                    <p>Descripción: ${escapeHtml(redactarDescripcionFactual(biz.name, biz.description, biz.sector, biz.category))}</p>
                                    <p>Ubicación: Sector ${escapeHtml(biz.sector || 'Centro')}, ${escapeHtml(officialLocality)}</p>
                                    ${biz.phone ? `<p>Contacto: ${escapeHtml(biz.phone)}</p>` : ''}
                                </li>
                            `).join('')}
                        </ol>
                    </section>
                </article>
            </div>
        `;

        // Limpiar cabeceras de index.html
        baseHtml = baseHtml
            .replace(/<title>.*?<\/title>/is, '')
            .replace(/<meta name="description".*?>/is, '')
            .replace(/<meta property="og:title".*?>/is, '')
            .replace(/<meta property="og:description".*?>/is, '')
            .replace(/<meta property="og:image".*?>/is, '')
            .replace(/<meta property="og:url".*?>/is, '')
            .replace(/<meta property="og:type".*?>/is, '')
            .replace(/<meta name="twitter:.*?".*?>/is, '')
            .replace(/<link rel="canonical".*?>/is, '')
            .replace(/<script type="application\/ld\+json">.*?WebSite.*?<\/script>/is, '')
            .replace('<head>', `<head>\n${metaTags}`)
            ;
        baseHtml = injectRootHtml(baseHtml, semanticPayload);

        if (!results.length) res.set('X-Robots-Tag', 'noindex, follow');
        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO] Error en hub SEO:', error);
        res.status(500).send('Error interno');
    }
});

/**
 * Determina el tipo de Schema.org apropiado según la categoría del negocio.
 */
function determinarSchemaType(category) {
    if (!category) return 'LocalBusiness';
    const cat = category.toLowerCase();
    if (cat.includes('discoteca') || cat.includes('club nocturno')) return 'NightClub';
    if (cat.includes('bar')) return 'BarOrPub';
    if (cat.includes('restaurante') || cat.includes('comida')) return 'Restaurant';
    if (cat.includes('hotel') || cat.includes('hospedaje') || cat.includes('hostal')) return 'Hotel';
    if (cat.includes('surf') || cat.includes('escuela')) return 'SportsActivityLocation';
    if (cat.includes('tour') || cat.includes('operador')) return 'TravelAgency';
    if (cat.includes('tienda') || cat.includes('shopping')) return 'Store';
    if (cat.includes('salud') || cat.includes('hospital')) return 'MedicalBusiness';
    return 'LocalBusiness';
}

/**
 * Mapea las características del negocio al formato de Schema.org amenityFeature.
 */
function mapearAmenidades(features) {
    if (!Array.isArray(features)) return [];
    return features.map(feature => ({
        "@type": "LocationFeatureSpecification",
        "name": feature,
        "value": true
    }));
}

function mapearHorarios(openingHours) {
    if (!openingHours || typeof openingHours !== 'object') return [];
    const days = {
        lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday', miércoles: 'Wednesday', jueves: 'Thursday',
        viernes: 'Friday', sabado: 'Saturday', sábado: 'Saturday', domingo: 'Sunday',
        monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
    };
    return Object.entries(openingHours).flatMap(([day, value]) => {
        if (!value || value.closed || !value.open || !value.close || !days[day.toLowerCase()]) return [];
        return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${days[day.toLowerCase()]}`, opens: value.open, closes: value.close }];
    });
}

/**
 * Redacta una descripción factual optimizada para motores de búsqueda generativa (GEO)
 * eliminando jerga publicitaria y exageraciones.
 */
function redactarDescripcionFactual(name, description, address, category) {
    if (!description) {
        return `${name} es un establecimiento de tipo ${category || 'servicio local'} ubicado en ${address || 'la costa de Santa Elena, Ecuador'}.`;
    }
    
    // Lista de palabras no recomendadas por GEO (fluff / superlativos publicitarios)
    const stopwords = [
        /el mejor/gi, /la mejor/gi, /los mejores/gi, /las mejores/gi,
        /increíble/gi, /espectacular/gi, /sin igual/gi, /único/gi, /única/gi,
        /maravilloso/gi, /excelente/gi, /perfecto/gi, /fabuloso/gi, /mágico/gi,
        /insuperable/gi, /imperdible/gi, /de tus sueños/gi
    ];
    
    let cleanDesc = description;
    stopwords.forEach(regex => {
        cleanDesc = cleanDesc.replace(regex, '');
    });
    
    // Limpieza de espacios extra
    cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();
    
    if (cleanDesc.length < 10) {
        return `${name} es un establecimiento de tipo ${category || 'servicio'} en ${address || 'Santa Elena'}.`;
    }
    
    return cleanDesc;
}

/**
 * Sanitiza y ofusca direcciones de correo electrónico que contengan palabras de desarrollo
 * o patrones específicos para proteger contra scrapers de spam.
 */
function ofuscarEmailSpam(email) {
    if (!email) return '';
    const emailStr = email.toLowerCase().trim();
    
    // Ofuscar si contiene palabras de desarrollo, pruebas o patrones comunes de test
    if (emailStr.includes('pruebasyaprendizaje') || emailStr.includes('test') || emailStr.includes('dev') || emailStr.includes('admin') || emailStr.includes('example')) {
        const [localPart, domain] = emailStr.split('@');
        if (!domain) return '';
        if (localPart.length <= 2) {
            return `${localPart[0] || ''}*@${domain}`;
        }
        return `${localPart.substring(0, 2)}***@${domain}`;
    }
    return email;
}

/**
 * Route: SEO Prerender for Events
 */
app.get('/evento/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        const canonicalUrl = `${baseUrl}/evento/${slug}`;
        
        let event = null;
        const eventsSnapshot = await db.collection('events').where('slug', '==', slug).limit(1).get();
        if (!eventsSnapshot.empty) {
            event = eventsSnapshot.docs[0].data();
        } else {
            const doc = await db.collection('events').doc(slug).get();
            if (doc.exists) event = doc.data();
        }

        // Las URLs antiguas con ID de Firestore consolidan autoridad en el slug.
        if (event?.slug && event.slug !== slug) {
            return res.redirect(301, `/evento/${encodeURIComponent(event.slug)}`);
        }

        let baseHtml = await getBaseHtml(baseUrl);

        if (event) {
            const eventLocality = event.locality || 'Montañita';
            const title = `${event.title || 'Evento'} en ${eventLocality}, Ecuador | Guía MontaPulse`;
            const rawFactual = redactarDescripcionFactual(event.title || 'Evento', event.description, event.sector, event.category);
            const cleanDescription = `${event.title || 'Evento'} se realiza en ${eventLocality}, Santa Elena, Ecuador. ${rawFactual}`;
            const imageUrl = event.imageUrl || (event.images && event.images.length > 0 ? event.images[0] : `${baseUrl}/favicon.ico`);
            
            // Buscar información del local organizador para enlazar las entidades
            let organizerName = 'Establecimiento Local';
            let locationName = event.sector || 'Montañita, Santa Elena, Ecuador';
            if (event.businessId) {
                const bizDoc = await db.collection('businesses').doc(event.businessId).get();
                if (bizDoc.exists) {
                    const bizData = bizDoc.data();
                    organizerName = bizData.name || organizerName;
                    locationName = bizData.name ? `${bizData.name}, ${bizData.address || event.sector}` : locationName;
                }
            }

            // Formatear fechas
            const startDateISO = event.startAt ? (event.startAt.toDate ? event.startAt.toDate().toISOString() : new Date(event.startAt).toISOString()) : new Date().toISOString();
            const endDateISO = event.endAt ? (event.endAt.toDate ? event.endAt.toDate().toISOString() : new Date(event.endAt).toISOString()) : undefined;

            const jsonLd = {
                "@context": "https://schema.org",
                "@type": "Event",
                "name": event.title || 'Evento',
                "description": cleanDescription,
                "startDate": startDateISO,
                "endDate": endDateISO,
                "eventStatus": "https://schema.org/EventScheduled",
                "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                "location": {
                    "@type": "Place",
                    "name": locationName,
                    "address": {
                        "@type": "PostalAddress",
                        "addressLocality": eventLocality,
                        "addressRegion": "Santa Elena",
                        "addressCountry": "EC"
                    },
                    "geo": event.coordinates ? {
                        "@type": "GeoCoordinates",
                        "latitude": event.coordinates[0],
                        "longitude": event.coordinates[1]
                    } : undefined
                },
                "organizer": {
                    "@type": "LocalBusiness",
                    "name": organizerName
                },
                "image": imageUrl,
                "url": canonicalUrl
            };

            const metaTags = `
                <title>${title}</title>
                <meta name="description" content="${cleanDescription}" />
                <link rel="canonical" href="${canonicalUrl}" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${cleanDescription}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="og:url" content="${canonicalUrl}" />
                <meta property="og:type" content="event" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${cleanDescription}" />
                <meta name="twitter:image" content="${imageUrl}" />
                <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
            `;

            // Payload HTML semántico oculto para consumo directo de LLM
            const semanticPayload = `
                <div id="seo-payload">
                    <article>
                        <h1>${event.title || 'Evento'}</h1>
                        <p>Categoría del evento: ${event.category || 'Entretenimiento'}</p>
                        <p>Ambiente/Vibe: ${event.vibe || ''}</p>
                        <p>Fecha de inicio: ${startDateISO}</p>
                        ${endDateISO ? `<p>Fecha de finalización: ${endDateISO}</p>` : ''}
                        <p>Ubicación: ${locationName}, ${eventLocality}, Santa Elena, Ecuador</p>
                        <p>Organizado por: ${organizerName}</p>
                        <p>Descripción factual: ${cleanDescription}</p>
                    </article>
                </div>
            `;

            // Limpiamos los tags de SEO antiguos del index.html para evitar duplicaciones
            baseHtml = baseHtml
                .replace(/<title>.*?<\/title>/is, '')
                .replace(/<meta name="description".*?>/is, '')
                .replace(/<meta property="og:title".*?>/is, '')
                .replace(/<meta property="og:description".*?>/is, '')
                .replace(/<meta property="og:image".*?>/is, '')
                .replace(/<meta property="og:url".*?>/is, '')
                .replace(/<meta property="og:type".*?>/is, '')
                .replace(/<meta name="twitter:.*?".*?>/is, '')
                .replace(/<link rel="canonical".*?>/is, '')
                .replace(/<script type="application\/ld\+json">.*?WebSite.*?<\/script>/is, '')
            .replace('<head>', `<head>\n${metaTags}`);
        baseHtml = injectRootHtml(baseHtml, semanticPayload);
        }

        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO] Error en evento SEO:', error);
        res.status(500).send('Error interno');
    }
});

/**
 * Route: SEO Prerender for Businesses
 */
app.get('/negocio/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        const canonicalUrl = `${baseUrl}/negocio/${slug}`;
        
        let business = null;
        const bizSnapshot = await db.collection('businesses').where('slug', '==', slug).limit(1).get();
        if (!bizSnapshot.empty) {
            business = bizSnapshot.docs[0].data();
        } else {
            const doc = await db.collection('businesses').doc(slug).get();
            if (doc.exists) business = doc.data();
        }

        // Mantiene una única URL canónica aunque se visite un ID antiguo.
        if (business?.slug && business.slug !== slug) {
            return res.redirect(301, `/negocio/${encodeURIComponent(business.slug)}`);
        }

        let baseHtml = await getBaseHtml(baseUrl);

        if (business) {
            const name = business.name || 'Negocio en MontaPulse';
            const bizLocality = business.locality || 'Montañita';
            const title = `${name} en ${bizLocality}, Ecuador | Guía MontaPulse`;
            const rawFactual = redactarDescripcionFactual(name, business.description, business.sector, business.category);
            const cleanDescription = `${name} es un establecimiento ubicado en ${bizLocality}, Santa Elena, Ecuador. ${rawFactual}`;
            const imageUrl = business.imageUrl || (business.images && business.images.length > 0 ? business.images[0] : `${baseUrl}/favicon.ico`);
            const phone = business.phone || business.whatsapp || '';
            
            // Determinar coordenadas geográficas
            let geoCoordinates = undefined;
            if (business.coordinates && Array.isArray(business.coordinates)) {
                geoCoordinates = {
                    "@type": "GeoCoordinates",
                    "latitude": business.coordinates[0],
                    "longitude": business.coordinates[1]
                };
            } else if (business.location && business.location.lat && business.location.lng) {
                geoCoordinates = {
                    "@type": "GeoCoordinates",
                    "latitude": business.location.lat,
                    "longitude": business.location.lng
                };
            }

            const schemaType = determinarSchemaType(business.category);

            const jsonLd = {
                "@context": "https://schema.org",
                "@type": schemaType,
                "name": name,
                "description": cleanDescription,
                "url": canonicalUrl,
                "image": imageUrl,
                "telephone": phone,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": business.sector || 'Calle Principal',
                    "addressLocality": bizLocality,
                    "addressRegion": "Santa Elena",
                    "addressCountry": "EC"
                },
                "geo": geoCoordinates,
                "priceRange": business.priceRange || "$$",
                "amenityFeature": mapearAmenidades(business.services || business.emblematicServices),
                "openingHoursSpecification": mapearHorarios(business.openingHours),
                "paymentAccepted": Array.isArray(business.paymentMethods) ? business.paymentMethods.join(', ') : undefined,
                "currenciesAccepted": business.priceCurrency || 'USD',
                "hasMenu": business.menuUrl || undefined
            };
            const services = Array.isArray(business.services) ? business.services : (Array.isArray(business.emblematicServices) ? business.emblematicServices : []);
            const serviceText = services.length ? services.join(', ') : 'Los servicios publicados se muestran en esta ficha cuando el negocio los registra.';
            const locationReference = `${business.sector || 'el área central'} de ${bizLocality}, cerca de ${landmarkText(bizLocality)}`;
            const defaultFaqs = [
                {
                    question: `¿Dónde está ubicado ${name} en ${bizLocality}?`,
                    answer: `${name} está en ${locationReference}, Santa Elena, Ecuador.${geoCoordinates ? ' La ficha incluye coordenadas geográficas.' : ''}`
                },
                {
                    question: `¿Qué servicios ofrece ${name}?`,
                    answer: `${name} publica los siguientes servicios o comodidades: ${serviceText}.`
                },
                {
                    question: `¿Cómo contactar a ${name}?`,
                    answer: phone ? `Puedes contactar a ${name} por ${phone}.` : `Esta ficha no tiene un teléfono público registrado; consulta sus canales enlazados o vuelve a revisar la información actualizada.`
                }
            ];
            const customFaqs = Array.isArray(business.customFaqs)
                ? business.customFaqs.filter(faq => faq?.question && faq?.answer).slice(0, 2)
                : [];
            const businessFaq = buildFaqPage([...defaultFaqs, ...customFaqs]);
            const breadcrumb = buildBreadcrumbList([
                { name: 'Ecuador', url: 'https://www.ubicame.info/' },
                { name: 'Santa Elena', url: 'https://www.ubicame.info/' },
                { name: bizLocality, url: `${baseUrl}/explore?locality=${encodeURIComponent(bizLocality)}` },
                { name, url: canonicalUrl }
            ]);

            const metaTags = `
                <title>${title}</title>
                <meta name="description" content="${cleanDescription}" />
                <link rel="canonical" href="${canonicalUrl}" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${cleanDescription}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="og:url" content="${canonicalUrl}" />
                <meta property="og:type" content="business.business" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${cleanDescription}" />
                <meta name="twitter:image" content="${imageUrl}" />
                <script type="application/ld+json">${jsonLdScript(jsonLd)}</script>
                <script type="application/ld+json">${jsonLdScript(businessFaq)}</script>
                <script type="application/ld+json">${jsonLdScript(breadcrumb)}</script>
            `;

            // Payload HTML semántico oculto para consumo directo de LLM
            const semanticPayload = `
                <div id="seo-payload">
                    <article>
                        <h1>${escapeHtml(name)}</h1>
                        <p>Categoría comercial: ${escapeHtml(business.category || '')}</p>
                        <p>Sector geográfico: ${escapeHtml(business.sector || '')}, ${escapeHtml(bizLocality)}, Santa Elena, Ecuador</p>
                        <p>Referencia local: cerca de ${escapeHtml(landmarkText(bizLocality))}.</p>
                        <p>Descripción factual: ${escapeHtml(cleanDescription)}</p>
                        ${phone ? `<p>Número de contacto: ${escapeHtml(phone)}</p>` : ''}
                        ${business.email ? `<p>Correo electrónico: ${escapeHtml(ofuscarEmailSpam(business.email))}</p>` : ''}
                        ${business.instagram ? `<p>Instagram oficial: <a href="https://instagram.com/${encodeURIComponent(business.instagram.replace('@', ''))}">@${escapeHtml(business.instagram.replace('@', ''))}</a></p>` : ''}
                        <ul>
                            ${services.map(serv => `<li>Servicio/Amenidad: ${escapeHtml(serv)}</li>`).join('')}
                        </ul>
                    </article>
                </div>
            `;

            // Limpiamos los tags de SEO antiguos del index.html para evitar duplicaciones
            baseHtml = baseHtml
                .replace(/<title>.*?<\/title>/is, '')
                .replace(/<meta name="description".*?>/is, '')
                .replace(/<meta property="og:title".*?>/is, '')
                .replace(/<meta property="og:description".*?>/is, '')
                .replace(/<meta property="og:image".*?>/is, '')
                .replace(/<meta property="og:url".*?>/is, '')
                .replace(/<meta property="og:type".*?>/is, '')
                .replace(/<meta name="twitter:.*?".*?>/is, '')
                .replace(/<link rel="canonical".*?>/is, '')
                .replace(/<script type="application\/ld\+json">.*?WebSite.*?<\/script>/is, '')
            .replace('<head>', `<head>\n${metaTags}`);
        baseHtml = injectRootHtml(baseHtml, semanticPayload);
// =========================================================================
// SEGURIDAD Y PROTECCIÓN DE ENDPOINTS - FASE 1 (MontaPulse / ubicame.info)
// =========================================================================

const CONTROLLED_PLANS = {
    'Pro': { name: 'Plan Pulse Pro', price: 5.00, currency: 'USD' },
    'Elite': { name: 'Plan Pulse Elite', price: 10.00, currency: 'USD' }
};
const MENU_ADDON_PRICE = 5.00;

// Rate limiting per User UID / IP
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

function rateLimitMiddleware(prefix, maxRequests, windowMs) {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip || 'unknown';
        const key = `${prefix}:${req.user?.uid || ip}`;
        if (!checkRateLimit(key, maxRequests, windowMs)) {
            return res.status(429).json({ 
                success: false, 
                message: 'Límite de peticiones excedido. Por favor intenta más tarde.' 
            });
        }
        next();
    };
}

// Firebase ID Token Verification Middleware
async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado: Se requiere token de autenticación Bearer.' 
        });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (authErr) {
        logger.warn('[Auth Middleware] Token de autenticación inválido o expirado:', authErr.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Token de autenticación expirado o inválido.' 
        });
    }
}

// App Check verification middleware (optional / non-blocking unless enforced)
async function optionalAppCheck(req, res, next) {
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (appCheckToken) {
        try {
            await admin.appCheck().verifyToken(appCheckToken);
        } catch (err) {
            logger.warn('[App Check] App Check verification failed:', err.message);
            if (process.env.ENFORCE_APP_CHECK === 'true') {
                return res.status(401).json({ success: false, message: 'App Check verification failed.' });
            }
        }
    }
    next();
}

// Dominios permitidos para redirecciones y callbacks de checkout
const ALLOWED_ORIGINS = [
    'https://www.ubicame.info',
    'https://ubicame.info',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];

function getSafeOrigin(req) {
    const originHeader = req.get('origin');
    if (originHeader && ALLOWED_ORIGINS.includes(originHeader)) {
        return originHeader;
    }
    return 'https://www.ubicame.info';
}

// Helper para verificar autenticidad del webhook de dLocal Go
function verifyWebhookSignature(req) {
    const expectedSecret = process.env.DLOCAL_WEBHOOK_SECRET;
    if (!expectedSecret) {
        logger.error('[Webhook dLocal] DLOCAL_WEBHOOK_SECRET no configurado en el servidor.');
        return false;
    }
    const authHeader = req.headers['authorization'] || req.headers['x-signature'] || req.headers['x-webhook-secret'];
    if (!authHeader) return false;
    
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7).trim() 
        : String(authHeader).trim();

    try {
        const tokenBuf = Buffer.from(token);
        const expectedBuf = Buffer.from(expectedSecret);
        if (tokenBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(tokenBuf, expectedBuf);
    } catch (e) {
        return false;
    }
}

// Middleware para verificar permisos de Administrador
async function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado.' });
    }
    if (req.user.admin === true) {
        return next();
    }
    try {
        const userDoc = await db.collection('users_v2').doc(req.user.uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'admin') {
            return next();
        }
    } catch (e) {
        logger.warn('[Admin Check] Error verifying admin role:', e.message);
    }
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requieren permisos de administrador.' });
}

/**
 * Route: Create Checkout
 * Description: Validates auth, calculates canonical pricing server-side, creates internal payment order, and calls dLocal Go.
 */
app.post('/api/create-checkout', authenticateUser, optionalAppCheck, rateLimitMiddleware('checkout', 10, 60000), async (req, res) => {
    try {
        const { planId, businessId } = req.body;
        const origin = getSafeOrigin(req);
        const userId = req.user.uid;
        const userEmail = req.user.email || '';

        const controlledPlan = CONTROLLED_PLANS[planId];
        if (!controlledPlan) {
            return res.status(400).json({ 
                success: false, 
                message: `Plan no válido o no disponible para compra directa: ${planId}` 
            });
        }

        // Si se asocia a un negocio, validar que el usuario autenticado sea el dueño o admin
        if (businessId) {
            const bizDoc = await db.collection('businesses').doc(businessId).get();
            if (!bizDoc.exists) {
                return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
            }
            const bizData = bizDoc.data();
            if (bizData.ownerId !== userId && req.user.admin !== true) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permisos de propietario sobre este negocio.' 
                });
            }
        }

        // Crear orden interna en servidor vinculada al usuario y negocio
        const orderRef = db.collection('payment_orders').doc();
        const orderId = orderRef.id;

        await orderRef.set({
            orderId,
            userId,
            userEmail,
            businessId: businessId || null,
            type: 'subscription',
            planId,
            amount: controlledPlan.price,
            currency: controlledPlan.currency,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Llamar a la pasarela dLocal Go
        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';
        const apiKey = process.env.DLOCAL_GO_API_KEY;
        const secretKey = process.env.DLOCAL_GO_SECRET_KEY;

        if (!apiKey || !secretKey) {
            logger.error('[dLocal Go] Credenciales de API no configuradas en el servidor.');
            return res.status(500).json({ 
                success: false, 
                message: 'Servicio de pagos temporalmente no disponible.' 
            });
        }

        const response = await axios.post(DLOCAL_GO_URL, {
            amount: controlledPlan.price,
            currency: controlledPlan.currency,
            country: 'EC',
            description: `${controlledPlan.name} - ${userEmail || userId}`,
            success_url: `${origin}/plans?status=success&orderId=${orderId}`,
            back_url: `${origin}/plans`,
            notification_url: `${origin}/api/webhook/dlocal?orderId=${orderId}`
        }, {
            auth: {
                username: apiKey,
                password: secretKey
            },
            timeout: 10000
        });

        if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
            const checkoutUrl = response.data.checkout_url || response.data.redirect_url;
            return res.json({
                success: true,
                orderId,
                checkout_url: checkoutUrl
            });
        }

        throw new Error('Respuesta de pasarela incompleta');
    } catch (err) {
        logger.error('[dLocal Go] Error al procesar checkout:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: 'Error al comunicarse con la pasarela de pagos.'
        });
    }
});

/**
 * Route: Create Menu Addon Checkout Session ($5 USD/month)
 */
app.post('/api/menu-addon/checkout', authenticateUser, optionalAppCheck, rateLimitMiddleware('menu_addon', 10, 60000), async (req, res) => {
    try {
        const { businessId } = req.body;
        const origin = getSafeOrigin(req);
        const userId = req.user.uid;
        const userEmail = req.user.email || '';

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'businessId es requerido.' });
        }

        const bizDoc = await db.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
        const bizData = bizDoc.data();
        if (bizData.ownerId !== userId && req.user.admin !== true) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos de propietario sobre este negocio.' 
            });
        }

        const orderRef = db.collection('payment_orders').doc();
        const orderId = orderRef.id;

        await orderRef.set({
            orderId,
            userId,
            userEmail,
            businessId,
            type: 'menu_addon',
            amount: MENU_ADDON_PRICE,
            currency: 'USD',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';
        const apiKey = process.env.DLOCAL_GO_API_KEY;
        const secretKey = process.env.DLOCAL_GO_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Servicio de pagos temporalmente no disponible.' 
            });
        }

        const response = await axios.post(DLOCAL_GO_URL, {
            amount: MENU_ADDON_PRICE,
            currency: 'USD',
            country: 'EC',
            description: 'Activar Menú Digital QR - ubicame.info',
            success_url: `${origin}/passport?menu_addon_status=success&orderId=${orderId}`,
            back_url: `${origin}/passport`,
            notification_url: `${origin}/api/webhook/dlocal?orderId=${orderId}`
        }, {
            auth: {
                username: apiKey,
                password: secretKey
            },
            timeout: 10000
        });

        if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
            return res.json({
                success: true,
                orderId,
                checkout_url: response.data.checkout_url || response.data.redirect_url
            });
        }

        throw new Error('Respuesta de pasarela incompleta');
    } catch (err) {
        logger.error('[Menu Addon] Error:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: 'Error al comunicarse con la pasarela de pagos.'
        });
    }
});

/**
 * Route: Atomic RSVP toggle
 */
app.post('/api/events/:eventId/rsvp', authenticateUser, optionalAppCheck, rateLimitMiddleware('rsvp', 30, 60000), async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.uid;

        if (!eventId) {
            return res.status(400).json({ success: false, message: 'eventId es requerido.' });
        }

        const eventRef = db.collection('events').doc(eventId);
        const rsvpDocId = `${eventId}_${userId}`;
        const rsvpRef = db.collection('rsvps').doc(rsvpDocId);

        const result = await db.runTransaction(async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists) {
                throw new Error('EVENT_NOT_FOUND');
            }

            const eventData = eventSnap.data();
            const currentCount = eventData.interestedCount || 0;

            const rsvpSnap = await transaction.get(rsvpRef);

            if (rsvpSnap.exists) {
                transaction.delete(rsvpRef);
                const newCount = Math.max(0, currentCount - 1);
                transaction.update(eventRef, {
                    interestedCount: newCount
                });
                return { rsvp: false, interestedCount: newCount };
            } else {
                transaction.set(rsvpRef, {
                    userId,
                    eventId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                const newCount = currentCount + 1;
                transaction.update(eventRef, {
                    interestedCount: newCount
                });
                return { rsvp: true, interestedCount: newCount };
            }
        });

        return res.json({
            success: true,
            rsvp: result.rsvp,
            interestedCount: result.interestedCount
        });
    } catch (err) {
        if (err.message === 'EVENT_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
        }
        logger.error('[RSVP API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error procesando RSVP.' });
    }
});

/**
 * Helper & Routes: Secure Coupon Redemption
 */
async function handleRedeemCoupon(req, res) {
    try {
        const couponIdParam = req.params?.couponId;
        const { reservationCode, businessId } = req.body;
        const hostUid = req.user.uid;

        if (!reservationCode || typeof reservationCode !== 'string') {
            return res.status(400).json({ success: false, message: 'reservationCode es requerido.' });
        }

        const cleanCode = reservationCode.trim().toUpperCase();

        let q = db.collection('couponRedemptions')
            .where('reservationCode', '==', cleanCode)
            .where('status', '==', 'reserved');

        if (businessId) {
            q = q.where('businessId', '==', businessId);
        }

        const snap = await q.get();
        if (snap.empty) {
            return res.status(404).json({ 
                success: false, 
                message: 'Código inválido, ya usado o no pertenece a este negocio.' 
            });
        }

        const redemptionDoc = snap.docs[0];
        const redemptionData = redemptionDoc.data();
        const targetCouponId = couponIdParam || redemptionData.couponId;

        // Verificar expiración
        const now = new Date();
        const expiresAt = redemptionData.expiresAt ? (redemptionData.expiresAt.toDate ? redemptionData.expiresAt.toDate() : new Date(redemptionData.expiresAt)) : null;
        if (expiresAt && expiresAt < now) {
            await redemptionDoc.ref.update({ status: 'expired' });
            return res.status(400).json({ success: false, message: 'Este cupón ha expirado.' });
        }

        // Validar autorización del negocio: el usuario autenticado debe ser dueño del negocio o admin
        const bizDoc = await db.collection('businesses').doc(redemptionData.businessId).get();
        if (!bizDoc.exists) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
        const bizData = bizDoc.data();
        const isOwner = (bizData.ownerId === hostUid);
        const isAdminClaim = (req.user.admin === true);

        if (!isOwner && !isAdminClaim) {
            const userDoc = await db.collection('users_v2').doc(hostUid).get();
            const isAdminRole = userDoc.exists && userDoc.data()?.role === 'admin';
            if (!isAdminRole) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No estás autorizado para validar cupones de este negocio.' 
                });
            }
        }

        // Transacción atómica: Incrementar currentUses y marcar redeemed
        const couponRef = db.collection('coupons').doc(targetCouponId);
        const result = await db.runTransaction(async (transaction) => {
            const couponSnap = await transaction.get(couponRef);
            if (!couponSnap.exists) {
                throw new Error('COUPON_NOT_FOUND');
            }
            const couponData = couponSnap.data();
            if (couponData.maxUses > 0 && (couponData.currentUses || 0) >= couponData.maxUses) {
                throw new Error('COUPON_EXHAUSTED');
            }

            const currentRedemptionSnap = await transaction.get(redemptionDoc.ref);
            if (currentRedemptionSnap.data().status !== 'reserved') {
                throw new Error('ALREADY_REDEEMED');
            }

            transaction.update(couponRef, {
                currentUses: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            transaction.update(redemptionDoc.ref, {
                status: 'redeemed',
                redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
                validatedBy: hostUid
            });

            return {
                couponData: { ...couponData, currentUses: (couponData.currentUses || 0) + 1 },
                redemptionData: { ...redemptionData, status: 'redeemed', validatedBy: hostUid }
            };
        });

        return res.json({
            success: true,
            redemptionData: result.redemptionData,
            couponData: result.couponData
        });
    } catch (err) {
        if (err.message === 'COUPON_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Cupón no encontrado.' });
        }
        if (err.message === 'COUPON_EXHAUSTED') {
            return res.status(400).json({ success: false, message: 'Este cupón ha alcanzado su límite de usos.' });
        }
        if (err.message === 'ALREADY_REDEEMED') {
            return res.status(400).json({ success: false, message: 'Este código ya ha sido canjeado.' });
        }
        logger.error('[Coupon Redeem API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error al canjear cupón.' });
    }
}

app.post('/api/coupons/:couponId/redeem', authenticateUser, optionalAppCheck, rateLimitMiddleware('coupon_redeem', 20, 60000), handleRedeemCoupon);
app.post('/api/coupons/redeem', authenticateUser, optionalAppCheck, rateLimitMiddleware('coupon_redeem', 20, 60000), handleRedeemCoupon);

/**
 * Route: Award Points (Fixed amounts for legitimate actions, rate-limited and audited)
 */
app.post('/api/points/award', authenticateUser, optionalAppCheck, rateLimitMiddleware('points_award', 30, 60000), async (req, res) => {
    try {
        const { action, targetId } = req.body;
        const callerUid = req.user.uid;

        if (!action || !targetId) {
            return res.status(400).json({ success: false, message: 'action y targetId requeridos.' });
        }

        if (action === 'like_post') {
            const postDoc = await db.collection('posts').doc(targetId).get();
            if (!postDoc.exists) {
                return res.status(404).json({ success: false, message: 'Post no encontrado.' });
            }
            const post = postDoc.data();
            const recipientUid = post.authorId;

            if (!recipientUid || recipientUid === callerUid) {
                return res.json({ success: true, awarded: 0, reason: 'self_like' });
            }

            const txId = `like_${targetId}_${callerUid}`;
            const txRef = db.collection('point_transactions').doc(txId);
            const userRef = db.collection('users_v2').doc(recipientUid);

            const awarded = await db.runTransaction(async (t) => {
                const txSnap = await t.get(txRef);
                if (txSnap.exists) {
                    return 0;
                }
                t.set(txRef, {
                    txId,
                    userId: recipientUid,
                    fromUser: callerUid,
                    action: 'like_post',
                    targetId,
                    amount: 2,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                t.set(userRef, {
                    points: admin.firestore.FieldValue.increment(2),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                return 2;
            });

            return res.json({ success: true, awarded });
        } else if (action === 'comment_post') {
            const postDoc = await db.collection('posts').doc(targetId).get();
            if (!postDoc.exists) {
                return res.status(404).json({ success: false, message: 'Post no encontrado.' });
            }

            const txRef = db.collection('point_transactions').doc();
            const userRef = db.collection('users_v2').doc(callerUid);

            await db.runTransaction(async (t) => {
                t.set(txRef, {
                    userId: callerUid,
                    action: 'comment_post',
                    targetId,
                    amount: 2,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                t.set(userRef, {
                    points: admin.firestore.FieldValue.increment(2),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });

            return res.json({ success: true, awarded: 2 });
        } else {
            return res.status(400).json({ success: false, message: 'Acción de puntos no reconocida.' });
        }
    } catch (err) {
        logger.error('[Points Award API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error procesando puntos.' });
    }
});

/**
 * Route: Purchase Boost with Points (Server-enforced price of 300 points)
 */
app.post('/api/points/boost', authenticateUser, optionalAppCheck, rateLimitMiddleware('points_boost', 10, 60000), async (req, res) => {
    try {
        const { businessId, durationHours = 24 } = req.body;
        const userId = req.user.uid;
        const BOOST_COST = 300;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'businessId es requerido.' });
        }

        const bizDoc = await db.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
        const bizData = bizDoc.data();
        if (bizData.ownerId !== userId && req.user.admin !== true) {
            return res.status(403).json({ success: false, message: 'No eres el propietario de este negocio.' });
        }

        const userRef = db.collection('users_v2').doc(userId);
        const boostRef = db.collection('boosts').doc();
        const txRef = db.collection('point_transactions').doc();

        await db.runTransaction(async (t) => {
            const userSnap = await t.get(userRef);
            const currentPoints = (userSnap.exists ? userSnap.data().points : 0) || 0;

            if (currentPoints < BOOST_COST) {
                throw new Error('INSUFFICIENT_POINTS');
            }

            const now = Date.now();
            const expiresAt = now + (Number(durationHours) * 60 * 60 * 1000);

            t.update(userRef, {
                points: admin.firestore.FieldValue.increment(-BOOST_COST),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            t.set(boostRef, {
                businessId,
                userId,
                points: BOOST_COST,
                durationHours: Number(durationHours),
                active: true,
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(expiresAt)
            });

            t.set(txRef, {
                userId,
                businessId,
                action: 'purchase_boost',
                amount: -BOOST_COST,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return res.json({ success: true, message: 'Boost activado con éxito.' });
    } catch (err) {
        if (err.message === 'INSUFFICIENT_POINTS') {
            return res.status(400).json({ success: false, message: 'Puntos insuficientes para activar el boost.' });
        }
        logger.error('[Points Boost API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error al procesar el boost.' });
    }
});

/**
 * Route: Admin Points Adjustment
 */
app.post('/api/admin/points', authenticateUser, requireAdmin, optionalAppCheck, async (req, res) => {
    try {
        const { targetUserId, amount, reason } = req.body;
        const adminId = req.user.uid;

        if (!targetUserId || typeof amount !== 'number' || isNaN(amount)) {
            return res.status(400).json({ success: false, message: 'targetUserId y amount numérico requeridos.' });
        }

        const userRef = db.collection('users_v2').doc(targetUserId);
        const txRef = db.collection('point_transactions').doc();

        await db.runTransaction(async (t) => {
            const userSnap = await t.get(userRef);
            if (!userSnap.exists) {
                throw new Error('USER_NOT_FOUND');
            }

            t.set(userRef, {
                points: admin.firestore.FieldValue.increment(amount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            t.set(txRef, {
                userId: targetUserId,
                adminId,
                action: 'admin_adjustment',
                amount,
                reason: String(reason || 'Ajuste manual de administrador').slice(0, 500),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return res.json({ success: true, message: 'Puntos actualizados con éxito.' });
    } catch (err) {
        if (err.message === 'USER_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        logger.error('[Admin Points API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error ajustando puntos.' });
    }
});

/**
 * Route: Admin Toggle Pulse Pass
 */
app.post('/api/pulse-pass/toggle', authenticateUser, requireAdmin, optionalAppCheck, async (req, res) => {
    try {
        const { targetUserId, active } = req.body;
        if (!targetUserId || typeof active !== 'boolean') {
            return res.status(400).json({ success: false, message: 'targetUserId y active (booleano) requeridos.' });
        }

        const userRef = db.collection('users_v2').doc(targetUserId);
        await userRef.set({
            pulsePassActive: active,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.json({ success: true });
    } catch (err) {
        logger.error('[Toggle PulsePass API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error actualizando Pulse Pass.' });
    }
});

/**
 * Route: AI Proxy for OpenRouter
 */
app.post('/api/ai/openrouter', authenticateUser, optionalAppCheck, rateLimitMiddleware('ai_openrouter', 30, 60000), async (req, res) => {
    try {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({ success: false, message: 'Servicio de IA no configurado en el servidor.' });
        }

        const { messages, model, jsonMode, stream } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, message: 'Parámetro messages inválido.' });
        }

        // Sanitización y límite razonable de longitud
        const safeMessages = messages.slice(-10).map(m => ({
            role: m.role === 'system' ? 'system' : (m.role === 'assistant' ? 'assistant' : 'user'),
            content: String(m.content || '').slice(0, 4000)
        }));

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model || 'google/gemini-2.5-flash',
            messages: safeMessages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: stream || false,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://www.ubicame.info',
                'X-Title': 'MontaPulse',
            },
            responseType: stream ? 'stream' : 'json',
            timeout: 25000
        });

        if (stream) {
            response.data.pipe(res);
        } else {
            res.json(response.data);
        }
    } catch (err) {
        logger.error('[AI Proxy] OpenRouter Error:', err.message);
        res.status(500).json({ success: false, message: 'No se pudo procesar la solicitud con IA.' });
    }
});

/**
 * Route: AI Proxy for Gemini
 */
app.post('/api/ai/gemini', authenticateUser, optionalAppCheck, rateLimitMiddleware('ai_gemini', 30, 60000), async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: 'Servicio de IA no configurado en el servidor.' });
        }

        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ success: false, message: 'Prompt requerido.' });
        }

        const safePrompt = prompt.slice(0, 4000);

        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: safePrompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 25000
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ text });
    } catch (err) {
        logger.error('[AI Proxy] Gemini Error:', err.message);
        res.status(500).json({ success: false, message: 'No se pudo procesar la solicitud con IA.' });
    }
});

/**
 * Route: Send Email with Resend (Hardened: Admin Only & Server-Controlled Sender)
 */
app.post('/api/send-email', authenticateUser, requireAdmin, optionalAppCheck, rateLimitMiddleware('send_email', 10, 600000), async (req, res) => {
    const { to, subject, html, text } = req.body;

    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            logger.error('[Resend] RESEND_API_KEY no configurado.');
            return res.status(500).json({ success: false, message: 'Servicio de correo no configurado.' });
        }

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos: to, subject, y html o text.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to) || to.length > 100) {
            return res.status(400).json({ success: false, message: 'Dirección de correo no válida.' });
        }

        const resendInstance = new Resend(apiKey);
        const serverFrom = process.env.RESEND_FROM_EMAIL || 'MontaPulse <onboarding@resend.dev>';
        
        const data = await resendInstance.emails.send({
            from: serverFrom,
            to,
            subject: String(subject).slice(0, 200),
            html: html ? String(html).slice(0, 50000) : text,
            text: text ? String(text).slice(0, 50000) : html
        });

        if (data.error) {
            logger.error('[Resend] Error devuelto por la API:', data.error);
            return res.status(400).json({ success: false, message: 'Error al enviar el correo.' });
        }

        return res.json({ success: true });
    } catch (error) {
        logger.error('[Resend] Error crítico:', error.message);
        return res.status(500).json({ success: false, message: 'Error interno al enviar correo.' });
    }
});

/**
 * Route: Admin cleanup tool to recalibrate view counts.
 * Security: Requires Firebase Admin authentication or secret from environment variable.
 */
app.get('/api/admin/cleanup-views', async (req, res) => {
    const adminSecretHeader = req.headers['x-admin-secret'];
    const expectedSecret = process.env.ADMIN_CLEANUP_SECRET;
    let isAuthorized = false;

    if (expectedSecret && adminSecretHeader === expectedSecret) {
        isAuthorized = true;
    } else {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split('Bearer ')[1].trim();
                const decoded = await admin.auth().verifyIdToken(token);
                if (decoded.admin === true) {
                    isAuthorized = true;
                } else {
                    const userDoc = await db.collection('users_v2').doc(decoded.uid).get();
                    if (userDoc.exists && userDoc.data()?.role === 'admin') {
                        isAuthorized = true;
                    }
                }
            } catch (e) {
                logger.warn('[Cleanup API] Token inválido:', e.message);
            }
        }
    }

    if (!isAuthorized) {
        return res.status(401).json({ success: false, message: 'No autorizado. Se requieren credenciales de administrador.' });
    }

    try {
        logger.info('[Cleanup API] Iniciando limpieza de visitas...');
        const businessesRef = db.collection('businesses');
        const snapshot = await businessesRef.get();
        
        if (snapshot.empty) {
            return res.send('No se encontraron negocios.');
        }

        let totalReviewed = 0;
        let totalUpdated = 0;
        let batch = db.batch();
        let batchCount = 0;
        const details = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const viewCount = data.viewCount || 0;
            const clickCount = data.clickCount || 0;
            const monthlyViews = data.monthlyViews || 0;

            totalReviewed++;

            if (viewCount > 5000) {
                let newViews = clickCount > 0 ? clickCount * 15 : 120;
                let newMonthlyViews = Math.min(newViews, monthlyViews > 0 && monthlyViews < 5000 ? monthlyViews : 120);

                details.push({
                    name: data.name,
                    id: doc.id,
                    oldViews: viewCount,
                    newViews,
                    clicks: clickCount
                });

                batch.update(doc.ref, {
                    viewCount: newViews,
                    monthlyViews: newMonthlyViews,
                    lastViewCleanupDate: admin.firestore.FieldValue.serverTimestamp(),
                    isRecalibrated: true
                });

                batchCount++;
                totalUpdated++;

                if (batchCount === 400) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        logger.info(`[Cleanup API] Proceso completado. Corregidos: ${totalUpdated}`);
        return res.json({
            success: true,
            totalReviewed,
            totalUpdated,
            updatedBusinesses: details
        });
    } catch (error) {
        logger.error('[Cleanup API] Error crítico:', error);
        return res.status(500).json({ success: false, message: 'Error interno en limpieza de métricas.' });
    }
});

/**
 * Route: Register Business Visit (Anti-spam / Bot Filtering / Unique IPs)
 */
app.post('/api/business/visit', rateLimitMiddleware('visit', 60, 60000), async (req, res) => {
    const { businessId } = req.body;
    let userIp = req.body.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    if (!businessId) {
        return res.status(400).json({ success: false, message: 'Falta businessId en el cuerpo.' });
    }

    try {
        if (typeof userIp === 'string') {
            userIp = userIp.split(',')[0].trim();
        } else {
            userIp = 'unknown';
        }

        const userAgent = req.headers['user-agent'] || '';
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|headless/i.test(userAgent);
        if (isBot) {
            logger.info(`[Visit API] Ignored bot request for business: ${businessId}`);
            return res.json({ success: true, incremented: false, message: 'Bots are not counted.' });
        }

        const sanitizedIp = userIp.replace(/[^a-zA-Z0-9]/g, '_');
        const docId = `${businessId}_${sanitizedIp}`;
        const visitRef = db.collection('registro_visitas').doc(docId);
        
        const visitSnap = await visitRef.get();
        const now = new Date();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (visitSnap.exists) {
            const data = visitSnap.data();
            const lastVisit = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(0);
            if (now.getTime() - lastVisit.getTime() < TWENTY_FOUR_HOURS) {
                return res.json({ success: true, incremented: false, message: 'Visita ya registrada en las últimas 24 horas.' });
            }
        }

        await visitRef.set({
            businessId,
            ip: userIp,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        const bizRef = db.collection('businesses').doc(businessId);
        const bizSnap = await bizRef.get();

        if (bizSnap.exists) {
            const data = bizSnap.data();
            let shouldReset = false;

            if (data.lastMonthlyResetDate) {
                const lastReset = data.lastMonthlyResetDate.toDate ? data.lastMonthlyResetDate.toDate() : new Date(data.lastMonthlyResetDate);
                if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                    shouldReset = true;
                }
            } else {
                shouldReset = true;
            }

            const updateData = {
                viewCount: admin.firestore.FieldValue.increment(1)
            };

            if (shouldReset) {
                updateData.monthlyViews = 1;
                updateData.lastMonthlyResetDate = admin.firestore.FieldValue.serverTimestamp();
            } else {
                updateData.monthlyViews = admin.firestore.FieldValue.increment(1);
            }

            await bizRef.update(updateData);
            return res.json({ success: true, incremented: true });
        } else {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
    } catch (error) {
        logger.error('[Visit API] Error registering visit:', error);
        return res.status(500).json({ success: false, message: 'Error registrando visita.' });
    }
});

/**
 * Route: dLocal Go Webhook
 * Verified via signature secret, linked to internal order, and idempotent.
 */
app.post('/api/webhook/dlocal', async (req, res) => {
    try {
        if (!verifyWebhookSignature(req)) {
            logger.warn('[Webhook dLocal] Intento de acceso con firma o token inválido.');
            return res.status(401).json({ success: false, message: 'Firma de Webhook no válida.' });
        }

        const { status } = req.body;
        const orderId = req.query.orderId || req.body.orderId || req.body.order_id;

        if (!orderId) {
            logger.warn('[Webhook dLocal] Petición webhook recibida sin orderId.');
            return res.status(400).json({ success: false, message: 'Falta orderId.' });
        }

        const orderRef = db.collection('payment_orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            logger.warn(`[Webhook dLocal] Orden no encontrada: ${orderId}`);
            return res.status(404).json({ success: false, message: 'Orden de pago no encontrada.' });
        }

        const orderData = orderSnap.data();

        // IDEMPOTENCIA: Si la orden ya fue procesada exitosamente como PAID, responder 200 sin reprocesar
        if (orderData.status === 'PAID') {
            logger.info(`[Webhook dLocal] Orden ${orderId} ya fue procesada previamente (Idempotencia).`);
            return res.status(200).send('OK');
        }

        if (status === 'PAID') {
            const batch = db.batch();
            const now = new Date();
            const expires = new Date();
            expires.setDate(now.getDate() + 30);

            // 1. Actualizar orden interna
            batch.update(orderRef, {
                status: 'PAID',
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                dlocalPayload: req.body
            });

            // 2. Si es suscripción de usuario
            if (orderData.type === 'subscription' && orderData.userId && orderData.planId) {
                const userRef = db.collection('users_v2').doc(orderData.userId);
                batch.set(userRef, {
                    plan: orderData.planId,
                    pulsePassActive: true,
                    subscriptionEndDate: expires.getTime(),
                    paymentStatus: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Si está asociado a un negocio, actualizar el plan del negocio
                if (orderData.businessId) {
                    const bizRef = db.collection('businesses').doc(orderData.businessId);
                    batch.set(bizRef, {
                        plan: orderData.planId,
                        paymentStatus: 'active',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                // Recompensa por referido (idempotente: solo si no fue otorgada antes)
                if (orderData.businessId && !orderData.referralRewardGranted) {
                    const bizDoc = await db.collection('businesses').doc(orderData.businessId).get();
                    if (bizDoc.exists && bizDoc.data()?.referredBy) {
                        const referrerId = bizDoc.data().referredBy;
                        const refBizDoc = await db.collection('businesses').doc(referrerId).get();
                        if (refBizDoc.exists) {
                            batch.update(refBizDoc.ref, {
                                eventCredits: admin.firestore.FieldValue.increment(50)
                            });
                        }
                    }
                    batch.update(orderRef, { referralRewardGranted: true });
                }
            } else if (orderData.type === 'menu_addon' && orderData.businessId) {
                // 3. Si es Menu Addon
                const bizRef = db.collection('businesses').doc(orderData.businessId);
                batch.set(bizRef, {
                    menu_premium_active: true,
                    menu_subscription: {
                        status: 'active',
                        payment_method: 'dlocal',
                        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiresAt: admin.firestore.Timestamp.fromDate(expires),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                }, { merge: true });
            }

            // 4. Registro contable en transacciones
            const txRef = db.collection('transactions').doc();
            batch.set(txRef, {
                orderId,
                userId: orderData.userId,
                planId: orderData.planId || 'menu_addon',
                type: orderData.type,
                amount: orderData.amount,
                currency: orderData.currency,
                status: 'PAID',
                gateway: 'dLocal',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            logger.info(`[Webhook dLocal] Orden ${orderId} procesada y plan activado exitosamente.`);
        } else {
            await orderRef.update({
                status: status || 'failed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return res.status(200).send('OK');
    } catch (error) {
        logger.error('[Webhook dLocal] Error:', error);
        return res.status(500).send('Error');
    }
});

// Exportamos la función bajo el nombre 'api'
export const api = onRequest({
    region: "us-central1",
    minInstances: 0,
    invoker: "public"
}, app);

/**
 * Scheduled Task: Notify users 2 hours before coupon reservation expires
 * Runs every 30 minutes to ensure timely reminders.
 */
export const checkExpiringReservations = onSchedule("every 30 minutes", async (event) => {
    try {
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const bufferTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // 2.5h to catch 2h window

        logger.info(`[Reminder] Checking reservations expiring between ${now.toISOString()} and ${twoHoursLater.toISOString()}`);

        const reservationsSnapshot = await db.collection('couponRedemptions')
            .where('status', '==', 'reserved')
            .where('expiresAt', '>', admin.firestore.Timestamp.fromDate(now))
            .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(bufferTime))
            .get();

        if (reservationsSnapshot.empty) {
            return logger.info('[Reminder] No reservations found in the expiration window.');
        }

        const batch = db.batch();
        let sentCount = 0;

        for (const doc of reservationsSnapshot.docs) {
            const data = doc.data();
            
            // Skip if already sent or if it's too early/late (extra safety)
            if (data.reminderSent) continue;

            // Create in-app notification
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                userId: data.userId,
                title: '⌛ ¡Tu cupón expira pronto!',
                message: `Tu reserva para "${data.couponCode}" expira en menos de 2 horas. ¡No pierdas tu beneficio!`,
                type: 'offer',
                businessId: data.businessId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Mark as reminder sent
            batch.update(doc.ref, { reminderSent: true });
            sentCount++;
        }

        if (sentCount > 0) {
            await batch.commit();
            logger.info(`[Reminder] Sent ${sentCount} expiration reminders.`);
        } else {
            logger.info('[Reminder] All potential reservations already had reminders sent.');
        }

        // --- NEW: Handle automated status transition for EXPIRED reservations ---
        const expiredSnapshot = await db.collection('couponRedemptions')
            .where('status', '==', 'reserved')
            .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(now))
            .get();

        if (!expiredSnapshot.empty) {
            const cleanupBatch = db.batch();
            expiredSnapshot.forEach(doc => {
                cleanupBatch.update(doc.ref, { status: 'expired', expiredAt: admin.firestore.FieldValue.serverTimestamp() });
            });
            await cleanupBatch.commit();
            logger.info(`[Cleanup] Successfully expired ${expiredSnapshot.size} stale reservations.`);
        }

    } catch (error) {
        logger.error('[Reminder] Critical error in scheduled task:', error);
    }
});

/**
 * Scheduled Task: Permanently delete events/pulsos 24 hours after their end date.
 * Runs every 6 hours.
 */
export const cleanupExpiredEvents = onSchedule("every 6 hours", async (event) => {
    try {
        const now = new Date();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

        logger.info('[Cleanup Events] Checking for events expired by more than 24 hours...');

        const eventsSnapshot = await db.collection('events').get();
        if (eventsSnapshot.empty) {
            return logger.info('[Cleanup Events] No events found to clean up.');
        }

        const batch = db.batch();
        let deletedCount = 0;

        eventsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            let eventEnd = null;

            if (data.endAt) {
                eventEnd = data.endAt.toDate ? data.endAt.toDate() : new Date(data.endAt);
            } else if (data.startAt) {
                const start = data.startAt.toDate ? data.startAt.toDate() : new Date(data.startAt);
                eventEnd = new Date(start.getTime() + DEFAULT_DURATION_MS);
            }

            if (eventEnd && !isNaN(eventEnd.getTime())) {
                const expirationCutoff = eventEnd.getTime() + TWENTY_FOUR_HOURS_MS;
                if (now.getTime() >= expirationCutoff) {
                    batch.delete(docSnap.ref);
                    deletedCount++;
                }
            }
        });

        if (deletedCount > 0) {
            await batch.commit();
            logger.info(`[Cleanup Events] Permanently deleted ${deletedCount} expired events.`);
        } else {
            logger.info('[Cleanup Events] No expired events met 24h deletion threshold.');
        }
    } catch (error) {
        logger.error('[Cleanup Events] Error during scheduled event cleanup:', error);
    }
});

/**
 * Scheduled Task: Send weekly events newsletter (Thursday report) to users
 */
export const sendWeeklyNewsletter = onSchedule({
    schedule: "0 9 * * 4", // 9:00 AM every Thursday
    timeZone: "America/Guayaquil",
}, async (event) => {
    try {
        logger.info('[Newsletter] Starting weekly events newsletter scheduled task...');

        // Fetch all users with email
        const usersSnapshot = await db.collection('users_v2').get();
        const usuarios = [];
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email) {
                usuarios.push({
                    email: data.email,
                    name: `${data.name || ''} ${data.surname || ''}`.trim() || 'Pulser'
                });
            }
        });

        if (usuarios.length === 0) {
            logger.info('[Newsletter] No users found with emails. Exiting.');
            return;
        }

        // Fetch active/upcoming events
        const now = new Date();
        
        // Calculate the upcoming weekend window (Friday 00:00 to Monday 04:00)
        const startOfWeekend = new Date(now);
        startOfWeekend.setDate(now.getDate() + 1); // Friday
        startOfWeekend.setHours(0, 0, 0, 0);

        const endOfWeekend = new Date(now);
        endOfWeekend.setDate(now.getDate() + 4); // Monday
        endOfWeekend.setHours(4, 0, 0, 0);

        const eventsSnapshot = await db.collection('events')
            .where('status', '!=', 'deactivated')
            .get();
        
        const eventos = [];
        eventsSnapshot.forEach(doc => {
            const data = doc.data();
            const endAt = data.endAt ? (data.endAt.toDate ? data.endAt.toDate() : new Date(data.endAt)) : null;
            const startAt = data.startAt ? (data.startAt.toDate ? data.startAt.toDate() : new Date(data.startAt)) : null;
            const eventEnd = endAt || new Date((startAt ? startAt.getTime() : Date.now()) + 4 * 3600000);
            
            // Check if the event is active during the upcoming weekend
            const isWeekendEvent = 
                (startAt && startAt >= startOfWeekend && startAt <= endOfWeekend) ||
                (startAt && startAt < startOfWeekend && eventEnd >= startOfWeekend);

            if (isWeekendEvent) {
                eventos.push({
                    id: doc.id,
                    ...data,
                    startAt: startAt,
                    endAt: endAt
                });
            }
        });

        if (eventos.length === 0) {
            logger.info('[Newsletter] No active upcoming events to feature. Exiting.');
            return;
        }

        // Fetch recent community posts
        const communitySnapshot = await db.collection('posts')
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();
        const communityPosts = [];
        communitySnapshot.forEach(doc => {
            const data = doc.data();
            communityPosts.push({
                authorName: data.authorName || 'Usuario de Ubícame',
                content: data.content || ''
            });
        });

        logger.info(`[Newsletter] Sending weekly newsletter to ${usuarios.length} users with ${eventos.length} events and ${communityPosts.length} community posts...`);
        const result = await enviarPulseSemanal(usuarios, eventos, communityPosts);
        logger.info('[Newsletter] Task finished. Result:', result);

        // Send In-App Thursday Notifications to registered users
        if (usersSnapshot.docs.length > 0 && eventos.length > 0) {
            const notifBatch = db.batch();
            const topEvent = eventos[0];
            usersSnapshot.docs.forEach(uDoc => {
                const notifRef = db.collection('notifications').doc();
                notifBatch.set(notifRef, {
                    userId: uDoc.id,
                    title: '⚡ ¡Cartelera del Fin de Semana!',
                    message: `Hay ${eventos.length} evento(s) activados para este fin de semana en Montañita. Destacado: "${topEvent.title}". ¡No te lo pierdas!`,
                    type: 'event',
                    eventId: topEvent.id || null,
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            await notifBatch.commit();
            logger.info(`[Newsletter] Created ${usersSnapshot.docs.length} in-app Thursday notifications for users.`);
        }

    } catch (error) {
        logger.error('[Newsletter] Critical error in weekly newsletter task:', error);
    }
});

/**
 * Scheduled Task: Send monthly business performance report to B2B clients
 */
export const sendMonthlyBusinessReport = onSchedule({
    schedule: "0 8 1 * *", // 8:00 AM on the 1st of every month
    timeZone: "America/Guayaquil",
}, async (event) => {
    try {
        logger.info('[Monthly Report] Starting monthly B2B performance reports scheduled task...');

        // Calculate date range for the previous month
        const now = new Date();
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Fetch general app views (from settings/visits)
        let vistasGeneralesApp = 0;
        try {
            const visitsDoc = await db.collection('settings').doc('visits').get();
            if (visitsDoc.exists) {
                vistasGeneralesApp = visitsDoc.data().count || 0;
            }
        } catch (err) {
            logger.error('[Monthly Report] Error fetching general app visits:', err);
        }

        // Fetch all active businesses
        const businessesSnapshot = await db.collection('businesses')
            .where('isDeleted', '!=', true)
            .get();

        if (businessesSnapshot.empty) {
            logger.info('[Monthly Report] No businesses found. Exiting.');
            return;
        }

        let sentCount = 0;

        for (const doc of businessesSnapshot.docs) {
            const business = doc.data();
            const businessId = doc.id;
            const email = business.email;
            
            // Skip references or businesses without email
            if (business.isReference || !email) continue;

            const name = business.name || 'Socio MontaPulse';

            // Query 1: New followers in the previous month range
            let nuevosSeguidores = 0;
            try {
                const followsSnapshot = await db.collection('follows')
                    .where('businessId', '==', businessId)
                    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(firstDayPrevMonth))
                    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(lastDayPrevMonth))
                    .get();
                nuevosSeguidores = followsSnapshot.size;
            } catch (err) {
                logger.error(`[Monthly Report] Error fetching followers for business ${businessId}:`, err.message);
            }

            // Query 2: Total clicks on all events associated with this business
            let clicksTotalesEventos = 0;
            try {
                const eventsSnapshot = await db.collection('events')
                    .where('businessId', '==', businessId)
                    .get();
                eventsSnapshot.forEach(evtDoc => {
                    const evtData = evtDoc.data();
                    clicksTotalesEventos += (evtData.clickCount || 0);
                });
            } catch (err) {
                logger.error(`[Monthly Report] Error fetching events clickCount for business ${businessId}:`, err.message);
            }

            // Prepare metrics
            const metricas = {
                visitas_al_perfil: business.monthlyViews || business.viewCount || 0,
                nuevos_seguidores: nuevosSeguidores,
                clicks_totales_eventos: clicksTotalesEventos,
                vistas_generales_app: vistasGeneralesApp
            };

            logger.info(`[Monthly Report] Sending report to ${name} (${email}) with metrics: ${JSON.stringify(metricas)}`);
            
            try {
                const result = await enviarReporteMensualNegocio(email, name, metricas);
                if (result.success) {
                    sentCount++;
                } else {
                    logger.error(`[Monthly Report] Failed sending to ${email}:`, result.error || result.message);
                }
            } catch (sendErr) {
                logger.error(`[Monthly Report] Critical Resend API error sending to ${email}:`, sendErr);
            }
        }

        logger.info(`[Monthly Report] Task finished. Sent reports to ${sentCount} businesses.`);

    } catch (error) {
        logger.error('[Monthly Report] Critical error in monthly B2B report task:', error);
    }
});


/**
 * Cloud Function to resize images uploaded to Firebase Storage
 * Replaces the deprecated storage-resize-images Firebase Extension
 */
export const resizeUploadedImage = functionsV1.region("us-east1").storage.bucket("montapulse-app.firebasestorage.app").object().onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    // Exit if this is not an image
    if (!contentType || !contentType.startsWith("image/")) {
        logger.info("[Resize] File is not an image. Skipping.");
        return;
    }

    // Exit if the image is already a thumbnail/resized version to avoid infinite loop
    const fileName = path.basename(filePath);
    if (fileName.includes("_200x200") || fileName.includes("_800x800")) {
        logger.info("[Resize] File is already a resized thumbnail. Skipping.");
        return;
    }

    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000'
    };

    try {
        // Download file from bucket
        await bucket.file(filePath).download({ destination: tempFilePath });
        logger.info(`[Resize] Image downloaded locally to ${tempFilePath}`);

        const sizes = [200, 800];
        
        for (const size of sizes) {
            const dotIdx = fileName.lastIndexOf('.');
            let resizedFileName;
            if (dotIdx !== -1) {
                const name = fileName.substring(0, dotIdx);
                const ext = fileName.substring(dotIdx);
                resizedFileName = `${name}_${size}x${size}${ext}`;
            } else {
                resizedFileName = `${fileName}_${size}x${size}`;
            }

            const resizedFilePath = path.join(path.dirname(filePath), resizedFileName).replace(/\\/g, '/');
            const tempResizedPath = path.join(os.tmpdir(), resizedFileName);

            // Resize image using sharp
            await sharp(tempFilePath)
                .resize(size, size, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFile(tempResizedPath);

            logger.info(`[Resize] Resized image (${size}x${size}) created at ${tempResizedPath}`);

            // Upload the resized image
            await bucket.upload(tempResizedPath, {
                destination: resizedFilePath,
                metadata: metadata,
            });
            logger.info(`[Resize] Resized image uploaded to ${resizedFilePath}`);

            // Delete temporary resized file
            fs.unlinkSync(tempResizedPath);
        }

        // Delete temporary original file
        fs.unlinkSync(tempFilePath);
        logger.info("[Resize] Finished processing all sizes successfully.");
    } catch (error) {
        logger.error("[Resize] Error resizing image:", error);
    }
});

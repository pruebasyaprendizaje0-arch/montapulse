import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { Resend } from 'resend';
import { enviarPulseSemanal } from './services/newsletterService.js';
import { enviarReporteMensualNegocio } from './services/reporteMensualService.js';


// Inicializar Firebase Admin
admin.initializeApp();

// Cargar variables de entorno
dotenv.config();

const app = express();
const db = admin.firestore();

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
        let baseHtml = '';
        try {
            const htmlRes = await axios.get(`${baseUrl}/index.html`);
            baseHtml = htmlRes.data;
        } catch (err) {
            logger.error('[SEO Home] Error fetching base index.html:', err.message);
            baseHtml = `<!DOCTYPE html><html lang="es"><head><title>MontaPulse | Guía Local Costa de Santa Elena, Ecuador</title></head><body><div id="root"></div></body></html>`;
        }

        // 3. Crear el bloque HTML de feed semántico oculto
        const semanticFeed = `
            <div id="seo-home-feed" style="display: none;" aria-hidden="true">
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
            .replace('<div id="root"></div>', `<div id="root">${semanticFeed}</div>`);

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

        xml += `</urlset>`;

        res.set('Content-Type', 'text/xml');
        res.set('Cache-Control', 'public, max-age=43200, s-maxage=43200'); // 12 horas de cache
        res.status(200).send(xml);
    } catch (error) {
        logger.error('[Sitemap] Error al generar sitemap:', error);
        res.status(500).send('Error generando sitemap');
    }
});

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
        let query = db.collection('businesses')
            .where('isPublished', '==', true)
            .where('isDeleted', '!=', true);

        if (officialLocality) {
            query = query.where('locality', '==', officialLocality);
        }

        const snapshot = await query.get();
        const results = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (dbCategories.length > 0) {
                if (dbCategories.includes(data.category)) {
                    results.push({ id: doc.id, ...data });
                }
            } else {
                results.push({ id: doc.id, ...data });
            }
        });

        // Ordenar destacados primero
        results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

        let baseHtml = '';
        try {
            const htmlRes = await axios.get(`${baseUrl}/`);
            baseHtml = htmlRes.data;
        } catch (err) {
            logger.error('[SEO] Error fetching base HTML', err.message);
            baseHtml = `<!DOCTYPE html><html><head><title>MontaPulse</title></head><body><div id="root"></div></body></html>`;
        }

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

        const metaTags = `
            <title>${title}</title>
            <meta name="description" content="${cleanDescription}" />
            <link rel="canonical" href="${canonicalUrl}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${cleanDescription}" />
            <meta property="og:image" content="${baseUrl}/favicon.ico" />
            <meta property="og:url" content="${canonicalUrl}" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="${title}" />
            <meta name="twitter:description" content="${cleanDescription}" />
            <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
        `;

        // Payload HTML semántico tipo "Hub" / enciclopédico
        const semanticPayload = `
            <div id="seo-payload-hub" style="display: none;" aria-hidden="true">
                <article>
                    <h1>Guía de ${categoryTitle} en ${officialLocality}, Ecuador</h1>
                    <p>${cleanDescription}</p>
                    <section>
                        <h2>Negocios e Instalaciones Recomendadas:</h2>
                        <ol>
                            ${results.map(biz => `
                                <li>
                                    <h3><a href="/negocio/${biz.slug || biz.id}">${biz.name}</a></h3>
                                    <p>Descripción: ${redactarDescripcionFactual(biz.name, biz.description, biz.sector, biz.category)}</p>
                                    <p>Ubicación: Sector ${biz.sector || 'Centro'}, ${officialLocality}</p>
                                    ${biz.phone ? `<p>Contacto: ${biz.phone}</p>` : ''}
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
            .replace('<div id="root"></div>', `<div id="root">${semanticPayload}</div>`);

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
    if (cat.includes('restaurante') || cat.includes('comida') || cat.includes('bar') || cat.includes('discoteca')) return 'Restaurant';
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

        let baseHtml = '';
        try {
            const htmlRes = await axios.get(`${baseUrl}/`);
            baseHtml = htmlRes.data;
        } catch (err) {
            logger.error('[SEO] Error fetching base HTML', err.message);
            baseHtml = `<!DOCTYPE html><html><head><title>MontaPulse</title></head><body><div id="root"></div></body></html>`;
        }

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
                <div id="seo-payload" style="display: none;" aria-hidden="true">
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
                .replace('<head>', `<head>\n${metaTags}`)
                .replace('<div id="root"></div>', `<div id="root">${semanticPayload}</div>`);
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

        let baseHtml = '';
        try {
            const htmlRes = await axios.get(`${baseUrl}/`);
            baseHtml = htmlRes.data;
        } catch (err) {
            logger.error('[SEO] Error fetching base HTML', err.message);
            baseHtml = `<!DOCTYPE html><html><head><title>MontaPulse</title></head><body><div id="root"></div></body></html>`;
        }

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
                "amenityFeature": mapearAmenidades(business.services || business.emblematicServices)
            };

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
                <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
            `;

            // Payload HTML semántico oculto para consumo directo de LLM
            const semanticPayload = `
                <div id="seo-payload" style="display: none;" aria-hidden="true">
                    <article>
                        <h1>${name}</h1>
                        <p>Categoría comercial: ${business.category || ''}</p>
                        <p>Sector geográfico: ${business.sector || ''}, ${bizLocality}, Santa Elena, Ecuador</p>
                        <p>Descripción factual: ${cleanDescription}</p>
                        ${phone ? `<p>Número de contacto: ${phone}</p>` : ''}
                        ${business.email ? `<p>Correo electrónico: ${ofuscarEmailSpam(business.email)}</p>` : ''}
                        ${business.instagram ? `<p>Instagram oficial: <a href="https://instagram.com/${business.instagram.replace('@', '')}">@${business.instagram.replace('@', '')}</a></p>` : ''}
                        <ul>
                            ${(business.services || []).map(serv => `<li>Servicio/Amenidad: ${serv}</li>`).join('')}
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
                .replace('<head>', `<head>\n${metaTags}`)
                .replace('<div id="root"></div>', `<div id="root">${semanticPayload}</div>`);
        }

        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO] Error en negocio SEO:', error);
        res.status(500).send('Error interno');
    }
});

/**
 * Route: Create Checkout
 */
app.post('/api/create-checkout', async (req, res) => {
    const { amount, currency, description, userId, planId } = req.body;
    const origin = req.get('origin') || 'https://montapulse-app.web.app';

    logger.info(`[dLocal Go] Creating checkout for ${amount} ${currency}: ${description}`);

    try {
        const parsedAmount = parseFloat(amount);

        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: `Monto no válido: ${amount}` });
        }

        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';

        logger.info(`[dLocal Go] Intentando crear pago en: ${DLOCAL_GO_URL}`);

        try {
            const response = await axios.post(DLOCAL_GO_URL, {
                amount: parseFloat(parsedAmount.toFixed(2)),
                currency: currency || 'USD',
                country: req.body.country || 'EC',
                description: description || 'Plan Pulse Pro',
                success_url: origin + '/plans?status=success',
                back_url: origin + '/plans',
                notification_url: origin + '/api/webhook/dlocal?userId=' + encodeURIComponent(userId || '') + '&planId=' + encodeURIComponent(planId || '')
            }, {
                auth: {
                    username: process.env.DLOCAL_GO_API_KEY,
                    password: process.env.DLOCAL_GO_SECRET_KEY
                },
                timeout: 10000
            });

            if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
                logger.info('[dLocal Go] ¡Éxito en la creación!');
                return res.json({
                    success: true,
                    checkout_url: response.data.checkout_url || response.data.redirect_url
                });
            }
        } catch (err) {
            const errorStatus = err.response?.status || 500;
            const errorData = err.response?.data || err.message;
            logger.error(`[dLocal Go] Error ${errorStatus}:`, errorData);

            return res.status(errorStatus).json({
                success: false,
                message: 'Error al conectar con dLocal Go',
                detail: errorData
            });
        }

    } catch (globalError) {
        logger.error('[dLocal Go] Error crítico en la función:', globalError.message);
        res.status(500).json({
            success: false,
            message: 'Error interno en el servidor de pagos',
            detail: globalError.message
        });
    }
});

/**
 * Route: AI Proxy for OpenRouter
 */
app.post('/api/ai/openrouter', async (req, res) => {
    try {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OpenRouter key missing on server' });
        
        const { messages, model, jsonMode, stream } = req.body;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model || 'google/gemini-2.5-flash',
            messages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: stream || false,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://montapulse.com',
                'X-Title': 'Montapulse',
            },
            responseType: stream ? 'stream' : 'json'
        });

        if (stream) {
            response.data.pipe(res);
        } else {
            res.json(response.data);
        }
    } catch (err) {
        logger.error('[AI Proxy] OpenRouter Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Route: AI Proxy for Gemini
 */
app.post('/api/ai/gemini', async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini key missing on server' });

        const { prompt } = req.body;
        
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ text });
    } catch (err) {
        logger.error('[AI Proxy] Gemini Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Route: Send Email with Resend
 */
app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text, from } = req.body;

    logger.info(`[Resend] Intentando enviar email a: ${to}, Asunto: ${subject}`);

    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            logger.error('[Resend] Error: RESEND_API_KEY no configurado en Cloud Functions.');
            return res.status(500).json({ success: false, message: 'La clave de API de Resend no está configurada.' });
        }

        const resendInstance = new Resend(apiKey);

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos: to, subject, y html o text.' });
        }

        const data = await resendInstance.emails.send({
            from: from || 'MontaPulse <onboarding@resend.dev>',
            to,
            subject,
            html: html || text,
            text: text || html
        });

        if (data.error) {
            logger.error('[Resend] Error devuelto por la API:', data.error);
            return res.status(400).json({ success: false, error: data.error });
        }

        logger.info('[Resend] ¡Email enviado con éxito!', data);
        return res.json({ success: true, data });
    } catch (error) {
        logger.error('[Resend] Error crítico al enviar email:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Route: One-time Admin cleanup tool to recalibrate exaggerated viewCount values.
 * Security: Requires a secret query parameter ?secret=montapulse_clean_2026
 */
app.get('/api/admin/cleanup-views', async (req, res) => {
    const { secret } = req.query;
    if (secret !== 'montapulse_clean_2026') {
        return res.status(401).send('No autorizado.');
    }

    try {
        logger.info('[Cleanup API] Iniciando limpieza de visitas exageradas...');
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
        return res.status(500).send(`Error: ${error.message}`);
    }
});

/**
 * Route: Register Business Visit (Anti-spam / Bot Filtering / Unique IPs)
 */
app.post('/api/business/visit', async (req, res) => {
    const { businessId } = req.body;
    let userIp = req.body.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    if (!businessId) {
        return res.status(400).json({ success: false, message: 'Falta businessId en el cuerpo.' });
    }

    try {
        // Clean IP representation (handle comma-separated proxy lists, IPv6 maps, etc.)
        if (typeof userIp === 'string') {
            userIp = userIp.split(',')[0].trim();
        } else {
            userIp = 'unknown';
        }

        // Filter out search bots/crawlers on the server side as well
        const userAgent = req.headers['user-agent'] || '';
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|headless/i.test(userAgent);
        if (isBot) {
            logger.info(`[Visit API] Ignored bot/crawler request for business: ${businessId}, UA: ${userAgent}`);
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

        // Set or update the visit record
        await visitRef.set({
            businessId,
            ip: userIp,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // Increment counts on the business document
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
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Exportamos la función bajo el nombre 'api'
export const api = onRequest({
    region: "us-central1",
    minInstances: 0,
    invoker: "public"
}, app);

/**
 * Route: dLocal Go Webhook
 */
app.post('/api/webhook/dlocal', async (req, res) => {
    try {
        const { userId, planId } = req.query;
        const { status } = req.body;

        // VERIFICACIÓN DE SEGURIDAD: Prevenir falsificación de pagos (Spoofing)
        const expectedToken = process.env.DLOCAL_WEBHOOK_SECRET;
        const authHeader = req.headers['authorization'];
        
        if (expectedToken) {
            if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
                logger.warn(`[Webhook dLocal] Intento de fraude bloqueado. Token inválido o ausente para user ${userId}`);
                return res.status(401).json({ success: false, message: 'Firma de Webhook no válida' });
            }
        } else {
            logger.warn(`[Webhook dLocal] ALERTA DE SEGURIDAD: DLOCAL_WEBHOOK_SECRET no está configurado. El endpoint es vulnerable a fraude.`);
        }

        logger.info(`[Webhook dLocal] Recibido para user ${userId}, plan ${planId}, status: ${status}`);

        // Verificamos si dLocal envía "PAID" u otro estado exitoso
        if (status === 'PAID' && userId && planId) {
            // Actualizar usuario en Firestore
            const userRef = db.collection('users').doc(userId);
            await userRef.set({
                plan: planId,
                pulsePassActive: true
            }, { merge: true });

            // Obtener el negocio del usuario para actualizar su plan y procesar referidos
            try {
                const userSnap = await userRef.get();
                const userData = userSnap.data();
                if (userData && userData.businessId) {
                    const bizRef = db.collection('businesses').doc(userData.businessId);
                    const bizSnap = await bizRef.get();
                    const bizData = bizSnap.data();

                    // Actualizar el plan del negocio
                    await bizRef.set({
                        plan: planId
                    }, { merge: true });
                    logger.info(`[Webhook dLocal] Negocio ${userData.businessId} actualizado a plan ${planId}`);

                    // Procesar la recompensa para el recomendador
                    if (bizData && bizData.referredBy) {
                        const referrerId = bizData.referredBy;
                        let referrerBizRef = null;

                        // Intentar buscar por ID de documento primero
                        const docTestRef = db.collection('businesses').doc(referrerId);
                        const docTestSnap = await docTestRef.get();
                        if (docTestSnap.exists) {
                            referrerBizRef = docTestRef;
                        } else {
                            // Buscar por slug único
                            const slugQuery = await db.collection('businesses').where('slug', '==', referrerId).limit(1).get();
                            if (!slugQuery.empty) {
                                referrerBizRef = slugQuery.docs[0].ref;
                            }
                        }

                        if (referrerBizRef) {
                            const referrerSnap = await referrerBizRef.get();
                            const referrerData = referrerSnap.data();
                            const currentCredits = referrerData.eventCredits || 0;

                            // Recompensar con +50 créditos de eventos
                            await referrerBizRef.set({
                                eventCredits: currentCredits + 50
                            }, { merge: true });

                            logger.info(`[Webhook dLocal] Recomendador ${referrerId} premiado con +50 créditos por conversión del negocio: ${userData.businessId}`);
                        }
                    }
                }
            } catch (bizErr) {
                logger.error(`[Webhook dLocal] Error al procesar negocio o referidos:`, bizErr);
            }

            // Mantener un historial contable
            const transactionRef = db.collection('transactions').doc();
            await transactionRef.set({
                userId,
                planId,
                status,
                gateway: 'dLocal',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                rawBody: req.body
            });

            logger.info(`[Webhook dLocal] Usuario ${userId} actualizado a plan ${planId}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[Webhook dLocal] Error:', error);
        res.status(500).send('Error');
    }
});

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

        logger.info(`[Newsletter] Sending weekly newsletter to ${usuarios.length} users with ${eventos.length} events...`);
        const result = await enviarPulseSemanal(usuarios, eventos);
        logger.info('[Newsletter] Task finished. Result:', result);

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

        // Fetch all active businesses
        const businessesSnapshot = await db.collection('businesses')
            .where('isDeleted', '!=', true)
            .get();

        if (businessesSnapshot.empty) {
            logger.info('[Monthly Report] No businesses found. Exiting.');
            return;
        }

        // Fetch coupon redemptions for the previous month
        const redemptionsSnapshot = await db.collection('couponRedemptions')
            .where('reservedAt', '>=', admin.firestore.Timestamp.fromDate(firstDayPrevMonth))
            .where('reservedAt', '<=', admin.firestore.Timestamp.fromDate(lastDayPrevMonth))
            .get();

        // Count redemptions by businessId
        const redemptionsMap = {};
        redemptionsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.businessId) {
                redemptionsMap[data.businessId] = (redemptionsMap[data.businessId] || 0) + 1;
            }
        });

        let sentCount = 0;

        for (const doc of businessesSnapshot.docs) {
            const business = doc.data();
            const businessId = doc.id;
            const email = business.email;
            
            // Skip references or businesses without email
            if (business.isReference || !email) continue;

            const name = business.name || 'Socio MontaPulse';
            const views = business.viewCount || 0;
            const clicks = business.clickCount || 0;
            const redemptions = redemptionsMap[businessId] || 0;

            // Prepare metrics
            const metricas = {
                visitas_al_perfil: views,
                clics_en_como_llegar: clicks,
                llamadas_whatsapp: Math.max(0, Math.floor(clicks * 0.25)), // Calculated fallback for WhatsApp calls if not directly logged
                cupones_reservados: redemptions
            };

            logger.info(`[Monthly Report] Sending report to ${name} (${email})`);
            const result = await enviarReporteMensualNegocio(email, name, metricas);
            if (result.success) {
                sentCount++;
            }
        }

        logger.info(`[Monthly Report] Task finished. Sent reports to ${sentCount} businesses.`);

    } catch (error) {
        logger.error('[Monthly Report] Critical error in monthly B2B report task:', error);
    }
});


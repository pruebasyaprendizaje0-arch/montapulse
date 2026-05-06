import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

// Debes descargar tu serviceAccountKey.json desde Firebase Console
// y colocarlo en la misma carpeta que este script
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync('./montapulse-app-firebase-adminsdk-fbsvc-d87cd4f957.json', 'utf8'));
} catch (e) {
  console.error("Error: No se encontró serviceAccountKey.json. Por favor, asegúrate de tenerlo en esta carpeta.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper para generar slugs a partir del texto
function generateSlug(text) {
  return text
    .toString()
    .normalize('NFD') // Normaliza acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // Elimina caracteres no alfanuméricos
    .replace(/\s+/g, '-') // Reemplaza espacios con guiones
    .replace(/-+/g, '-'); // Elimina múltiples guiones
}

async function migrateSlugs() {
  console.log('Iniciando migración de slugs...');
  
  // 1. Migrar Negocios
  const businessesSnapshot = await db.collection('businesses').get();
  console.log(`Encontrados ${businessesSnapshot.size} negocios.`);
  
  let bizCount = 0;
  for (const doc of businessesSnapshot.docs) {
    const data = doc.data();
    if (!data.slug && data.name) {
      const baseSlug = generateSlug(data.name);
      // Opcional: Agregar sufijo aleatorio para unicidad
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      await doc.ref.update({ slug: uniqueSlug });
      bizCount++;
    }
  }
  console.log(`Actualizados ${bizCount} negocios.`);

  // 2. Migrar Eventos
  const eventsSnapshot = await db.collection('events').get();
  console.log(`Encontrados ${eventsSnapshot.size} eventos.`);
  
  let eventCount = 0;
  for (const doc of eventsSnapshot.docs) {
    const data = doc.data();
    if (!data.slug && data.title) {
      const baseSlug = generateSlug(data.title);
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      await doc.ref.update({ slug: uniqueSlug });
      eventCount++;
    }
  }
  console.log(`Actualizados ${eventCount} eventos.`);

  console.log('Migración completada exitosamente.');
  process.exit(0);
}

migrateSlugs().catch(console.error);

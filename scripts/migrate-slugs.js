import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const NORMALIZE_BUSINESS_SLUGS = process.argv.includes('--normalize-business-slugs');
const SERVICE_ACCOUNT_FILE = './montapulse-app-firebase-adminsdk-fbsvc-d87cd4f957.json';

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
} catch {
  console.error(`No se encontró la credencial requerida: ${SERVICE_ACCOUNT_FILE}`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function proposedSlug(data, id, label) {
  const name = slugify(label);
  const locality = slugify(data.locality);
  if (!name) return `ubicame-${id.toLowerCase()}`;
  // No repite "montanita" cuando ya forma parte del nombre comercial.
  return locality && !name.includes(locality) ? `${name}-${locality}` : name;
}

function uniqueSlug(candidate, id, used) {
  if (!used.has(candidate)) return candidate;
  return `${candidate}-${id.slice(0, 6).toLowerCase()}`;
}

async function migrateCollection(collectionName, labelField) {
  const snapshot = await db.collection(collectionName).get();
  const used = new Set(snapshot.docs.map(doc => doc.data().slug).filter(Boolean));
  const updates = [];
  const skipped = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.slug) continue;
    if (!data[labelField]) {
      skipped.push(doc.id);
      continue;
    }

    const slug = uniqueSlug(proposedSlug(data, doc.id, data[labelField]), doc.id, used);
    used.add(slug);
    updates.push({ ref: doc.ref, id: doc.id, slug });
  }

  console.log(`${collectionName}: ${snapshot.size} registros, ${updates.length} slugs por crear, ${skipped.length} omitidos sin ${labelField}.`);
  updates.forEach(({ id, slug }) => console.log(`  ${id} -> ${slug}`));

  if (!APPLY || updates.length === 0) return { updated: 0, skipped: skipped.length };

  for (let index = 0; index < updates.length; index += 400) {
    const batch = db.batch();
    updates.slice(index, index + 400).forEach(({ ref, slug }) => {
      batch.update(ref, { slug, slugUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
  }

  return { updated: updates.length, skipped: skipped.length };
}

async function main() {
  console.log(APPLY ? 'Aplicando migración determinista de slugs…' : 'Auditoría de slugs (sin escribir cambios)…');
  const businesses = await migrateCollection('businesses', 'name');
  const events = await migrateCollection('events', 'title');
  console.log(`${APPLY ? 'Migración completada' : 'Auditoría completada'}: ${businesses.updated + events.updated} slugs ${APPLY ? 'creados' : 'propuestos'}.`);
  if (!APPLY) console.log('Revisa esta salida y ejecuta `node scripts/migrate-slugs.js --apply` para aplicar los cambios.');
}

main().catch(error => {
  console.error('Error en migración de slugs:', error);
  process.exitCode = 1;
});

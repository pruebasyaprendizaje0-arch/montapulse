
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase.config';

async function nukeAllReferencePoints() {
    console.log('--- INICIANDO PURGA NUCLEAR DE PUNTOS DE REFERENCIA ---');
    try {
        const businessesRef = collection(db, 'businesses');
        const snapshot = await getDocs(businessesRef);
        console.log(`Encontrados ${snapshot.docs.length} documentos totales en la colección 'businesses'.`);
        
        let deletedCount = 0;
        for (const d of snapshot.docs) {
            const data = d.data();
            // Criterios de purga: isReference es true O el ID empieza por 'ref-'
            if (data.isReference === true || d.id.startsWith('ref-')) {
                console.log(`Borrando punto: ${data.name || d.id} (${d.id})`);
                await deleteDoc(d.ref);
                deletedCount++;
            }
        }
        
        console.log(`--- PURGA COMPLETADA: ${deletedCount} puntos eliminados permanentemente ---`);
    } catch (error) {
        console.error('Error durante la purga:', error);
    }
}

nukeAllReferencePoints();

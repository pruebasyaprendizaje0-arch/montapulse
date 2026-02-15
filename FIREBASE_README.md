# Montañita Pulse - Firebase Deployment

## 🚀 Proyecto Firebase Configurado

**Project ID**: `montapulse-app`  
**Hosting URL**: https://montapulse-app.web.app  
**Console**: https://console.firebase.google.com/project/montapulse-app  

---

## 📦 Servicios Configurados

### 1. **Firebase Hosting** ✅
   - Directorio público: `dist`
   - Build automático con Vite

### 2. **Cloud Firestore** ✅
   - Base de datos NoSQL en tiempo real
   - Reglas de seguridad configuradas (válidas hasta 14 marzo 2026)
   - Ubicación: `us-east1`

### 3. **Firebase Storage** ✅
   - Para almacenar imágenes de eventos y negocios
   -Storage: `montapulse-app.firebasestorage.app`

### 4. **Firebase Authentication** ✅
   - Para gestión de usuarios
   - Auth Domain: `montapulse-app.firebaseapp.com`

---

## 🛠️ Comandos de Despliegue

### Build de la aplicación
```bash
npm run build
```

### Desplegar a Firebase Hosting
```bash
npx firebase deploy --only hosting
```

### Desplegar Firestore rules
```bash
npx firebase deploy --only firestore:rules
```

### Desplegar todo
```bash
npx firebase deploy
```

---

## 🔥 Plan Gratuito de Firebase (Spark Plan)

Límites del plan gratuito:

### Hosting
- ✅ 10 GB de almacenamiento
- ✅ 360 MB/día de transferencia
- ✅ Dominio personalizado gratuito

### Firestore
- ✅ 1 GB de almacenamiento
- ✅ 50,000 lecturas/día
- ✅ 20,000 escrituras/día
- ✅ 20,000 eliminaciones/día

### Storage
- ✅ 5 GB de almacenamiento
- ✅ 1 GB/día de transferencia
- ✅ 20,000 operaciones/día

### Authentication
- ✅ Usuarios ilimitados
- ✅ Google, Email/Password, Anónimo

**Suficiente para empezar y crecer** 🎉

---

## 📝 Configuración Firebase (firebase.config.ts)

La configuración ya está en `firebase.config.ts`:

```typescript
export const db = getFirestore(app);      // Base de datos
export const storage = getStorage(app);    // Almacenamiento
export const auth = getAuth(app);          // Autenticación
```

---

## 🗂️ Estructura de Firestore

### Collections sugeridas:

```
/events/{eventId}
  - id: string
  - businessId: string
  - title: string
  - description: string
  - startAt: timestamp
  - endAt: timestamp
  - vibe: string
  - sector: string
  - imageUrl: string
  - interestedCount: number

/businesses/{businessId}
  - id: string
  - name: string
  - sector: string
  - description: string
  - imageUrl: string
  - whatsapp: string
  - phone: string
  - coordinates: geopoint
  - isVerified: boolean

/users/{userId}
  - id: string
  - name: string
  - email: string
  - role: string ('visitor' | 'host')
  - preferredVibe: string
  - avatarUrl: string
  - businessId: string (opcional)
```

---

## 🔐 Reglas de Seguridad

Las reglas actuales permiten lectura y escritura hasta el 14 de marzo de 2026.

**Importante**: Antes de esa fecha, actualiza las reglas en `firestore.rules` con:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Eventos: lectura pública, escritura autenticada
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Negocios: lectura pública, escritura solo del dueño
    match /businesses/{businessId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.ownerId;
    }
    
    // Usuarios: solo el usuario puede ver y editar su perfil
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 Próximos Pasos

1. ✅ **Migrar localStorage a Firestore**
   - Crear hooks personalizados para eventos
   - Crear hooks para negocios y usuarios
   
2. ✅ **Subir imágenes a Storage**
   - Convertir las imágenes base64 actuales
   - Usar Firebase Storage URLs

3. ✅ **Implementar Authentication**
   - Login con Google
   - Login con Email/Password
   - Gestión de sesiones

4. ✅ **Deploy a Hosting**
   - Build de producción
   - Desplegar con `firebase deploy`

---

## 📱 URLs del Proyecto

- **Live App**: https://montapulse-app.web.app
- **Firebase Console**: https://console.firebase.google.com/project/montapulse-app
- **Firestore Database**: https://console.firebase.google.com/project/montapulse-app/firestore

---

## 💡 Tips

- Siempre haz `npm run build` antes de desplegar
- Usa `firebase deploy --only hosting` para despliegues más rápidos
- Monitorea el uso en la consola de Firebase
- El plan gratuito es más que suficiente para empezar

¡Tu aplicación está lista para desplegarse en Firebase! 🎉

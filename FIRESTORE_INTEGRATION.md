# 🔥 Montañita Pulse - Firestore Integration Complete

## ✅ ¿Qué se ha implementado?

### 1. **Servicios de Firestore** (`services/firestoreService.ts`)
   - ✅ CRUD completo para eventos
   - ✅ CRUD completo para negocios
   - ✅ CRUD completo para usuarios
   - ✅ Sistema de favoritos
   - ✅ Suscripciones en tiempo real para todos los datos

### 2. **Hooks personalizados** (`hooks/useFirestore.ts`)
   - ✅ `useEvents()` - Gestiona eventos con sync en tiempo real
   - ✅ `useBusinesses()` - Gestiona negocios con sync en tiempo real
   - ✅ `useFavorites()` - Gestiona favoritos del usuario

### 3. **Sistema de Migración** (`services/migrationService.ts`)
   - ✅ Migra datos de localStorage a Firestore
   - ✅ Backup de datos antes de migrar
   - ✅ Limpieza de localStorage después de migrar

### 4. **Componente de Migración** (`components/MigrationPanel.tsx`)
   - ✅ UI para hacer backup
   - ✅ UI para migrar datos
   - ✅ UI para limpiar localStorage

### 5. **Reglas de Seguridad Firestore** ✅
   - ✅ Eventos: lectura pública, escritura autenticada
   - ✅ Negocios: lectura pública, escritura autenticada
   - ✅ Usuarios: solo el dueño puede leer/escribir
   - ✅ Favoritos: solo el dueño puede gestionar
   - ✅ Desplegadas a Firebase

---

## 🚀 Cómo usar los nuevos servicios

### Opción 1: Usar los Hooks (Recomendado)

```typescript
import { useEvents, useBusinesses, useFavorites } from './hooks/useFirestore';

function MyComponent() {
  // Events con sincronización automática
  const { events, loading, addEvent, editEvent, removeEvent } = useEvents();
  
  // Businesses con sincronización automática
  const { businesses, addBusiness, editBusiness, removeBusiness } = useBusinesses();
  
  // Favorites del usuario
  const { favorites } = useFavorites(user?.id || null);
  
  return (
    <div>
      {loading && <p>Loading...</p>}
      {events.map(event => <EventCard key={event.id} event={event} />)}
    </div>
  );
}
```

### Opción 2: Usar los Servicios Directamente

```typescript
import { 
  createEvent, 
  updateEvent, 
  deleteEvent,
  subscribeToEvents 
} from './services/firestoreService';

// Crear evento
await createEvent({
  businessId: 'xyz',
  title: 'Beach Yoga',
  description: 'Yoga at sunrise',
  // ... otros campos
});

// Actualizar evento
await updateEvent('eventId', {
  title: 'Updated Title'
});

// Eliminar evento
await deleteEvent('eventId');

// Suscribirse a cambios en tiempo real
const unsubscribe = subscribeToEvents((events) => {
  console.log('New events:', events);
});

// Cuando termine, desuscribirse
unsubscribe();
```

---

## 📦 Migrar Datos desde localStorage

### Opción 1: Usar el Componente de Migración

1. Importar el componente:
```typescript
import { MigrationPanel } from './components/MigrationPanel';
```

2. Agregarlo al App (temporalmente):
```typescript
const [showMigration, setShowMigration] = useState(false);

// En el JSX
{showMigration && <MigrationPanel onClose={() => setShowMigration(false)} />}
```

3. Abrir el panel con un botón:
```typescript
<button onClick={() => setShowMigration(true)}>
  Migrate to Firestore
</button>
```

### Opción 2: Migrar desde la Consola

Abre la consola del navegador y ejecuta:

```javascript
import { migrateLocalStorageToFirestore, backupLocalStorageData, clearLocalStorageData } from './services/migrationService';

// 1. Hacer backup primero (recomendado)
backupLocalStorageData();

// 2. Migrar datos
await migrateLocalStorageToFirestore();

// 3. (Opcional) Limpiar localStorage después de verificar en Firestore
clearLocalStorageData();
```

---

## 🔐 Autenticación (Próximo Paso)

Para habilitar autenticación y que los usuarios puedan gestionar sus propios datos:

### 1. **Habilitar Auth en Firebase Console**
   - Ve a https://console.firebase.google.com/project/montapulse-app/authentication
   - Habilita **Email/Password** y **Google** como proveedores

### 2. **Crear Servicio de Auth**

```typescript
// services/authService.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut 
} from 'firebase/auth';
import { auth } from '../firebase.config';

export const loginWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = () => {
  return signOut(auth);
};
```

### 3. **Hook de Autenticación**

```typescript
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.config';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};
```

---

## 📊 Estructura de Datos en Firestore

### Collection: `events`
```javascript
{
  id: "auto-generated",
  businessId: string,
  title: string,
  description: string,
  startAt: timestamp,
  endAt: timestamp,
  category: string,
  vibe: enum,
  sector: enum,
  imageUrl: string,
  interestedCount: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `businesses`
```javascript
{
  id: "auto-generated",
  name: string,
  sector: enum,
  description: string,
  imageUrl: string,
  whatsapp: string,
  phone: string,
  icon: string,
  isVerified: boolean,
  coordinates: [lat, lng],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `users`
```javascript
{
  id: string (auth uid),
  name: string,
  email: string,
  preferredVibe: enum,
  role: enum ('visitor' | 'host'),
  avatarUrl: string,
  businessId: string (opcional),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `favorites`
```javascript
{
  id: "auto-generated",
  userId: string,
  eventId: string,
  createdAt: timestamp
}
```

---

## 🎯 Beneficios de Firestore

### ✅ **Tiempo Real**
   - Los cambios se sincronizan automáticamente en todos los dispositivos
   - Los usuarios ven actualizaciones sin recargar la página

### ✅ **Multi-usuario**
   - Varios usuarios pueden crear y editar contenido simultáneamente
   - No hay conflictos de datos

### ✅ **Offline Support**
   - Firestore cachea datos localmente
   - La app funciona sin conexión
   - Los cambios se sincronizan cuando hay conexión

### ✅ **Escalable**
   - Gratis hasta 50,000 lecturas/día
   - Crece automáticamente con tu app

### ✅ **Seguro**
   - Reglas de seguridad a nivel de documento
   - Control fino de permisos

---

## 🛠️ Comandos Útiles

```bash
# Build de la app
npm run build

# Desplegar todo (hosting + reglas)
npx firebase deploy

# Solo desplegar hosting
npx firebase deploy --only hosting

# Solo desplegar reglas de Firestore
npx firebase deploy --only firestore:rules

# Ver logs de Firestore
npx firebase firestore:logs

# Abrir consola de Firebase
npx firebase open
```

---

## 🔗 Enlaces Útiles

- **App Live**: https://montapulse-app.web.app
- **Firebase Console**: https://console.firebase.google.com/project/montapulse-app
- **Firestore Database**: https://console.firebase.google.com/project/montapulse-app/firestore
- **Authentication**: https://console.firebase.google.com/project/montapulse-app/authentication
- **Storage**: https://console.firebase.google.com/project/montapulse-app/storage

---

## ✨ Status Actual

- ✅ Firebase configurado
- ✅ Firestore inicializado
- ✅ Hosting desplegado
- ✅ Reglas de seguridad desplegadas
- ✅ Servicios creados
- ✅ Hooks personalizados creados
- ✅ Sistema de migración implementado
- ⏳ **Pendiente**: Migrar datos de localStorage
- ⏳ **Pendiente**: Implementar autenticación
- ⏳ **Pendiente**: Integrar hooks en App.tsx

---

¡La infraestructura de Firestore está completa y lista para usar! 🎉

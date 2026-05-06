# Manual de Funciones - MontaPulse

Este documento detalla la arquitectura técnica y el funcionamiento interno de la plataforma MontaPulse.

## 1. Arquitectura del Sistema
MontaPulse es una Single Page Application (SPA) moderna construida sobre las siguientes tecnologías:
- **Frontend**: React 18 con TypeScript.
- **Build Tool**: Vite para un desarrollo y empaquetado ultra-rápido.
- **Backend-as-a-Service**: Firebase (Auth, Firestore, Storage, Messaging).
- **Mapas**: Leaflet para la visualización geoespacial interactiva.
- **Inteligencia Artificial**: Integración con OpenRouter (Gemini/Minimax) para recomendaciones inteligentes.

## 2. Gestión de Autenticación
La autenticación es manejada por `AuthContext.tsx`, que interactúa con Firebase Auth.
- **Perfiles de Usuario**: Al iniciar sesión por primera vez, se crea un documento en la colección `users` de Firestore.
- **Roles de Seguridad**: 
  - `visitor`: Usuario estándar.
  - `host`: Usuario que gestiona un negocio.
  - `admin`: Administrador de la plataforma.
- **Sincronización de Planes**: El sistema verifica el plan de suscripción del usuario (`FREE`, `PRO`, `ELITE`, `EXPERT`) para habilitar funciones específicas.

## 3. Manejo de Datos (DataContext)
`DataContext.tsx` centraliza el estado global de la aplicación utilizando suscripciones en tiempo real (`onSnapshot`) de Firestore.
- **Eventos**: Suscripción a la colección `events`. Maneja RSVP y conteo de asistentes en vivo.
- **Negocios**: Colección `businesses`. Diferencia entre negocios reales y "puntos de referencia" (landmarks).
- **Notificaciones**: Sistema de alertas globales y personales.
- **Configuración Global**: El documento `app_settings/config` define límites de planes, precios y características activas.

## 4. Sistema de Mapas
Implementado en `MapView.tsx`, utiliza Leaflet con capas personalizadas.
- **Sectores**: Definidos mediante polígonos GeoJSON en `constants.ts`.
- **Marcadores Dinámicos**: Los íconos cambian según la categoría del negocio y su nivel de suscripción.
- **Creación de Puntos**: Permite a usuarios con planes superiores (`PRO`, `ELITE`) registrar nuevos puntos directamente en el mapa.

## 5. Integración de IA
Localizada en `geminiService.ts`:
- **Planificador de 24h**: Genera itinerarios basados en el "Vibe" del usuario y los negocios destacados.
- **Descripciones Inteligentes**: Crea textos persuasivos para eventos de forma automática.
- **Recomendaciones Contextuales**: Responde a consultas naturales del usuario basándose en los eventos actuales en Montañita.

## 6. Funciones Administrativas
- **Mass Broadcast**: Permite enviar notificaciones push y mensajes globales a todos los usuarios.
- **Gestión de Usuarios**: Panel para actualizar roles y planes de suscripción.
- **Control de Contenidos**: Moderación de posts en el `PulseFeed`.

## 7. Automatización de Pagos (dLocal Go)
La plataforma utiliza la infraestructura de **dLocal Go** para la monetización:
- **Integración Checkout**: El frontend genera sesiones de pago dinámicas enviando el `userId` y `planId` como parámetros de seguimiento.
- **Webhook Securizado**: Una Cloud Function (`/api/webhook/dlocal`) recibe las notificaciones `PAID` del servidor de dLocal.
- **Activación Instantánea**: Al confirmarse el pago, la función actualiza el campo `plan` en Firestore y genera un registro en la colección `transactions` para auditoría contable.

---
*MontaPulse Technical Documentation - 2024*

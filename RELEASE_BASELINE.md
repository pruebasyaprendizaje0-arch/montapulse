# RELEASE_BASELINE.md — Línea Base Oficial de Producción, Caché y Reconciliación

> **Estado**: Congelado para validación de release (Fase 6 — Versión Publicada Consolidada)  
> **Acción**: **NO DESPLEGAR AUTOMÁTICAMENTE** — Requiere autorización explícita  
> **Fecha**: 2026-09-29  

---

## 1. Fuente Oficial de Release y Decisión de Producto

| Parámetro | Valor Oficial de Referencia |
| :--- | :--- |
| **Repositorio** | `https://github.com/pruebasyaprendizaje0-arch/montapulse.git` |
| **Rama** | `main` |
| **Último Commit en Rama** | `3935a15d51e66295352f7ce3673110c36e00c63b` |
| **Estado de Código Local** | Versión Publicada Canónica (`NOSOTROS` en `/`, `EXPLORAR` en `/explore`, `INFO / BUSCAR` en `/info`, `EVENTOS` en `/calendar`, `AVISOS` en `/community`, `PASSPORT` en `/passport`) |
| **Punto de Entrada Canónico** | `/` resuelve a la **Versión Publicada Canónica** (`pages/History.tsx` con hero `CONECTANDO EL PULSO DE NUESTRA COMUNIDAD` y botón `¿CÓMO TE SIENTES HOY?`) |
| **Exploración Canónica** | `/explore` abre la **Experiencia Canónica de Exploración** (`pages/Explore.tsx` con feed interactivo, selector geográfico, ánimo, actividades y eventos) |

---

## 2. Reconciliación y Versión Publicada Oficial

De acuerdo con la inspección en vivo de `https://www.ubicame.info/` libre de caché:

1. **Raíz Canónica (`/` y `/history`)**:
   - Pestaña **NOSOTROS** (`pages/History.tsx`).
   - Hero: `BIENVENIDO A MONTAPULSE` / `CONECTANDO EL PULSO DE NUESTRA COMUNIDAD`.
   - Botón de acción: `¿CÓMO TE SIENTES HOY?` que navega a `/explore`.
   - Historia, Misión, Visión, Mano Invisible, Primero lo Nuestro, Proyecto Playa.

2. **Exploración Canónica (`/explore` y `/feed`)**:
   - Pestaña **EXPLORAR** (`pages/Explore.tsx`).
   - Buscador de eventos, negocios, servicios o referencias.
   - Selector de ubicación geográfica (Provincia, Cantón, Parroquia, Comuna).
   - Filtros dinámicos de ánimo (*¿Cómo te sientes?*) y actividades (*¿Qué quieres hacer?*).
   - El Pulso de hoy, Negocios y Tendencias en vivo.

3. **Navegación Canónica (6 Pestañas)**:
   - `NOSOTROS` (`/`)
   - `EXPLORAR` (`/explore`)
   - `INFO / BUSCAR` (`/info`)
   - `EVENTOS` (`/calendar`)
   - `AVISOS` (`/community`)
   - `PASSPORT` (`/passport`)

---

## 3. Identidad de Marca y Enrutamiento Unificado

- **`Ubícame.info`**: Plataforma paraguas y red digital de información y servicios turísticos.
- **`PULSE`**: Motor en vivo interactivo, exploración y agenda.
- **Mapa de Rutas Canónico (`constants.ts`)**:
  - `CANONICAL_ROUTES.ROOT` (`/`): Sección Nosotros (`history`).
  - `CANONICAL_ROUTES.EXPLORE` (`/explore`): Feed de Exploración (`explore`).
  - `CANONICAL_ROUTES.FEED` (`/feed`): Feed de Exploración (`explore`).
  - `CANONICAL_ROUTES.HISTORY` (`/history`): Sección Nosotros (`history`).
  - `CANONICAL_ROUTES.INFO` (`/info`): Directorio y Búsqueda (`info`).
  - `CANONICAL_ROUTES.CALENDAR` (`/calendar`): Agenda de eventos (`calendar`).
  - `CANONICAL_ROUTES.COMMUNITY` (`/community`): Notificaciones y Avisos (`community`).
  - `CANONICAL_ROUTES.PASSPORT` (`/passport`): Perfil y billetera (`favorites`).


---

## 4. Exploración Canónica sin Mapa

- La experiencia publicada no contiene un mapa embebido.
- `pages/Explore.tsx` ofrece búsqueda, filtros geográficos, ánimo, actividades, eventos y directorio en formato de feed.
- El componente legado `components/Map/MapView.tsx` fue eliminado y no debe reintroducirse como fallback, ruta ni dependencia de la pantalla de exploración.

---

## 5. Medición Real y Honesta de Rendimiento en `/`

La raíz `/` muestra la sección Nosotros publicada. La exploración se carga bajo demanda en `/explore`, sin Leaflet ni un mapa embebido:

| Módulo / Funcionalidad | Chunk Generado | Tamaño Minificado | Tamaño Gzip | Estado en Carga de `/` |
| :--- | :--- | :--- | :--- | :--- |
| **Punto de Entrada (`App`)** | `assets/index-*.js` | ~154 kB | ~48.5 kB | Descarga inicial |
| **Framework React** | `assets/vendor-react-*.js` | ~276 kB | ~89.7 kB | Descarga inicial |
| **Firebase Firestore** | `assets/firebase-firestore-*.js` | ~348 kB | ~82.1 kB | Descarga inicial |
| **Firebase Auth** | `assets/firebase-auth-*.js` | ~124 kB | ~24.7 kB | Descarga inicial |
| **Firebase Core** | `assets/firebase-core-*.js` | ~113 kB | ~32.0 kB | Descarga inicial |
| **CSS Principal** | `assets/index-*.css` | ~297 kB | ~33.5 kB | Descarga inicial |
| **QR Code & Scanner** | `assets/qr-*.js` | 391.5 kB | 116.9 kB | **0 kB (Diferido a Cupones/Scanner)** |
| **SuperAdmin Center** | `assets/SuperAdminCenter-*.js` | 136.6 kB | 29.8 kB | **0 kB (Diferido a Admin)** |
| **Markdown Renderer** | `assets/markdown-*.js` | 74.0 kB | 21.4 kB | **0 kB (Diferido a Guías/Políticas)** |
| **Passport Modal & Hub**| `assets/Passport-*.js` | 75.8 kB | 15.9 kB | **0 kB (Diferido a `/passport`)** |
| **Firebase Storage** | `assets/firebase-storage-*.js` | 33.7 kB | 8.7 kB | **0 kB (Diferido a subida de fotos)** |
| **Firebase Messaging** | `assets/firebase-messaging-*.js` | 26.4 kB | 5.0 kB | **0 kB (Diferido a permiso notif)** |
| **Gemini AI Service** | `assets/geminiService-*.js` | 7.2 kB | 3.1 kB | **0 kB (Diferido a consulta IA)** |

---

## 6. Contratos de Caché y Pruebas Automatizadas

| Recurso | Directiva `Cache-Control` | Comportamiento del Cliente |
| :--- | :--- | :--- |
| `/index.html` | `no-cache, no-store, must-revalidate, max-age=0` | Siempre valida contra la red; nunca retiene HTML viejo. |
| `/sw.js`, `/firebase-messaging-sw.js`, `/manifest.json` | `no-cache, no-store, must-revalidate, max-age=0` | El navegador siempre busca el nuevo SW sin usar caché HTTP. |
| `/assets/**` (JS/CSS con hash) | `public, max-age=31536000, immutable` | Caché segura a 1 año; cada compilación genera hashes únicos. |
| **Service Worker Navigation** | `Network-First` (Fallback a Cache) | Peticiones de documento/HTML siempre van a red primero. |
| **Service Worker Update** | `self.skipWaiting()` + `clients.claim()` | Invalida y purga cachés obsoletas al activarse. |

---

## 7. Estado de las Pruebas Unitarias y de Integración

Ejecución actual con `npm test`:
- **Total de pruebas en suite**: 68 pruebas
- **Pruebas superadas (Pass)**: **67 correctas**
- **Pruebas fallidas**: **0 fallidas**
- **Pruebas omitidas**: **1 omitida por infraestructura local** (`rules_emulator.test.mjs` — requiere emulador de Firestore activo mediante `firebase emulators:exec --only firestore`).

---

## 8. Protocolo Manual Obligatorio Posterior al Despliegue

Una vez autorizado y ejecutado el despliegue (`npm run deploy`), la persona responsable debe completar estos pasos:

1. **Obtener línea base del build**:
   Ejecutar `npm run release:verify` en terminal y anotar:
   - `Build Version` (ej. `1790722576110`)
   - `Main JS Chunk` (ej. `/assets/index-CHW98e2F.js`)

2. **Verificación en ventana privada**:
   Abrir `https://www.ubicame.info/` en una ventana de incógnito/privada limpia.

3. **Confirmación de integridad de entrada**:
   - Abrir DevTools (`F12`) > pestaña **Elements** o **Sources**.
   - Confirmar que el `<script type="module" src="/assets/index-*.js">` en el HTML coincide **literalmente** con el `Main JS Chunk` de la línea base.
   - Confirmar que `<meta name="app-build-version" content="...">` coincide exactamente con el `Build Version`.

4. **Verificación de ciclo de vida del Service Worker**:
   - Recargar una segunda vez (F5).
   - Cambiar a otra pestaña y regresar (disparo de `window.focus -> registration.update()`).
   - Confirmar en DevTools > **Console** que no hay errores de carga de chunks (`Loading chunk failed`).

5. **Validación de experiencia publicada móvil (`/`) a 390 × 844 px**:
   - En DevTools activar emulación de dispositivo (iPhone 12/13/14 Pro - 390 × 844).
   - Confirmar que abre la sección **Nosotros** con el hero publicado.
   - Navegar a **Explorar** y confirmar que muestra el feed, buscador y filtros sin mapa embebido.

6. **Registro de evidencia**:
   Llenar la plantilla de auditoría con fecha, hora, hash de commit desplegado y estado final.

---

## 9. Registro de Evidencia de Despliegue

```markdown
### Registro de Validación Post-Despliegue
- Fecha y Hora: [Pendiente de despliegue]
- Commit Desplegado: [Hash del commit real aprobado]
- Build Version Verificada: [Resultado de release:verify]
- Main JS Chunk Verificado: [Resultado de release:verify]
- Coincidencia en Producción (https://www.ubicame.info/): [ ] Sí / [ ] No
- Experiencia publicada sin mapa embebido (390x844): [ ] Conforme
- Auditor / Responsable: [Nombre]
```



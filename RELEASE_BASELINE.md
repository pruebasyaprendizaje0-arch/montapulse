# RELEASE_BASELINE.md — Línea Base Oficial de Producción y Reconciliación

> **Estado**: Congelado para validación (Fase 5.2)  
> **Acción**: **NO DESPLEGAR TODAVÍA**  
> **Fecha**: 2026-09-28  

---

## 1. Fuente Oficial de Release

| Parámetro | Valor Oficial de Referencia |
| :--- | :--- |
| **Repositorio** | `https://github.com/pruebasyaprendizaje0-arch/montapulse.git` |
| **Rama** | `main` |
| **Commit Base de Origen** | `e5ce48268eb1e8bf149bb7249aea76e040fb54d6` |
| **Fases Integradas** | Fase 1 (Seguridad Firestore & Backend), Fase 2 (Enrutamiento Canónico), Fase 3 (Mapa & Exploración), Fase 4 (Elegibilidad de Eventos & Precios Centralizados), Fase 5.1/5.2 (Rendimiento Verificable, Separación de Chunks y Accesibilidad) |
| **Punto de Entrada Canónico** | `/` resuelve exclusivamente a `pages/Home.tsx` |

---

## 2. Reconciliación de Variantes y Definición de Inicio (`/`)

Se realizó el análisis comparativo entre las tres versiones detectadas para establecer una sola fuente de verdad:

### Comparativa de Variantes
1. **Producción Obsoleta (Desplegada anteriormente)**:
   - Abre el mapa Leaflet directamente en la raíz `/`.
   - Descarga ~540 kB adicionales de Leaflet y scripts en la primera carga.
   - En móviles muestra nombres y tooltips de texto superpuestos que tapan el mapa.
   - *Resolución*: **Eliminada de `/`**. El mapa reside únicamente en `/explore`.

2. **Variante Hero Institucional ("Conectando el pulso de nuestra comunidad")**:
   - Mostraba un contenedor hero con espacio vertical excesivo antes de mostrar contenido real.
   - Incluía botón "Volver" inexistente en la raíz.
   - CTA principal quedaba oculto o colisionaba con la barra de navegación fija inferior (`BottomNav`) en pantallas 390 × 844.
   - *Resolución*: **Descartada**.

3. **Versión Canónica Aprobada: Home Compacto Móvil (`pages/Home.tsx`)**:
   - **Hero Compacto**: Encabezado en vivo (`Guía en Vivo • {Locación}`) y buscador directo de actividades y servicios. Todo el bloque inicial entra en el primer viewport a 390 × 844 px.
   - **Contenido en Vivo**: 
     - *Eventos Confirmados Hoy* (filtrados mediante `isEventPublicAndActive` de la Fase 4.3).
     - *Abierto Ahora* (con cálculo de horarios y badges de estado).
     - *Cerca de ti* (con geolocalización y cálculo de distancia en metros/km).
     - *Destacados Verificados* (tarjetas comerciales con aspect ratio fijo `16:9` y fallback `onError`).
     - *Categorías Rápidas* (Comer, Dormir, Surf, Transporte, Salud).
   - **Sin botón Volver en raíz**: Solo navegación contextual.
   - **CTA Único y Despejado**: Buscador accesible ubicado a salvo de la barra inferior.

---

## 3. Identidad de Marca Unificada

- **`Ubícame.info`**: La plataforma paraguas y red digital de información y servicios turísticos.
- **`PULSE`**: El motor en vivo interactivo, agenda de eventos y guía de la localidad.
- **Jerarquía visual**: Logotipo en `TopNavbar` presenta `ubicame.info` como nombre principal con subtítulo `PULSE` en acento naranja, eliminando cualquier confusión o marca duplicada.

---

## 4. Mapa Canónico y Exploración Móvil (`/explore`)

- **Componente Único**: `components/Map/MapView.tsx`.
- **Clustering Espacial Activo**: Agrupa automáticamente pines geográficos cercanos (`cluster-marker`, `leaflet-cluster-icon`) reduciendo el uso de memoria en móviles de gama media/baja.
- **Sin Etiquetas Permanentes Masivas**: Los marcadores no renderizan tooltips de texto permanentes (`permanent: false`). Los títulos y detalles solo se revelan al interactuar o seleccionar un pin.

---

## 5. Medición Real de Chunks e Importaciones de Entrada

La auditoría del manifiesto de build (`dist/.vite/manifest.json`) confirma la fragmentación estricta del bundle inicial:

| Módulo / Funcionalidad | Chunk Generado | Tamaño Minificado | Tamaño Gzip | Estado en Carga de `/` |
| :--- | :--- | :--- | :--- | :--- |
| **Punto de Entrada (`App`)** | `assets/index-*.js` | 152.9 kB | 48.0 kB | Descarga inicial |
| **Framework React** | `assets/vendor-react-*.js` | 276.4 kB | 89.7 kB | Descarga inicial |
| **Firebase Firestore** | `assets/firebase-firestore-*.js` | 347.9 kB | 82.1 kB | Descarga inicial |
| **Firebase Auth** | `assets/firebase-auth-*.js` | 123.8 kB | 24.7 kB | Descarga inicial |
| **Firebase Core** | `assets/firebase-core-*.js` | 112.9 kB | 31.9 kB | Descarga inicial |
| **Vista Home** | `assets/Home-*.js` | 20.3 kB | 4.9 kB | Descarga inicial |
| **CSS Principal** | `assets/index-*.css` | 295.9 kB | 33.2 kB | Descarga inicial |
| **Leaflet & Mapa** | `assets/leaflet-*.js` | 149.0 kB | 43.1 kB | **0 kB (Diferido a `/explore`)** |
| **QR Code & Scanner** | `assets/qr-*.js` | 391.5 kB | 116.9 kB | **0 kB (Diferido a Cupones/Perfil)** |
| **SuperAdmin Center** | `assets/SuperAdminCenter-*.js` | 136.5 kB | 29.8 kB | **0 kB (Diferido a Admin)** |
| **Markdown Renderer** | `assets/markdown-*.js` | 74.0 kB | 21.3 kB | **0 kB (Diferido a Guías/Políticas)** |
| **Passport Modal & Hub**| `assets/Passport-*.js` | 75.7 kB | 15.8 kB | **0 kB (Diferido a `/passport`)** |
| **Firebase Storage** | `assets/firebase-storage-*.js` | 33.7 kB | 8.6 kB | **0 kB (Diferido a subida de fotos)** |
| **Firebase Messaging** | `assets/firebase-messaging-*.js` | 26.4 kB | 4.9 kB | **0 kB (Diferido a permiso notif)** |
| **Gemini AI Service** | `assets/geminiService-*.js` | 7.1 kB | 3.0 kB | **0 kB (Diferido a consulta IA)** |

---

## 6. Accesibilidad y Estados de Carga

- `PageLoader` cuenta con `role="status"` y `aria-live="polite"` en todos sus puntos de uso (`Suspense` en `App.tsx`, `Home.tsx`, `Explore.tsx`, `Calendar.tsx`, etc.).
- Soporte global para usuarios con sensibilidad al movimiento mediante `@media (prefers-reduced-motion: reduce)` en `index.css` y `components/common/PageLoader.tsx`.

---

## 7. Protocolo Obligatorio Previo a Despliegue

Antes de ordenar cualquier despliegue a Firebase Hosting:
1. `npm test` debe completar **60/60 pruebas** con 0 fallos.
2. `npx tsc --noEmit` debe retornar código 0.
3. `npm run build` debe generar el manifiesto sin advertencias de tamaño excesivo.
4. El commit desplegado debe coincidir exactamente con el hash documentado en este baseline.

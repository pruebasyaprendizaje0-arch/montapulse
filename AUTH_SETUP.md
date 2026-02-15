# 🔐 Sistema de Autenticación y Roles

## ✅ Implementación Completada (v2.0)

La aplicación ahora soporta múltiples roles con registro público, manteniendo la seguridad del administrador.

### Roles del Sistema:

1. **👑 Admin (Super Usuario)**
   - **Email único**: `pruebasyaprendizaje0@gmail.com`
   - Acceso total al sistema.
   - Se detecta automáticamente por el email.

2. **🏢 Host (Negocio)**
   - Usuarios registrados que seleccionaron "Business".
   - Pueden crear eventos.
   - Pueden gestionar su perfil de negocio.

3. **👤 Visitor (Visitante)**
   - Usuarios registrados que seleccionaron "Visitor".
   - Pueden ver eventos.
   - Pueden guardar favoritos.

---

## 🚀 Flujo de Usuario

### 1. Registro
- El usuario hace clic en "Create Account" en la pantalla de login.
- Selecciona su rol (Visitor o Business).
- Completa sus datos (Nombre, Email, Password).
- Se crea automáticamente su perfil en Firestore con el rol seleccionado.

### 2. Login
- **Google**: Si el email es `pruebasyaprendizaje0@gmail.com`, entra como Admin. Otros entran con su rol asignado.
- **Email/Password**: Funciona para todos los usuarios registrados.

---

## 💻 Uso en el Código

El hook `useAuth` ahora proporciona toda la información necesaria:

```typescript
const { 
  user,      // Objeto User de Firebase
  loading,   // Boolean
  isAdmin,   // Boolean (true solo para ti)
  userRole   // String: 'admin' | 'host' | 'visitor'
} = useAuth();
```

### Ejemplo de Protección de Rutas:

```typescript
// Solo mostrar botón de crear evento si es Host o Admin
{(userRole === 'host' || isAdmin) && (
  <button onClick={createEvent}>Crear Evento</button>
)}

// Solo mostrar panel de administración si es Admin
{isAdmin && (
  <AdminPanel />
)}
```

---

## 🛡️ Reglas de Seguridad (Firestore)

Las reglas se actualizan automáticamente para respetar estos roles (ya configurado en `firestore.rules`):

- **Eventos**: Lectura pública. Escritura requiere autenticación.
- **Negocios**: Lectura pública. Escritura requiere autenticación.
- **Usuarios**: Cada usuario solo puede editar su propio perfil.

---

## 🌐 URLs

- **App Live**: https://montapulse-app.web.app
- **Firebase Auth**: https://console.firebase.google.com/project/montapulse-app/authentication

---

¡Tu aplicación ahora es una plataforma completa multi-usuario! 🚀

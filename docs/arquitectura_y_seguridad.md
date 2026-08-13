# 🏗️ Arquitectura de Software y Seguridad del Sistema

Este documento proporciona una descripción detallada de la arquitectura técnica, el flujo de datos y los esquemas de seguridad aplicados en el sistema de gestión de stock, inventario y facturación de **Estación Color Pinturería**.

---

## 1. Topología del Sistema y Comunicaciones

La aplicación está diseñada bajo el patrón de **Single Page Application (SPA)** en el frontend y **Backend as a Service (BaaS)** en el backend. 

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTE (SPA)                          │
│                                                                 │
│   ┌────────────────────────┐      ┌─────────────────────────┐   │
│   │     Vistas React       │      │   Gestor de Estado      │   │
│   │   Páginas y Caja POS   │◄────►│   TanStack Query / Auth │   │
│   └────────────────────────┘      └─────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                   Llamados REST / RPC sobre HTTPS
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (SUPABASE)                        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  PostgreSQL Engine                      │   │
│   │                                                         │   │
│   │   - API PostgREST (Generación automática de endpoints)  │   │
│   │   - PostgreSQL RLS (Políticas a nivel de fila)          │   │
│   │   - Funciones Transaccionales PL/pgSQL (RPC)            │   │
│   │   - Postgres Triggers (Sincronización de perfiles)      │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

La comunicación entre el cliente React y Supabase es asíncrona y cifrada a través de protocolos HTTPS:
*   **Lecturas y Escrituras Básicas:** Ejecutadas por el cliente usando el constructor sintáctico de Supabase (ej: `supabase.from('productos').select(...)`).
*   **Llamadas Remotas (RPC):** Las operaciones complejas o transaccionales se delegan a funciones escritas en PL/pgSQL que corren directamente en la base de datos para garantizar atomicidad.

---

## 2. Gestión de Sesión y Autenticación

El sistema delega la autenticación a **Supabase Auth**, el cual expide tokens **JWT (JSON Web Tokens)** seguros y firmados.

```
┌─────────┐              Conectar con email/clave             ┌──────────────┐
│ Cliente │──────────────────────────────────────────────────►│Supabase Auth │
│  React  │◄──────────────────────────────────────────────────│   Service    │
└─────────┘             Expide Token JWT y Refresh            └──────────────┘
     │
     │ Incluye JWT Bearer Header
     ▼
┌──────────────┐
│  Postgres DB │──► Valida firma del token JWT y extrae rol del usuario
└──────────────┘
```

### Ciclo de Autenticación
1.  **Inicio de Sesión:** El usuario ingresa sus credenciales en `LoginPage.tsx`. La API de Supabase valida las credenciales y devuelve un token de acceso (`access_token`) con duración de 1 hora, junto con un token de actualización (`refresh_token`).
2.  **Persistencia:** La sesión se almacena encriptada en el `localStorage` del navegador.
3.  **Renovación de Token:** El cliente de Supabase monitorea de forma transparente en segundo plano la expiración del token y solicita uno nuevo utilizando el `refresh_token` sin interrumpir la operación del cajero.
4.  **Cierre de Sesión:** Borra los tokens locales e invalida la sesión activa en el servidor, forzando la redirección automática a la vista `/login`.

---

## 3. Seguridad de Base de Datos: Row Level Security (RLS)

El acceso a los datos está controlado de manera estricta mediante políticas **RLS (Row Level Security)** en PostgreSQL. Esto asegura que ningún cliente pueda consultar o modificar tablas si no cumple con las condiciones requeridas.

### Políticas Aplicadas

#### Tabla `productos` y `variantes` (Lectura y Modificación)
*   **Lectura (`SELECT`):** Permitida a todo usuario autenticado.
    ```sql
    CREATE POLICY "Lectura productos" ON public.productos 
    FOR SELECT TO authenticated USING (true);
    ```
*   **Escritura (`INSERT`, `UPDATE`, `DELETE`):** Permitida para todos los usuarios autenticados para agilizar la actualización del stock.

#### Tabla `usuarios` (Gestión de Vendedores y Perfiles)
*   **Lectura (`SELECT`):** Todo usuario autenticado puede consultar los perfiles (para listar cajeros en facturación).
*   **Edición (`UPDATE` y `DELETE`):** Exclusiva para cuentas con privilegios de **Administrador**.
    ```sql
    CREATE POLICY "Edicion usuarios" ON public.usuarios 
    FOR ALL TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());
    ```

### Función de Verificación de Rol (`is_admin`)
Para evitar loops recursivos en las consultas de RLS, se definió una función con privilegios de ejecución elevados (`SECURITY DEFINER`):
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM public.usuarios WHERE id = auth.uid();
  RETURN COALESCE(v_rol = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 4. Control de Acceso en Navegación (Rutas Protegidas)

En el frontend, las rutas están securizadas a nivel de componentes usando React Router Dom v6:

### Flujo de Navegación del Router

```
                      ¿Usuario Autenticado?
                               │
                ┌──────────────┴──────────────┐
               SÍ                             NO
                │                             │
       ¿Ruta es Pública?              ¿Ruta es Pública?
        (ej: /login)                    (ej: /login)
        ┌───────┴───────┐              ┌───────┴───────┐
       SÍ              NO             SÍ              NO
        │               │              │               │
 Redirigir a Home    Acceder   Permitir acceso   Redirigir a /login
                    a la ruta
```

### Componentes de Seguridad (Guards)

1.  **`ProtectedRoute.tsx`**: Envuelve todas las rutas que requieren inicio de sesión (`MainLayout`). Si no hay sesión válida o la cuenta del vendedor fue marcada como inactiva (`activo = false`), bloquea el acceso y redirige a `/login`.
2.  **`AdminOnlyRoute.tsx`**: Envuelve las vistas exclusivas de gestión empresarial. Si un usuario con el rol de `vendedor` intenta ingresar de forma directa por URL a `/inventario` o `/usuarios`, este componente intercepta el renderizado y devuelve una pantalla de acceso denegado.

# 🚀 Operaciones, Despliegue y Mantenimiento Técnico

Este manual describe las configuraciones de infraestructura, variables de entorno, procesos de empaquetado/despliegue en producción y tareas de mantenimiento del servidor de base de datos para **Estación Color Pinturería**.

---

## 1. Configuración de Despliegue en Netlify

El frontend React se compila como un sitio estático de alto rendimiento y se aloja en Netlify.

### Archivo de Configuración: `netlify.toml`
Para evitar errores de pantalla en blanco (404 Not Found) al recargar páginas internas como `/inventario` o `/dashboard` (ya que React usa enrutamiento virtual por lado del cliente), se debe configurar redirecciones en el archivo `netlify.toml` ubicado en la raíz del proyecto:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 2. Variables de Entorno Requeridas

Para que la aplicación se conecte correctamente con la base de datos de producción, se deben proveer las siguientes variables de entorno. 

### Archivo Local de Configuración (`.env`)
En el entorno local de desarrollo, cree un archivo `.env` en la raíz del subdirectorio `estacion-color-stock/`:
```env
VITE_SUPABASE_URL=https://ywplmolgnktmlmqculzd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cGxtb2xnbmt0bWxtcWN1bHpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgzNjU1MCwiZXhwIjoyMDk1NDEyNTUwfQ.CD53iFmhb7UF9dbyIPvVmDm9KugzztyMf0lTiYWQghM
```

### Configuración en Netlify (Producción)
1.  Ingrese al panel de control de **Netlify**.
2.  Vaya a **Site Configuration** (Configuración del Sitio) > **Environment variables** (Variables de entorno).
3.  Cargue las dos variables mencionadas arriba con sus valores de producción correspondientes.
4.  Active las opciones para que se inyecten durante el build productivo.

---

## 3. Flujo de Compilación y Publicación Manual

Cuando realice cambios en el código local y desee publicarlos en la web:

1.  Abra una terminal Powershell en la carpeta del subproyecto:
    ```powershell
    cd "estacion-color-stock"
    ```
2.  Instale dependencias si es necesario:
    ```powershell
    npm install
    ```
3.  Genere el empaquetado optimizado para producción:
    ```powershell
    npm run build
    ```
    *Este comando ejecutará el compilador estricto de TypeScript (`tsc`) y compilará los assets finales usando Vite.*
4.  Al finalizar, se actualizarán los contenidos de la carpeta `/dist`.
5.  Ingrese a Netlify, diríjase a la sección **"Deploys"** y arrastre la carpeta `/dist` directamente a la zona de subida para actualizar el sitio web activo.

---

## 4. Tareas de Mantenimiento de Base de Datos

### Script de Ajuste de Precios Largos (Overflow)
En caso de que el sistema devuelva errores `numeric field overflow` al procesar importaciones con muchos decimales flotantes, aplique este script de corrección en el editor SQL de Supabase para ampliar la capacidad de las columnas numéricas:

```sql
-- Ampliar precisión a 14 dígitos totales y 2 decimales para pesos argentinos
ALTER TABLE public.variantes
  ALTER COLUMN precio_sin_iva   TYPE NUMERIC(14,2),
  ALTER COLUMN precio_con_iva   TYPE NUMERIC(14,2),
  ALTER COLUMN precio_mostrador TYPE NUMERIC(14,2);
```

### Sincronización Masiva Externa de Precios
Si necesita ejecutar scripts automatizados en Node.js de manera externa (por ejemplo, para actualizar precios de un listado Fadepa en lote cruzando coincidencias de texto), ejecute el archivo de mantenimiento provisto:
```bash
node .\update_fadepa_prices.cjs
```
*Use el parámetro `--dry-run` para previsualizar los cambios en la terminal antes de subirlos a la base de datos de producción.*

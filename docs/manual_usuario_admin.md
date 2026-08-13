# 👑 Manual del Administrador — Gestión y Configuración del Sistema

Este manual documenta las funciones avanzadas de gestión, parametrización comercial, cargas masivas de planillas de stock y administración de usuarios exclusivas para el rol de **Administrador** en **Estación Color Pinturería**.

---

## 1. Gestión Integral del Inventario

Al ingresar con una cuenta de rol `admin`, tendrá acceso al menú **"Inventario"** en la barra lateral.

### A. Alta Manual de Productos
1.  Haga clic en el botón naranja **"Nuevo Producto"** en la esquina superior derecha.
2.  **Formulario Base:**
    *   Ingrese el **Nombre del Producto** (ej: *Látex Profesional Interior*).
    *   Seleccione la **Marca** del listado desplegable.
3.  **Matriz de Variantes (Medidas y Precios):**
    *   Defina la presentación (ej: *x 1000cc*, *4 Lts*, *20 Lts*).
    *   Ingrese el **Costo sin IVA**. El sistema calculará y completará de forma sugerida los campos de **Costo con IVA (Costo + 21%)** y **Precio de Venta (Costo con IVA + 20%)**.
    *   Asigne el stock físico inicial.
4.  Haga clic en **"Guardar"** para insertar el producto y sus presentaciones en la base de datos.

### B. Edición Rápida en Grilla
*   Para corregir rápidamente un precio o un stock de una variante específica, haga clic sobre el valor numérico directamente en la tabla de inventario.
*   Modifique el importe en la casilla emergente y presione **Enter** o haga clic en el tacho de confirmación para impactar los cambios inmediatamente en Supabase.

---

## 2. Motor de Importación Masiva (Excel)

Cuando el proveedor entrega una planilla nueva con variaciones de precios o stock, utilice el importador para evitar cargas manuales individuales.

```
📁 Seleccionar Archivo (.xlsx)
  │
  ▼
🔍 Escaneo de Banners y Búsqueda de Cabeceras (excelParser.ts)
  │
  ▼
📋 Vista de Preview de Registros en Pantalla
  │
  ├── 🟢 Fila Correcta: Coincide nombre y marca. Lista para actualizar.
  └── 🔴 Fila con Alerta: Datos incompletos, tipo de texto inválido o marcas faltantes.
  │
  ▼
💾 Confirmar Importación (Envíos en lotes de 50 ítems por segundo)
```

### Paso a Paso para Importar
1.  En la pantalla de Inventario, haga clic en **"Importar Excel"**.
2.  Haga clic en el recuadro de arrastre y seleccione el archivo de precios del proveedor (ej: *LISTA DE PRECIOS y STOCK 1.xlsx*).
3.  **Procesamiento automático:** El parser saltará las filas decorativas superiores y extraerá los encabezados reales de las columnas.
4.  **Control del Preview:**
    *   Revise las columnas de precios y stock procesadas en pantalla.
    *   Si el importador detecta registros huérfanos o con errores de formato, estos se marcarán con colores de advertencia.
5.  **Ejecutar:** Si la información es consistente, presione **"Confirmar Importación"**. El frontend procesará las inserciones/actualizaciones en lotes ordenados para prevenir sobrecargas del servidor de base de datos.

---

## 3. Limpieza de Catálogo (Mecanismo Antiguo-Obsoleto)

Si ha cambiado de proveedor o desea renovar por completo una lista de productos para no mezclar artículos en desuso en el buscador de ventas:

1.  Haga clic en el botón **"Limpiar Catálogo"** en el panel de Inventario.
2.  Confirme la advertencia de seguridad.
3.  **Lógica del Proceso:** El sistema borrará las variantes actuales de la base de datos para limpiar el buscador del POS, pero **no borrará las estadísticas ni los totales del historial de facturación de ventas pasadas** (los detalles históricos mantendrán los datos de precios congelados al momento de cada transacción para no arruinar el balance contable).

---

## 4. Gestión de Usuarios y Permisos de Personal

1.  Ingrese a la sección **"Usuarios"** desde el menú lateral.
2.  Visualizará la grilla con todos los empleados registrados.
3.  **Modificar Rol:** Puede alternar los permisos de cualquier empleado entre **vendedor** (facturación básica) y **admin** (control total) haciendo clic en los botones de acción de su fila.
4.  **Suspender Cuentas:** Si un empleado deja la empresa, haga clic en **"Desactivar"** en lugar de eliminar el usuario. Esto impedirá que inicie sesión o acceda a la URL web, pero conservará la autoría de sus comprobantes cobrados anteriormente para los balances de caja.

---

## 5. Control de Convenios y Proveedores

*   **Proveedores:** Registro de firmas y distribuidoras aliadas. Permite clasificar marcas y costos asociados durante las compras.
*   **Convenios (Cuentas Corrientes):** Permite registrar convenios especiales de crédito (ej: gremios, empresas constructoras, pintores de confianza). Al registrar un convenio, el vendedor podrá autorizar ventas a "Cuenta Corriente" en el POS, impactando la deuda del cliente en el módulo de balances de cuentas a liquidar a fin de mes.

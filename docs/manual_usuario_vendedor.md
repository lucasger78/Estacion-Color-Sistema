# 🛒 Manual del Vendedor — Caja y Facturación

Este manual describe el funcionamiento de la terminal de caja diaria (**Punto de Venta**) para vendedores y cajeros de **Estación Color Pinturería**.

---

## 1. Acceso al Sistema

1.  Abra el navegador en la dirección web del sistema: [https://estacioncolorsistema.netlify.app](https://estacioncolorsistema.netlify.app).
2.  Si no ha iniciado sesión, el sistema lo redirigirá automáticamente a la pantalla de **Login**.
3.  Ingrese su correo electrónico y su contraseña personal.
4.  Haga clic en **"Ingresar"**. Será redirigido automáticamente a la pantalla de **Punto de Venta** (Facturación).

---

## 2. Buscar y Agregar Productos al Carrito

La parte izquierda de la pantalla cuenta con el buscador y el listado de compras:

```
┌────────────────────────────────────────────────────────┐
│ 🔍 Buscar por nombre, marca o código...                 │
└────────────────────────────────────────────────────────┘
  │
  ├─► Triple Accion Blanco Brillante x 1000cc - Stock: 15 ── [Agregar]
  ├─► Triple Accion Blanco Brillante x 500cc  - Stock: 6  ── [Agregar]
  └─► Esmalte Sint. Negro Mate x 1000cc       - Stock: 0  ── [Sin Stock]
```

1.  Haga clic en el cuadro de texto **"Buscar por nombre, marca o código..."**.
2.  Comience a escribir. El sistema buscará coincidencias a partir de la segunda letra ingresada (ej: `fadepa satinado`).
3.  **Visualización Completa:** El buscador desplegará todas las variantes correspondientes sin límite de cantidad. Puede desplazarse hacia abajo con la rueda del ratón (scroll) para ver presentaciones más grandes.
4.  Haga clic sobre el producto deseado para agregarlo al carrito de compras.
    *   *Nota:* Si un producto no tiene unidades suficientes, el sistema le impedirá agregarlo y mostrará una alerta indicando **"Stock Insuficiente"**.

---

## 3. Gestionar el Carrito de Compras

Una vez cargados los productos, puede modificarlos directamente en la lista del carrito:

*   **Aumentar cantidad:** Haga clic en el botón **`+`** al lado del número de unidades. Si supera el stock físico de la tienda, el sistema mostrará una advertencia y bloqueará el incremento.
*   **Disminuir cantidad:** Haga clic en el botón **`-`** para reducir la cantidad. El valor mínimo admitido es 1.
*   **Eliminar artículo:** Haga clic en el icono del **Tacho de Basura (Rojo)** a la derecha del ítem para retirarlo del carrito de compras.
*   **Totalizador:** En la parte inferior del bloque del carrito se actualiza automáticamente el monto total de la venta en pesos argentinos ($ ARS).

---

## 4. Registrar y Cobrar la Venta

El bloque derecho (**Panel de Cobro**) contiene los datos finales para liquidar la operación de caja:

1.  **Nombre del Cliente:** Ingrese el nombre del comprador (ej: *Juan Pérez*). Si lo deja vacío, se registrará de manera predeterminada como **"Consumidor Final"**.
2.  **Medio de Pago:** Seleccione cómo abona el cliente haciendo clic en el casillero correspondiente:
    *   💵 **Efectivo**
    *   💳 **Débito**
    *   💳 **Crédito**
    *   📱 **Transferencia**
    *   🏦 **Cta. Corriente** (Exclusivo para clientes autorizados mediante convenios de crédito).
3.  **Notas de Caja:** Cuadro de texto libre para ingresar datos útiles (ej: *Nro. de transferencia, retirar por depósito por la tarde, etc.*).
4.  **Confirmación:** Haga clic en el botón **"Cobrar Venta"**.
    *   Si el cobro se registra con éxito en el servidor, el carrito se limpiará y se mostrará un mensaje destacado en verde con el número de comprobante emitido.

---

## 5. Impresión de Comprobantes

Al finalizar una venta exitosa:
1.  En el cuadro verde de confirmación aparecerá el botón **"Imprimir Comprobante"** o **"Descargar PDF"**.
2.  Haga clic para abrir la ventana de previsualización de impresión del navegador.
3.  El diseño está adaptado para optimizar el papel de impresión. Seleccione su impresora térmica o de escritorio para emitir el comprobante físico del cliente.

---

## 6. Consultar Ventas del Día (Historial)

Si necesita revisar cobros realizados durante el turno corriente:

1.  En la parte superior de la página, cambie de pestaña haciendo clic en **"Historial de Hoy"**.
2.  Visualizará la lista de todas las operaciones cobradas en la fecha ordenadas cronológicamente.
3.  Cada ticket de la lista detalla el número de comprobante, el total en pesos, el nombre del cliente, el medio de pago utilizado y la lista detallada de pinturas y unidades vendidas.

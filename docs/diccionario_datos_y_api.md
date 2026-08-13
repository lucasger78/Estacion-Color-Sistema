# 🗄️ Diccionario de Datos y Funciones del Servidor (RPC)

Este documento detalla la estructura física de la base de datos PostgreSQL alojada en Supabase, las relaciones entre entidades, las restricciones de integridad y las funciones de base de datos utilizadas en **Estación Color Pinturería**.

---

## 1. Esquema de Base de Datos y Diccionario de Tablas

### 📋 Tabla: `marcas`
Registra los fabricantes de los productos cargados.
*   `id` (`INTEGER` - Autogenerado secuencial, Clave Primaria): Identificador único de la marca.
*   `nombre` (`TEXT` - Único, No Nulo): Nombre comercial de la marca (ej: `FADEPA`, `ANCLAFLEX`, `CETOL`).
*   `creado_at` (`TIMESTAMPTZ` - Default: `NOW()`): Registro temporal de creación de la fila.

### 📋 Tabla: `usuarios`
Perfiles y roles asociados a los inicios de sesión de Supabase Auth.
*   `id` (`UUID` - Clave Primaria, Referencia a `auth.users(id)` con eliminación en cascada): Llave de emparejamiento con el motor de autenticación.
*   `email` (`TEXT` - Único, No Nulo): Dirección de correo registrada.
*   `nombre_completo` (`TEXT` - Default: `'Nuevo Vendedor'`): Nombre y apellido del empleado.
*   `rol` (`TEXT` - Default: `'vendedor'`): Rol del usuario en el sistema. Restringido mediante `CHECK (rol IN ('admin', 'vendedor'))`.
*   `activo` (`BOOLEAN` - Default: `TRUE`): Define si el usuario tiene permitido acceder al sistema.
*   `creado_at` / `actualizado_at` (`TIMESTAMPTZ`): Fechas de control de auditoría.

### 📋 Tabla: `productos`
Contiene la información genérica de los productos sin diferenciar tamaños o precios.
*   `id` (`INTEGER` - Autogenerado secuencial, Clave Primaria): Identificador interno.
*   `nombre` (`TEXT` - No Nulo): Nombre base del producto (ej: `Latex Profesional Interior`, `Esmalte Sint. Blanco`).
*   `marca_id` (`INTEGER` - Referencia a `marcas(id)` con valor nulo al eliminar la marca): Marca comercial dueña del artículo.
*   `creado_at` (`TIMESTAMPTZ`): Auditoría.

### 📋 Tabla: `variantes`
Detalla las presentaciones específicas de stock y precios de cada producto.
*   `id` (`INTEGER` - Autogenerado secuencial, Clave Primaria): Clave primaria de control.
*   `producto_id` (`INTEGER` - Referencia a `productos(id)` con eliminación en cascada): Producto base al que pertenece.
*   `variante` (`TEXT` - No Nulo): Presentación comercial (ej: `x 1000cc`, `x 4000cc`, `20 Lts`).
*   `precio_sin_iva` (`NUMERIC(14,2)` - Default `0.00`): Costo neto del proveedor.
*   `precio_con_iva` (`NUMERIC(14,2)` - Default `0.00`): Costo del proveedor con impuestos.
*   `precio_mostrador` (`NUMERIC(14,2)` - Default `0.00`): Precio de venta sugerido al público.
*   `stock_actual` (`INTEGER` - Default `0`): Stock real físico en el depósito.
*   `stock_disponible` (`INTEGER` - Default `0`): Cantidad física disponible para la venta (excluyendo reservas temporales).
*   `fecha_vencimiento` (`DATE` - Opcional): Fecha límite de uso comercial.
*   `activo` (`BOOLEAN` - Default `TRUE`): Determina si se ofrece al cliente.
*   `created_at` / `updated_at` (`TIMESTAMPTZ`): Tiempos de registro.

### 📋 Tabla: `ventas`
Encabezado de los comprobantes de caja emitidos diariamente.
*   `id` (`INTEGER` - Autogenerado secuencial, Clave Primaria): Identificador.
*   `numero_comprobante` (`BIGSERIAL` - Único): Número correlativo autoincremental de control de caja.
*   `usuario_id` (`UUID` - Referencia a `usuarios(id)`): Vendedor que procesó el cobro.
*   `cliente_nombre` (`TEXT` - Default `'Consumidor Final'`): Nombre del comprador.
*   `medio_pago` (`TEXT`): Medio de cobro de la preventa (`efectivo`, `debito`, `credito`, `transferencia`, `cuenta_corriente`).
*   `monto_total` (`NUMERIC(14,2)` - Default `0.00`): Importe final liquidado.
*   `notas` (`TEXT` - Opcional): Comentarios de caja.
*   `fecha_venta` (`TIMESTAMPTZ` - Default `NOW()`): Fecha exacta de facturación.

### 📋 Tabla: `ventas_detalle`
Registra los artículos individuales que integran cada ticket de venta.
*   `id` (`UUID` - Clave Primaria - Default: `gen_random_uuid()`): Identificador del detalle.
*   `venta_id` (`INTEGER` - Referencia a `ventas(id)` con eliminación en cascada): Ticket cabecera.
*   `producto_id` (`INTEGER` - Referencia a `productos(id)`): Producto genérico.
*   `variante_id` (`INTEGER` - Referencia a `variantes(id)` con asignación a nulo si se elimina la variante): Variante específica vendida.
*   `cantidad` (`INTEGER` - No Nulo con validación `CHECK (cantidad > 0)`): Unidades vendidas.
*   `precio_unitario` (`NUMERIC(14,2)`): Precio unitario de la variante al momento del cobro.
*   `subtotal` (`NUMERIC(14,2)` - Autocalculado generado): `cantidad * precio_unitario`.

---

## 2. Lógica del Servidor: RPC Transaccional de Ventas

El descuento de stock y facturación no se realiza de forma directa mediante múltiples queries REST en el frontend. Para asegurar la atomicidad (que todo se guarde o todo falle), el cliente React realiza una llamada RPC a la función `procesar_venta_transaccion`:

```sql
CREATE OR REPLACE FUNCTION public.procesar_venta_transaccion(
    p_usuario_id   UUID,
    p_cliente      TEXT,
    p_medio_pago   TEXT,
    p_notas        TEXT,
    p_items        JSONB -- Array de formato: [{"producto_id": X, "variante_id": Y, "cantidad": Z, "precio_unitario": W}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_venta_id     INTEGER;
    v_total        NUMERIC(12,2) := 0;
    v_item         JSONB;
    v_producto_id  INTEGER;
    v_variante_id  INTEGER;
    v_cantidad     INT;
    v_precio       NUMERIC(12,2);
    v_stock_actual INT;
BEGIN
    -- 1. Validaciones básicas de integridad
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta debe tener al menos un ítem.';
    END IF;

    IF p_medio_pago NOT IN ('efectivo', 'debito', 'credito', 'transferencia', 'cuenta_corriente') THEN
        RAISE EXCEPTION 'Medio de pago inválido: %', p_medio_pago;
    END IF;

    -- 2. Crear cabecera de la venta
    INSERT INTO public.ventas (usuario_id, cliente_nombre, medio_pago, notas, monto_total)
    VALUES (
        p_usuario_id,
        COALESCE(NULLIF(TRIM(p_cliente), ''), 'Consumidor Final'),
        p_medio_pago,
        p_notas,
        0
    )
    RETURNING id INTO v_venta_id;

    -- 3. Iterar y procesar ítems del carrito
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_producto_id := (v_item->>'producto_id')::INTEGER;
        v_variante_id := NULLIF((v_item->>'variante_id')::TEXT, '')::INTEGER;
        v_cantidad    := (v_item->>'cantidad')::INT;
        v_precio      := (v_item->>'precio_unitario')::NUMERIC;

        IF v_cantidad <= 0 THEN
            RAISE EXCEPTION 'Cantidad inválida para producto %.', v_producto_id;
        END IF;

        -- 4. Bloquear y verificar stock de la variante
        IF v_variante_id IS NOT NULL THEN
            SELECT stock_disponible INTO v_stock_actual
            FROM public.variantes WHERE id = v_variante_id FOR UPDATE;

            IF v_stock_actual IS NULL THEN
                RAISE EXCEPTION 'Variante % no encontrada.', v_variante_id;
            END IF;

            -- 5. Actualizar inventario físico
            UPDATE public.variantes
            SET stock_disponible = GREATEST(0, stock_disponible - v_cantidad),
                stock_actual     = GREATEST(0, stock_actual - v_cantidad)
            WHERE id = v_variante_id;
        ELSE
            RAISE EXCEPTION 'Se requiere variante_id para registrar la venta.';
        END IF;

        -- 6. Grabar desglose
        INSERT INTO public.ventas_detalle (venta_id, producto_id, variante_id, cantidad, precio_unitario)
        VALUES (v_venta_id, v_producto_id, v_variante_id, v_cantidad, v_precio);

        v_total := v_total + (v_cantidad * v_precio);
    END LOOP;

    -- 7. Actualizar monto acumulado final
    UPDATE public.ventas SET monto_total = v_total WHERE id = v_venta_id;

    RETURN jsonb_build_object(
        'success',     true,
        'venta_id',    v_venta_id,
        'monto_total', v_total
    );
EXCEPTION
    WHEN OTHERS THEN
        -- PostgreSQL realiza automáticamente el ROLLBACK completo de la transacción
        RAISE;
END;
$$;
```

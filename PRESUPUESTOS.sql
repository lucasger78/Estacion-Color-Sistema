-- ============================================================
-- MÓDULO DE PRESUPUESTOS — ESTACIÓN COLOR PINTURERÍAS
-- ⚠️ Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Tabla de Presupuestos (Cabecera)
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id                 BIGSERIAL PRIMARY KEY,
    numero_presupuesto BIGSERIAL UNIQUE,
    usuario_id         UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    cliente_id         BIGINT REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nombre     TEXT NOT NULL DEFAULT 'Cliente Ocasional',
    cliente_telefono   TEXT,
    cliente_email      TEXT,
    cliente_direccion  TEXT,
    monto_total        NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    validez_dias       INTEGER NOT NULL DEFAULT 15,
    notas              TEXT,
    estado             TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'vencido', 'rechazado')),
    fecha_presupuesto  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Detalle de Presupuestos (Ítems)
CREATE TABLE IF NOT EXISTS public.presupuestos_detalle (
    id               BIGSERIAL PRIMARY KEY,
    presupuesto_id   BIGINT NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    producto_id      INTEGER REFERENCES public.productos(id) ON DELETE SET NULL,
    variante_id      INTEGER REFERENCES public.variantes(id) ON DELETE SET NULL,
    nombre_producto  TEXT NOT NULL,
    presentacion     TEXT,
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    subtotal         NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- 3. Habilitar Seguridad RLS
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_detalle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_presupuestos_select" ON public.presupuestos;
DROP POLICY IF EXISTS "auth_presupuestos_all" ON public.presupuestos;
CREATE POLICY "auth_presupuestos_select" ON public.presupuestos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_presupuestos_all" ON public.presupuestos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_presupuestos_detalle_select" ON public.presupuestos_detalle;
DROP POLICY IF EXISTS "auth_presupuestos_detalle_all" ON public.presupuestos_detalle;
CREATE POLICY "auth_presupuestos_detalle_select" ON public.presupuestos_detalle FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_presupuestos_detalle_all" ON public.presupuestos_detalle FOR ALL TO authenticated USING (true) WITH CHECK (true);

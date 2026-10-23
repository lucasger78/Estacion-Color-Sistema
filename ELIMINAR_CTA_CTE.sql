-- ============================================================
-- RPC: eliminar_cta_cte
-- Elimina todos los movimientos de cuenta corriente de un cliente
-- y resetea su saldo a 0. El cliente NO se elimina.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION eliminar_cta_cte(p_cliente_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- 1. Borrar todos los movimientos de cuenta corriente
  DELETE FROM cuenta_corriente_movimientos
  WHERE cliente_id = p_cliente_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 2. Resetear saldo del cliente a 0
  UPDATE clientes
  SET saldo_actual = 0,
      updated_at = NOW()
  WHERE id = p_cliente_id;

  RETURN json_build_object(
    'success', true,
    'movimientos_eliminados', v_deleted
  );
END;
$$;

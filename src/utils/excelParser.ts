/**
 * excelParser.ts
 * Importación y exportación de datos en formato .xlsx y .csv
 * usando la librería SheetJS (xlsx).
 */
import * as XLSX from 'xlsx'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ProductoImportRow {
  nombre:                string
  presentacion:          string
  marca:                 string
  precio_costo_sin_iva:  number
  precio_costo_con_iva:  number
  precio_venta:          number
  stock_actual:          number
  stock_minimo:          number
  codigo_barras?:        string
}

// ── Mapeo de columnas del Excel de Estación Color ──────────────────────────

const COLUMN_ALIASES: Record<string, keyof ProductoImportRow> = {
  // Nombre / descripción
  'nombre':               'nombre',
  'descripcion':          'nombre',
  'producto':             'nombre',
  'articulo':             'nombre',
  'detalle':              'nombre',

  // Presentación / medida
  'presentacion':         'presentacion',
  'medida':               'presentacion',
  'presentacion/medida':  'presentacion',
  'envase':               'presentacion',
  'formato':              'presentacion',

  // Marca
  'marca':                'marca',
  'proveedor':            'marca',
  'fabricante':           'marca',

  // Precios
  'costo s/iva':          'precio_costo_sin_iva',
  'costo sin iva':        'precio_costo_sin_iva',
  'precio s/iva':         'precio_costo_sin_iva',
  'precio sin iva':       'precio_costo_sin_iva',
  'costo s iva':          'precio_costo_sin_iva',
  'precio s iva':         'precio_costo_sin_iva',
  'costo neto':           'precio_costo_sin_iva',

  'costo c/iva':          'precio_costo_con_iva',
  'costo con iva':        'precio_costo_con_iva',
  'precio c/iva':         'precio_costo_con_iva',
  'precio con iva':       'precio_costo_con_iva',
  'costo c iva':          'precio_costo_con_iva',
  'precio c iva':         'precio_costo_con_iva',
  'costo final':          'precio_costo_con_iva',

  'precio venta':         'precio_venta',
  'precio de venta':      'precio_venta',
  'precio mostrador':     'precio_venta',
  'precio publico':       'precio_venta',
  'precio al publico':    'precio_venta',
  'venta':                'precio_venta',

  // Stock
  'stock':                'stock_actual',
  'stock actual':         'stock_actual',
  'stock disponible':     'stock_actual',
  'unidades':             'stock_actual',
  'cantidad':             'stock_actual',

  'stock minimo':         'stock_minimo',
  'stock mínimo':         'stock_minimo',
  'minimo':               'stock_minimo',

  // Código de barras
  'codigo barras':        'codigo_barras',
  'código de barras':     'codigo_barras',
  'codigo de barras':     'codigo_barras',
  'ean':                  'codigo_barras',
}


/** Normaliza un header de columna para el mapeo. */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar tildes
    .replace(/[^a-z0-9\s/]/g, '')    // quitar caracteres especiales
    .trim()
}

// ── IMPORTACIÓN ────────────────────────────────────────────────────────────

/**
 * Parsea un archivo .xlsx o .csv y retorna un array de ProductoImportRow.
 * Lanza un Error si el archivo no tiene las columnas mínimas requeridas.
 */
export async function parseProductosFile(file: File): Promise<ProductoImportRow[]> {
  const buffer = await file.arrayBuffer()
  const wb     = XLSX.read(buffer, { type: 'array', cellText: false, cellDates: true })
  const ws     = wb.Sheets[wb.SheetNames[0]]
  const raw    = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval:  '',
    raw:     false,
  })

  if (raw.length === 0) throw new Error('El archivo está vacío o no tiene datos válidos.')

  // Obtener headers del primer row y mapearlos
  const firstRow = raw[0]
  const headerMap: Record<string, keyof ProductoImportRow> = {}

  for (const originalKey of Object.keys(firstRow)) {
    const normalized = normalizeHeader(originalKey)
    if (COLUMN_ALIASES[normalized]) {
      headerMap[originalKey] = COLUMN_ALIASES[normalized]
    }
  }

  // Validar columnas mínimas
  const mappedFields = new Set(Object.values(headerMap))
  if (!mappedFields.has('nombre') || !mappedFields.has('precio_venta')) {
    throw new Error(
      'El archivo debe contener al menos las columnas "Nombre" y "Precio Venta/Mostrador".'
    )
  }

  // Mapear cada fila
  const result: ProductoImportRow[] = []

  for (const row of raw) {
    const mapped: Partial<ProductoImportRow> = {
      nombre:                '',
      presentacion:          '',
      marca:                 '',
      precio_costo_sin_iva:  0,
      precio_costo_con_iva:  0,
      precio_venta:          0,
      stock_actual:          0,
      stock_minimo:          5,
    }

    for (const [originalKey, field] of Object.entries(headerMap)) {
      const rawValue = row[originalKey]

      if (field === 'nombre' || field === 'presentacion' || field === 'marca' || field === 'codigo_barras') {
        mapped[field] = String(rawValue ?? '').trim() as never
      } else {
        // Numérico: soporta formato argentino (1.234,56) y estándar (1234.56)
        let str = String(rawValue ?? '0').replace(/[$\s]/g, '').trim()

        // Detectar formato: si hay coma Y punto, el último separador es el decimal
        const hasComma = str.includes(',')
        const hasDot   = str.includes('.')

        if (hasComma && hasDot) {
          // Formato argentino: 1.234,56 → quitar puntos de miles, coma → punto
          const lastComma = str.lastIndexOf(',')
          const lastDot   = str.lastIndexOf('.')
          if (lastComma > lastDot) {
            // coma es decimal: 1.234,56
            str = str.replace(/\./g, '').replace(',', '.')
          } else {
            // punto es decimal: 1,234.56
            str = str.replace(/,/g, '')
          }
        } else if (hasComma && !hasDot) {
          // Solo coma: puede ser decimal (1234,56) o miles (1,234)
          // Si hay exactamente 3 dígitos después de la coma → miles; sino → decimal
          const afterComma = str.split(',')[1] || ''
          if (afterComma.length === 3) {
            str = str.replace(',', '') // miles
          } else {
            str = str.replace(',', '.') // decimal
          }
        } else if (hasDot && !hasComma) {
          // Solo punto: puede ser decimal (1234.56) o miles (1.234)
          const afterDot = str.split('.')[1] || ''
          if (afterDot.length === 3 && !str.includes('.', str.indexOf('.') + 1)) {
            str = str.replace('.', '') // miles
          }
          // sino lo dejamos como está (punto decimal normal)
        }

        const num = parseFloat(str)
        mapped[field] = (isNaN(num) ? 0 : num) as never
      }
    }

    // Omitir filas sin nombre
    if (!mapped.nombre) continue

    result.push(mapped as ProductoImportRow)
  }

  return result
}

// ── EXPORTACIÓN ────────────────────────────────────────────────────────────

export interface ExportProducto {
  'Código Barras'?:     string
  'Nombre':             string
  'Presentación':       string
  'Marca':              string
  'Costo S/IVA':        number
  'Costo C/IVA':        number
  'Precio Venta':       number
  'Stock Actual':       number
  'Stock Mínimo':       number
  'Estado':             string
}

/** Exporta un array de objetos a un archivo .xlsx y lo descarga en el navegador. */
export function exportToExcel(data: ExportProducto[], fileName = 'Estacion_Color_Stock'): void {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 15 }, // Código
    { wch: 35 }, // Nombre
    { wch: 15 }, // Presentación
    { wch: 15 }, // Marca
    { wch: 14 }, // Costo S/IVA
    { wch: 14 }, // Costo C/IVA
    { wch: 14 }, // Precio Venta
    { wch: 12 }, // Stock Actual
    { wch: 12 }, // Stock Mínimo
    { wch: 12 }, // Estado
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/** Exporta un array de objetos a un archivo .csv y lo descarga en el navegador. */
export function exportToCSV(data: ExportProducto[], fileName = 'Estacion_Color_Stock'): void {
  const ws  = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(ws)

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

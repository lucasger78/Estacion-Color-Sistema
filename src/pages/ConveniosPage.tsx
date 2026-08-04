import { useState } from 'react'
import {
  Plus, Tag, Percent, Search, Edit3, Trash2,
  Check, X, Package, RefreshCw,
  Users, ArrowLeft, Eye,
} from 'lucide-react'
import {
  useConvenios, useCreateConvenio, useUpdateConvenio,
  useDeleteConvenio, useListaPrecios, useConvenioDetalle,
  type TipoAplicacion, type Convenio,
} from '../hooks/useConvenios'
import { useMarcas, useProductos } from '../hooks/useProductos'
import { formatARS } from '../utils/formatters'
import Swal from 'sweetalert2'

// ── Helpers ────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoAplicacion, string> = {
  todos:     'Todos los productos',
  marcas:    'Por marca',
  productos: 'Productos específicos',
}

const TIPO_COLORS: Record<TipoAplicacion, string> = {
  todos:     'bg-emerald-100 text-emerald-700',
  marcas:    'bg-blue-100 text-blue-700',
  productos: 'bg-violet-100 text-violet-700',
}

// ── Modal Crear / Editar Convenio ──────────────────────────────────────────

function ConvenioModal({
  convenio,
  onClose,
}: {
  convenio: Convenio | null
  onClose:  () => void
}) {
  const { data: marcas = [] }         = useMarcas()
  const { data: productos = [] }      = useProductos('')
  const createConvenio                = useCreateConvenio()
  const updateConvenio                = useUpdateConvenio()
  const { data: detalle }             = useConvenioDetalle(convenio?.id ?? null)

  const [nombre,      setNombre]      = useState(convenio?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(convenio?.descripcion ?? '')
  const [descPct,     setDescPct]     = useState(String(convenio?.descuento_pct ?? ''))
  const [tipo,        setTipo]        = useState<TipoAplicacion>(convenio?.tipo_aplicacion ?? 'todos')
  const [activo,      setActivo]      = useState(convenio?.activo ?? true)
  const [marcaIds,    setMarcaIds]    = useState<number[]>(
    detalle?.convenios_marcas?.map(m => m.marca_id) ?? []
  )
  const [varIds,      setVarIds]      = useState<number[]>(
    detalle?.convenios_productos?.map(p => p.variante_id) ?? []
  )
  const [searchProd,  setSearchProd]  = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const loading = createConvenio.isPending || updateConvenio.isPending

  const toggleMarca = (id: number) =>
    setMarcaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleVariante = (id: number) =>
    setVarIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    const pct = parseFloat(descPct)
    if (isNaN(pct) || pct <= 0) return setError('Ingresá un descuento válido (mayor a 0).')
    if (tipo === 'marcas' && marcaIds.length === 0) return setError('Seleccioná al menos una marca.')
    if (tipo === 'productos' && varIds.length === 0) return setError('Seleccioná al menos un producto.')

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      descuento_pct: pct,
      tipo_aplicacion: tipo,
      activo,
      marca_ids: marcaIds,
      variante_ids: varIds,
    }

    try {
      if (convenio) {
        await updateConvenio.mutateAsync({ id: convenio.id, ...payload })
      } else {
        await createConvenio.mutateAsync(payload)
      }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al guardar.')
    }
  }

  const productosFiltrados = productos.filter(p =>
    searchProd.length < 2 ||
    p.nombre.toLowerCase().includes(searchProd.toLowerCase()) ||
    (p.presentacion ?? '').toLowerCase().includes(searchProd.toLowerCase())
  )

  const labelClass = 'block text-xs font-bold text-secondary-400 uppercase tracking-wider mb-1.5'
  const inputClass = 'input-field'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-secondary/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 animate-fade-in max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Tag className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-secondary">
                {convenio ? 'Editar Convenio' : 'Nuevo Convenio'}
              </h3>
              <p className="text-xs text-secondary-400">Lista de precios especial por segmento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* Nombre + descripción */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Nombre del convenio *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Arquitectos, Decoradores…" className={inputClass} autoFocus />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Descuento *</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0.1" max="100" step="0.01"
                  value={descPct} onChange={e => setDescPct(e.target.value)}
                  placeholder="Ej: 20" className={`${inputClass} flex-1`} />
                <span className="text-xl font-extrabold text-secondary">%</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Descripción (opcional)</label>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Convenio para estudio de arquitectura" className={inputClass} />
            </div>
          </div>

          {/* Tipo de aplicación */}
          <div>
            <label className={labelClass}>Aplicar descuento a</label>
            <div className="grid grid-cols-3 gap-2">
              {(['todos', 'marcas', 'productos'] as TipoAplicacion[]).map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setTipo(t)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    tipo === t
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-secondary-400 hover:border-violet-200'
                  }`}
                >
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Selección de marcas */}
          {tipo === 'marcas' && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <p className="text-xs font-bold text-secondary-400 uppercase">
                  Marcas incluidas ({marcaIds.length} seleccionadas)
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 grid grid-cols-2 gap-2">
                {marcas.map(m => (
                  <button
                    key={m.id} type="button"
                    onClick={() => toggleMarca(m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-all ${
                      marcaIds.includes(m.id)
                        ? 'border-violet-400 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-secondary-400 hover:border-violet-200'
                    }`}
                  >
                    {marcaIds.includes(m.id)
                      ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      : <div className="w-3.5 h-3.5 rounded border border-slate-300 flex-shrink-0" />
                    }
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selección de productos */}
          {tipo === 'productos' && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                <p className="text-xs font-bold text-secondary-400 uppercase flex-1">
                  Productos incluidos ({varIds.length} seleccionados)
                </p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary-400" />
                  <input
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                    placeholder="Buscar…"
                    className="pl-7 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto p-3 space-y-1">
                {productosFiltrados.slice(0, 80).map(p => (
                  <button
                    key={p.id} type="button"
                    onClick={() => toggleVariante(p.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                      varIds.includes(p.id)
                        ? 'border-violet-400 bg-violet-50 text-violet-700'
                        : 'border-transparent hover:bg-slate-50 text-secondary'
                    }`}
                  >
                    {varIds.includes(p.id)
                      ? <Check className="w-3.5 h-3.5 flex-shrink-0 text-violet-600" />
                      : <div className="w-3.5 h-3.5 rounded border border-slate-300 flex-shrink-0" />
                    }
                    <span className="truncate">{p.nombre}</span>
                    {p.presentacion && <span className="text-xs text-secondary-400 ml-auto flex-shrink-0">{p.presentacion}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActivo(a => !a)}
              className={`w-11 h-6 rounded-full transition-colors ${activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${activo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-secondary">
              Convenio {activo ? 'activo' : 'inactivo'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-danger font-medium bg-danger-light px-4 py-2 rounded-xl">
              {error}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando…</>
                : <><Check className="w-4 h-4" /> {convenio ? 'Guardar cambios' : 'Crear convenio'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Vista Lista de Precios ─────────────────────────────────────────────────

function ListaPreciosView({
  convenioId,
  convenioNombre,
  descuentoPct,
  onBack,
}: {
  convenioId:     number
  convenioNombre: string
  descuentoPct:   number
  onBack:         () => void
}) {
  const [search, setSearch] = useState('')
  const { data: lista = [], isLoading } = useListaPrecios(convenioId)

  const filtrada = lista.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.marca.toLowerCase().includes(search.toLowerCase()) ||
    p.variante.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-600" />
            Lista de Precios: {convenioNombre}
          </h2>
          <p className="text-sm text-secondary-400">
            {descuentoPct}% de descuento · {filtrada.length} productos
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto o marca…"
          className="input-field pl-10"
        />
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-3 text-secondary-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Cargando lista de precios…
          </div>
        ) : filtrada.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-secondary-400">
            <Package className="w-8 h-8 opacity-30" />
            <p className="text-sm">No hay productos en este convenio</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left rounded-tl-2xl">Producto</th>
                  <th className="table-header">Marca</th>
                  <th className="table-header">Precio Normal</th>
                  <th className="table-header text-violet-700 rounded-tr-2xl">
                    Precio Convenio (-{descuentoPct}%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell">
                      <p className="font-semibold text-secondary text-sm">{p.nombre}</p>
                      {p.variante && p.variante !== p.nombre && (
                        <p className="text-xs text-secondary-400">{p.variante}</p>
                      )}
                    </td>
                    <td className="table-cell text-center text-xs text-secondary-400">{p.marca}</td>
                    <td className="table-cell text-center text-sm text-secondary-400 line-through">
                      {formatARS(p.precio_original)}
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-base font-extrabold text-violet-700">
                        {formatARS(p.precio_convenio)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página Principal ───────────────────────────────────────────────────────

export default function ConveniosPage() {
  const { data: convenios = [], isLoading } = useConvenios()
  const deleteConvenio                       = useDeleteConvenio()

  const [showModal,        setShowModal]        = useState(false)
  const [editConvenio,     setEditConvenio]     = useState<Convenio | null>(null)
  const [viendoLista,      setViendoLista]      = useState<Convenio | null>(null)
  const [search,           setSearch]           = useState('')

  const filtrados = convenios.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (c: Convenio) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${c.nombre}"?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E55B2B',
    })
    if (result.isConfirmed) {
      await deleteConvenio.mutateAsync(c.id)
    }
  }

  // Vista de lista de precios
  if (viendoLista) {
    return (
      <ListaPreciosView
        convenioId={viendoLista.id}
        convenioNombre={viendoLista.nombre}
        descuentoPct={viendoLista.descuento_pct}
        onBack={() => setViendoLista(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Modal */}
      {showModal && (
        <ConvenioModal
          convenio={editConvenio}
          onClose={() => { setShowModal(false); setEditConvenio(null) }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-600" />
            Convenios y Listas de Precios
          </h2>
          <p className="text-sm text-secondary-400">
            {convenios.length} convenios registrados
          </p>
        </div>
        <button
          onClick={() => { setEditConvenio(null); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nuevo convenio
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar convenio…"
          className="input-field pl-10"
        />
      </div>

      {/* Lista de convenios */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-secondary-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando convenios…
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 gap-3 text-secondary-400">
          <Users className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">
            {search ? 'Sin resultados' : 'No hay convenios creados aún'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear primer convenio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => (
            <div
              key={c.id}
              className={`card border-2 transition-all hover:shadow-lg ${
                c.activo ? 'border-slate-100' : 'border-slate-200 opacity-60'
              }`}
            >
              {/* Cabecera de la card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-secondary leading-tight">{c.nombre}</p>
                    {c.descripcion && (
                      <p className="text-xs text-secondary-400 leading-tight mt-0.5 line-clamp-1">
                        {c.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                {!c.activo && (
                  <span className="badge-secondary text-xs">Inactivo</span>
                )}
              </div>

              {/* Descuento + tipo */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1 rounded-full">
                  <Percent className="w-3.5 h-3.5" />
                  <span className="text-sm font-extrabold">{c.descuento_pct}% descuento</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLORS[c.tipo_aplicacion]}`}>
                  {TIPO_LABELS[c.tipo_aplicacion]}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViendoLista(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl
                             bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver lista
                </button>
                <button
                  onClick={() => { setEditConvenio(c); setShowModal(true) }}
                  className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400 hover:text-secondary transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="p-2 rounded-xl hover:bg-danger-light text-secondary-400 hover:text-danger transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

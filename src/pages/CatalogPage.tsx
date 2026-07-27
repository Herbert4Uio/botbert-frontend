import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Package, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface AttributeDef {
  name: string;
  type: 'string' | 'number' | 'enum' | 'boolean';
  label: string;
  required: boolean;
  options: string[];
  unit: string;
  searchable: boolean;
  askBeforeRecommend: boolean;
}

interface Category {
  _id: string;
  name: string;
  attributesSchema: AttributeDef[];
}

interface City {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  longCode: string;
  shortCode: string;
  prices: { cityId: any; price: number }[];
  description: string;
  weight?: string;
  keywords: string[];
  occasions?: string[];
  isActive: boolean;
  categoryId: string;
  attributes: Record<string, any>;
}

export function CatalogPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formLongCode, setFormLongCode] = useState('');
  const [formShortCode, setFormShortCode] = useState('');
  const [formPrices, setFormPrices] = useState<{cityId: string, price: string}[]>([]);
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formOccasions, setFormOccasions] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAttributes, setFormAttributes] = useState<Record<string, any>>({});

  // Filter State
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchOccasion, setSearchOccasion] = useState<string>('');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

  const { addToast } = useToastStore();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const confirmAction = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setModalConfig({ isOpen: true, title, message, onConfirm, isDestructive });
  };

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, cityRes] = await Promise.all([
        api.get('/catalog/products'),
        api.get('/catalog/categories'),
        api.get('/cities')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setCities(cityRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formName,
        longCode: formLongCode,
        shortCode: formShortCode,
        prices: formPrices.map(fp => ({ cityId: fp.cityId, price: Number(fp.price) })),
        categoryId: formCategory,
        description: formDescription,
        weight: formWeight,
        keywords: formKeywords.split(',').map(k => k.trim()).filter(Boolean),
        occasions: formOccasions.split(',').map(o => o.trim()).filter(Boolean),
        isActive: formIsActive,
        attributes: formAttributes,
      };

      if (editingProduct) {
        await api.put(`/catalog/products/${editingProduct._id}`, payload);
        addToast('Producto actualizado exitosamente', 'success');
      } else {
        await api.post('/catalog/products', payload);
        addToast('Producto creado exitosamente', 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('Error guardando el producto', 'error');
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminar Producto',
      '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/catalog/products/${id}`);
          fetchData();
          addToast('Producto eliminado', 'success');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al eliminar producto', 'error');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
      true
    );
  };

  const openModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name);
      setFormLongCode(prod.longCode || '');
      setFormShortCode(prod.shortCode || '');
      setFormPrices(prod.prices ? prod.prices.map(p => ({
        cityId: typeof p.cityId === 'object' ? p.cityId._id : p.cityId,
        price: p.price.toString()
      })) : []);
      setFormCategory(typeof prod.categoryId === 'object' ? (prod.categoryId as any)._id : prod.categoryId);
      setFormDescription(prod.description);
      setFormWeight(prod.weight || '');
      setFormKeywords(prod.keywords.join(', '));
      setFormOccasions(prod.occasions ? prod.occasions.join(', ') : '');
      setFormIsActive(prod.isActive);
      setFormAttributes(prod.attributes || {});
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormLongCode('');
      setFormShortCode('');
      setFormPrices([]);
      setFormCategory(categories.length > 0 ? categories[0]._id : '');
      setFormDescription('');
      setFormWeight('');
      setFormKeywords('');
      setFormOccasions('');
      setFormIsActive(true);
      setFormAttributes({});
    }
    setModalOpen(true);
  };

  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c._id === id);
    return cat ? cat.name : 'Sin Categoría';
  };

  const getSelectedCategorySchema = (): AttributeDef[] => {
    const cat = categories.find(c => c._id === formCategory);
    return cat?.attributesSchema || [];
  };

  const getFilterCategorySchema = (): AttributeDef[] => {
    const cat = categories.find(c => c._id === selectedCategoryId);
    return cat?.attributesSchema || [];
  };

  const setSearchableFilter = (attrName: string, value: string) => {
    setDynamicFilters(prev => {
      const next = { ...prev };
      if (value === '') {
        delete next[attrName];
      } else {
        next[attrName] = value;
      }
      return next;
    });
  };

  const filteredProducts = products.filter(p => {
    if (selectedCityId) {
      const hasCity = p.prices?.some(pr => {
        const cId = typeof pr.cityId === 'object' ? pr.cityId._id : pr.cityId;
        return cId === selectedCityId;
      });
      if (!hasCity) return false;
    }

    if (selectedCategoryId && p.categoryId !== selectedCategoryId) {
      return false;
    }

    if (searchKeyword.trim() !== '') {
      const term = searchKeyword.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(term);
      const matchKeyword = p.keywords?.some(k => k.toLowerCase().includes(term));
      if (!matchName && !matchKeyword) return false;
    }

    if (searchOccasion.trim() !== '') {
      const term = searchOccasion.toLowerCase().trim();
      const matchOccasion = p.occasions?.some(o => o.toLowerCase().includes(term));
      if (!matchOccasion) return false;
    }

    for (const [attrName, filterValue] of Object.entries(dynamicFilters)) {
      if (!filterValue) continue;
      const productAttrValue = p.attributes?.[attrName];
      if (productAttrValue === undefined || productAttrValue === null) return false;
      const pVal = String(productAttrValue).toLowerCase();
      const fVal = filterValue.toLowerCase();
      if (attrName === 'number') {
        if (pVal !== fVal) return false;
      } else {
        if (!pVal.includes(fVal)) return false;
      }
    }

    return true;
  });

  const getPriceLabel = (prod: Product) => {
    if (selectedCityId) {
      const priceObj = prod.prices?.find(pr => {
        const cId = typeof pr.cityId === 'object' ? pr.cityId._id : pr.cityId;
        return cId === selectedCityId;
      });
      return priceObj ? `$${priceObj.price.toFixed(2)}` : 'N/A';
    }
    if (prod.prices && prod.prices.length > 0) {
      return `${prod.prices.length} Ciudad(es)`;
    }
    return 'Sin Precios';
  };

  const filterSchema = getFilterCategorySchema();
  const searchableAttrs = filterSchema.filter(a => a.searchable);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Catálogo de Productos</h1>
          <p className="text-corporate-400 text-sm mt-1">El inventario que utiliza la Inteligencia Artificial para vender</p>
        </div>
        <div className="flex items-center gap-4">
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-corporate-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-corporate-500 mb-1">Ciudad</label>
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
            >
              <option value="">Todas las Ciudades</option>
              {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-corporate-500 mb-1">Categoría</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setDynamicFilters({});
              }}
              className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
            >
              <option value="">Todas las Categorías</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-corporate-500 mb-1">Buscar Producto / Keyword</label>
            <input
              type="text"
              placeholder="Ej: chocolate, amargo..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-corporate-500 mb-1">Ocasión</label>
            <input
              type="text"
              placeholder="Ej: regalo, aniversario..."
              value={searchOccasion}
              onChange={(e) => setSearchOccasion(e.target.value)}
              className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
            />
          </div>
        </div>

        {/* Dynamic EAV Filters */}
        {searchableAttrs.length > 0 && (
          <div className="flex flex-wrap gap-4 items-end mt-3 pt-3 border-t border-corporate-100">
            {searchableAttrs.map(attr => (
              <div key={attr.name} className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-corporate-500 mb-1">
                  {attr.label}
                  {attr.unit && <span className="text-corporate-400 ml-1">({attr.unit})</span>}
                </label>
                {attr.type === 'enum' ? (
                  <select
                    value={dynamicFilters[attr.name] || ''}
                    onChange={(e) => setSearchableFilter(attr.name, e.target.value)}
                    className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
                  >
                    <option value="">Todos</option>
                    {attr.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : attr.type === 'boolean' ? (
                  <select
                    value={dynamicFilters[attr.name] || ''}
                    onChange={(e) => setSearchableFilter(attr.name, e.target.value)}
                    className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
                  >
                    <option value="">Todos</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={attr.type === 'number' ? 'number' : 'text'}
                    placeholder={`Filtrar por ${attr.label.toLowerCase()}...`}
                    value={dynamicFilters[attr.name] || ''}
                    onChange={(e) => setSearchableFilter(attr.name, e.target.value)}
                    className="w-full px-3 py-2 border border-corporate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-accent text-sm text-corporate-700"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center p-12 text-corporate-400 flex flex-col items-center">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay productos registrados en el catálogo</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center p-12 text-corporate-400 flex flex-col items-center">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay productos disponibles para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-corporate-50 border-b border-corporate-100">
                <tr>
                  <th className="px-6 py-4 font-medium text-corporate-600">Código Largo / Corto</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Nombre</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Categoría</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Precio</th>
                  {searchableAttrs.length > 0 && searchableAttrs.map(attr => (
                    <th key={attr.name} className="px-6 py-4 font-medium text-corporate-600">{attr.label}</th>
                  ))}
                  <th className="px-6 py-4 font-medium text-corporate-600">Estado</th>
                  {canEdit && <th className="px-6 py-4 font-medium text-corporate-600 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-100">
                {filteredProducts.map((prod) => (
                  <tr key={prod._id} className="hover:bg-corporate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-corporate-900">
                      {prod.longCode} <span className="text-corporate-400 font-normal text-sm">/ {prod.shortCode}</span>
                    </td>
                    <td className="px-6 py-4 text-corporate-900">
                      {prod.name}
                      {prod.weight && <span className="ml-2 text-xs bg-corporate-100 text-corporate-600 px-2 py-0.5 rounded-full">{prod.weight}</span>}
                    </td>
                    <td className="px-6 py-4 text-corporate-600">{getCategoryName(typeof prod.categoryId === 'object' ? (prod.categoryId as any)._id : prod.categoryId)}</td>
                    <td className="px-6 py-4 font-semibold text-corporate-900">
                      {getPriceLabel(prod)}
                    </td>
                    {searchableAttrs.map(attr => (
                      <td key={attr.name} className="px-6 py-4 text-corporate-600 text-sm">
                        {prod.attributes?.[attr.name] !== undefined && prod.attributes[attr.name] !== null
                          ? String(prod.attributes[attr.name])
                          : <span className="text-corporate-300">—</span>
                        }
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${prod.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {prod.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openModal(prod)}
                          className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod._id)}
                          className="p-2 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-corporate-50 sticky top-0 z-10">
              <h3 className="font-semibold text-lg text-corporate-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre</label>
                  <input
                    type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Categoría</label>
                  <select
                    required value={formCategory} onChange={(e) => {
                      setFormCategory(e.target.value);
                      setFormAttributes({});
                    }}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                  >
                    <option value="" disabled>Seleccione una categoría</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Peso / Gramaje</label>
                  <input
                    type="text" value={formWeight} onChange={(e) => setFormWeight(e.target.value)}
                    placeholder="Ej: 500g, 1kg, 1L"
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Código Largo</label>
                  <input
                    type="text" required value={formLongCode} onChange={(e) => setFormLongCode(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Código Corto</label>
                  <input
                    type="text" required value={formShortCode} onChange={(e) => setFormShortCode(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>

                <div className="col-span-2 border border-corporate-100 rounded-xl p-4 bg-corporate-50">
                  <label className="block text-sm font-medium text-corporate-700 mb-3">Precios por Ciudad</label>
                  {formPrices.map((fp, index) => (
                    <div key={index} className="flex gap-2 mb-3">
                      <select
                        required
                        value={fp.cityId}
                        onChange={(e) => {
                          const newPrices = [...formPrices];
                          newPrices[index].cityId = e.target.value;
                          setFormPrices(newPrices);
                        }}
                        className="flex-1 px-4 py-2 border border-corporate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-accent"
                      >
                        <option value="" disabled>Seleccione ciudad</option>
                        {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                      <input
                        type="number" step="0.01" required
                        value={fp.price}
                        onChange={(e) => {
                          const newPrices = [...formPrices];
                          newPrices[index].price = e.target.value;
                          setFormPrices(newPrices);
                        }}
                        className="w-32 px-4 py-2 border border-corporate-200 rounded-lg outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Precio"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPrices = [...formPrices];
                          newPrices.splice(index, 1);
                          setFormPrices(newPrices);
                        }}
                        className="p-2 text-corporate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormPrices([...formPrices, { cityId: '', price: '' }])}
                    className="text-accent text-sm font-medium flex items-center gap-1 hover:text-accent-hover"
                  >
                    <Plus className="w-4 h-4" /> Añadir Precio
                  </button>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Descripción (Ventas)</label>
                  <textarea
                    required rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Palabras Clave (Separadas por comas)</label>
                  <input
                    type="text" value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="chocolate, dulce, regalo"
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  />
                  <p className="text-xs text-corporate-400 mt-1">Ayuda a la Inteligencia Artificial a encontrar el producto más rápido.</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Ocasiones (Separadas por comas)</label>
                  <input
                    type="text" value={formOccasions} onChange={(e) => setFormOccasions(e.target.value)} placeholder="Regalo, Aniversario, Día de la Madre"
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  />
                  <p className="text-xs text-corporate-400 mt-1">Etiquetas exactas para que la IA sepa en qué eventos recomendar este producto.</p>
                </div>

                {/* Dynamic EAV Attributes */}
                {getSelectedCategorySchema().length > 0 && (
                  <div className="col-span-2 border border-corporate-100 rounded-xl p-4 bg-corporate-50">
                    <label className="block text-sm font-medium text-corporate-700 mb-3">
                      Atributos de la Categoría
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {getSelectedCategorySchema().map(attr => (
                        <div key={attr.name}>
                          <label className="block text-xs font-medium text-corporate-600 mb-1">
                            {attr.label}
                            {attr.required && <span className="text-red-500 ml-0.5">*</span>}
                            {attr.unit && <span className="text-corporate-400 ml-1">({attr.unit})</span>}
                          </label>
                          {attr.type === 'enum' ? (
                            <select
                              required={attr.required}
                              value={formAttributes[attr.name] || ''}
                              onChange={(e) => setFormAttributes(prev => ({ ...prev, [attr.name]: e.target.value }))}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none bg-white"
                            >
                              <option value="">Seleccionar...</option>
                              {attr.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : attr.type === 'boolean' ? (
                            <select
                              value={formAttributes[attr.name] !== undefined ? String(formAttributes[attr.name]) : ''}
                              onChange={(e) => setFormAttributes(prev => ({ ...prev, [attr.name]: e.target.value === 'true' }))}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none bg-white"
                            >
                              <option value="">Seleccionar...</option>
                              <option value="true">Sí</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            <input
                              type={attr.type === 'number' ? 'number' : 'text'}
                              required={attr.required}
                              value={formAttributes[attr.name] || ''}
                              onChange={(e) => setFormAttributes(prev => ({ ...prev, [attr.name]: e.target.value }))}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                              placeholder={attr.label}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox" id="isActive" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                  />
                  <label htmlFor="isActive" className="text-sm text-corporate-700">Producto Activo (Disponible para la venta)</label>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-corporate-100 mt-6">
                <button
                  type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={modalConfig.isDestructive}
      />
    </div>
  );
}

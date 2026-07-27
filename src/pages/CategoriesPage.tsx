import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Layers, Plus, Pencil, Trash2, Loader2, X, Settings2 } from 'lucide-react';
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
  isActive: boolean;
}

const EMPTY_ATTR: AttributeDef = {
  name: '',
  type: 'string',
  label: '',
  required: false,
  options: [],
  unit: '',
  searchable: true,
  askBeforeRecommend: false,
};

export function CategoriesPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formAttributes, setFormAttributes] = useState<AttributeDef[]>([]);

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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/catalog/categories');
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { name: formName };
      if (canEdit) {
        payload.attributesSchema = formAttributes.filter(a => a.name.trim() !== '');
      }
      if (editingCat) {
        await api.put(`/catalog/categories/${editingCat._id}`, payload);
        addToast('Categoría actualizada exitosamente', 'success');
      } else {
        await api.post('/catalog/categories', payload);
        addToast('Categoría creada exitosamente', 'success');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error(error);
      addToast('Error guardando la categoría', 'error');
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminar Categoría',
      '¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/catalog/categories/${id}`);
          fetchCategories();
          addToast('Categoría eliminada', 'success');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al eliminar categoría', 'error');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
      true
    );
  };

  const openModal = (cat?: Category) => {
    setEditingCat(cat || null);
    setFormName(cat ? cat.name : '');
    setFormAttributes(cat?.attributesSchema ? cat.attributesSchema.map(a => ({ ...a, options: a.options || [] })) : []);
    setModalOpen(true);
  };

  const addAttribute = () => {
    setFormAttributes([...formAttributes, { ...EMPTY_ATTR, options: [] }]);
  };

  const removeAttribute = (idx: number) => {
    setFormAttributes(formAttributes.filter((_, i) => i !== idx));
  };

  const updateAttribute = (idx: number, field: keyof AttributeDef, value: any) => {
    const updated = [...formAttributes];
    (updated[idx] as any)[field] = value;
    if (field === 'type' && value !== 'enum') {
      updated[idx].options = [];
    }
    setFormAttributes(updated);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Categorías</h1>
          <p className="text-corporate-400 text-sm mt-1">Gestiona las clasificaciones de tu catálogo y sus atributos EAV</p>
        </div>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Categoría
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center p-12 text-corporate-400 flex flex-col items-center">
            <Layers className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay categorías registradas</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-corporate-50 border-b border-corporate-100">
              <tr>
                <th className="px-6 py-4 font-medium text-corporate-600">Nombre</th>
                <th className="px-6 py-4 font-medium text-corporate-600">Atributos EAV</th>
                <th className="px-6 py-4 font-medium text-corporate-600">Estado</th>
                {canEdit && <th className="px-6 py-4 font-medium text-corporate-600 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-100">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-corporate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-corporate-900">{cat.name}</td>
                  <td className="px-6 py-4">
                    {cat.attributesSchema && cat.attributesSchema.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cat.attributesSchema.map((attr, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              attr.type === 'enum'
                                ? 'bg-purple-100 text-purple-700'
                                : attr.type === 'number'
                                ? 'bg-blue-100 text-blue-700'
                                : attr.type === 'boolean'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-corporate-100 text-corporate-600'
                            }`}
                          >
                            {attr.label || attr.name}
                            {attr.required && <span className="text-red-500">*</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-corporate-400 italic">Sin atributos</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${cat.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {cat.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openModal(cat)}
                        className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id)}
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
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-corporate-50 sticky top-0 z-10">
              <h3 className="font-semibold text-lg text-corporate-900">
                {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre de Categoría</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                  placeholder="Ej. Chocolates Rellenos"
                />
              </div>

              {/* EAV Attributes Editor */}
              <div className="border-t border-corporate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-corporate-500" />
                    <h4 className="font-bold text-sm text-corporate-900">Atributos EAV</h4>
                  </div>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="text-accent text-sm font-medium flex items-center gap-1 hover:text-accent-hover"
                  >
                    <Plus className="w-4 h-4" /> Agregar Atributo
                  </button>
                </div>
                <p className="text-xs text-corporate-400 mb-4">
                  Define los atributos dinámicos que los productos de esta categoría tendrán. La IA los usará para filtrar y recomendar.
                </p>

                {formAttributes.length === 0 && (
                  <div className="text-center py-8 bg-corporate-50 rounded-lg border border-dashed border-corporate-200">
                    <Settings2 className="w-8 h-8 mx-auto mb-2 text-corporate-300" />
                    <p className="text-sm text-corporate-400">No hay atributos definidos</p>
                    <p className="text-xs text-corporate-400 mt-1">Haz clic en "Agregar Atributo" para comenzar</p>
                  </div>
                )}

                <div className="space-y-3">
                  {formAttributes.map((attr, idx) => (
                    <div key={idx} className="bg-white border border-corporate-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-12 gap-3">
                          {/* Nombre interno */}
                          <div className="col-span-3">
                            <label className="block text-[10px] font-medium text-corporate-500 mb-1">Nombre (key)</label>
                            <input
                              type="text" required value={attr.name}
                              onChange={(e) => updateAttribute(idx, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                              placeholder="color"
                            />
                          </div>
                          {/* Label */}
                          <div className="col-span-3">
                            <label className="block text-[10px] font-medium text-corporate-500 mb-1">Etiqueta</label>
                            <input
                              type="text" required value={attr.label}
                              onChange={(e) => updateAttribute(idx, 'label', e.target.value)}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                              placeholder="Color"
                            />
                          </div>
                          {/* Tipo */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-corporate-500 mb-1">Tipo</label>
                            <select
                              value={attr.type}
                              onChange={(e) => updateAttribute(idx, 'type', e.target.value)}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none bg-white"
                            >
                              <option value="string">Texto</option>
                              <option value="number">Número</option>
                              <option value="enum">Selección</option>
                              <option value="boolean">Sí/No</option>
                            </select>
                          </div>
                          {/* Unidad */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-corporate-500 mb-1">Unidad</label>
                            <input
                              type="text" value={attr.unit}
                              onChange={(e) => updateAttribute(idx, 'unit', e.target.value)}
                              className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                              placeholder="kg, ml..."
                            />
                          </div>
                          {/* Checkboxes */}
                          <div className="col-span-2 flex flex-col justify-center gap-1.5">
                            <label className="flex items-center gap-1.5 text-[11px] text-corporate-600 cursor-pointer">
                              <input
                                type="checkbox" checked={attr.required}
                                onChange={(e) => updateAttribute(idx, 'required', e.target.checked)}
                                className="w-3.5 h-3.5 text-accent border-corporate-300 rounded focus:ring-accent"
                              />
                              Requerido
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] text-corporate-600 cursor-pointer">
                              <input
                                type="checkbox" checked={attr.searchable}
                                onChange={(e) => updateAttribute(idx, 'searchable', e.target.checked)}
                                className="w-3.5 h-3.5 text-accent border-corporate-300 rounded focus:ring-accent"
                              />
                              Buscable
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] text-corporate-600 cursor-pointer">
                              <input
                                type="checkbox" checked={attr.askBeforeRecommend}
                                onChange={(e) => updateAttribute(idx, 'askBeforeRecommend', e.target.checked)}
                                className="w-3.5 h-3.5 text-accent border-corporate-300 rounded focus:ring-accent"
                              />
                              Preguntar antes
                            </label>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttribute(idx)}
                          className="p-1.5 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors mt-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Options for enum type */}
                      {attr.type === 'enum' && (
                        <div className="mt-3 pt-3 border-t border-corporate-100">
                          <label className="block text-[10px] font-medium text-corporate-500 mb-1">
                            Opciones (separadas por coma)
                          </label>
                          <input
                            type="text"
                            value={attr.options.join(', ')}
                            onChange={(e) => updateAttribute(idx, 'options', e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                            className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                            placeholder="Rojo, Azul, Verde, Negro"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-corporate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                >
                  Guardar
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

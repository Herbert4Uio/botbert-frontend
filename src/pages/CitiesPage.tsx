import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MapPin, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface City {
  _id: string;
  name: string;
  isActive: boolean;
}

export function CitiesPage() {
  const { user } = useAuthStore();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formName, setFormName] = useState('');
  
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
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/cities');
      setCities(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCity) {
        await api.put(`/cities/${editingCity._id}`, { name: formName });
        addToast('Ciudad actualizada exitosamente', 'success');
      } else {
        await api.post('/cities', { name: formName });
        addToast('Ciudad creada exitosamente', 'success');
      }
      setModalOpen(false);
      fetchCities();
    } catch (error) {
      console.error(error);
      addToast('Error guardando la ciudad', 'error');
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminar Ciudad',
      '¿Estás seguro de que deseas eliminar esta ciudad? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/cities/${id}`);
          fetchCities();
          addToast('Ciudad eliminada', 'success');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al eliminar la ciudad', 'error');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
      true // isDestructive
    );
  };

  const openModal = (city?: City) => {
    setEditingCity(city || null);
    setFormName(city ? city.name : '');
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Ciudades</h1>
          <p className="text-corporate-400 text-sm mt-1">Gestiona las ciudades donde tienes cobertura y precios</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => openModal()}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Ciudad
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center p-12 text-corporate-400 flex flex-col items-center">
            <MapPin className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay ciudades registradas</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-corporate-50 border-b border-corporate-100">
              <tr>
                <th className="px-6 py-4 font-medium text-corporate-600">Nombre</th>
                <th className="px-6 py-4 font-medium text-corporate-600">Estado</th>
                {canEdit && <th className="px-6 py-4 font-medium text-corporate-600 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-100">
              {cities.map((city) => (
                <tr key={city._id} className="hover:bg-corporate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-corporate-900">{city.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${city.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {city.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => openModal(city)}
                        className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(city._id)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-corporate-50">
              <h3 className="font-semibold text-lg text-corporate-900">
                {editingCity ? 'Editar Ciudad' : 'Nueva Ciudad'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre de la Ciudad</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                  placeholder="Ej. La Paz"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
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

import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Building2, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface Branch {
  _id: string;
  name: string;
  cityId: any;
  address: string;
  whatsappNumber?: string;
  systemPrompt: string;
  isActive: boolean;
  deliveryOnly?: boolean;
  isBusinessHoursEnabled?: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  outOfHoursMessage?: string;
}

export function BranchesPage() {
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formCityId, setFormCityId] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formWhatsappNumber, setFormWhatsappNumber] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDeliveryOnly, setFormDeliveryOnly] = useState(false);
  const [formIsBusinessHoursEnabled, setFormIsBusinessHoursEnabled] = useState(false);
  const [formBusinessHoursStart, setFormBusinessHoursStart] = useState('09:00');
  const [formBusinessHoursEnd, setFormBusinessHoursEnd] = useState('18:00');
  const [formOutOfHoursMessage, setFormOutOfHoursMessage] = useState('Lo sentimos, en este momento nos encontramos fuera de nuestro horario de atención.');

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

  // Only OWNER can access this page ideally, checked in router
  const canEdit = user?.role === 'OWNER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchesRes, citiesRes] = await Promise.all([
        api.get('/branches'),
        api.get('/cities')
      ]);
      setBranches(branchesRes.data);
      setCities(citiesRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        cityId: formCityId,
        address: formAddress,
        whatsappNumber: formWhatsappNumber,
        systemPrompt: formSystemPrompt,
        isActive: formIsActive,
        deliveryOnly: formDeliveryOnly,
        isBusinessHoursEnabled: formIsBusinessHoursEnabled,
        businessHoursStart: formBusinessHoursStart,
        businessHoursEnd: formBusinessHoursEnd,
        outOfHoursMessage: formOutOfHoursMessage,
      };

      if (editingBranch) {
        await api.put(`/branches/${editingBranch._id}`, payload);
        addToast('Sucursal actualizada exitosamente', 'success');
      } else {
        await api.post('/branches', payload);
        addToast('Sucursal creada exitosamente', 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('Error guardando la sucursal', 'error');
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminar Sucursal',
      '¿Estás seguro de que deseas eliminar esta sucursal? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/branches/${id}`);
          fetchData();
          addToast('Sucursal eliminada', 'success');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al eliminar sucursal', 'error');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
      true // isDestructive
    );
  };

  const openModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormName(branch.name);
      setFormCityId(branch.cityId?._id || branch.cityId || '');
      setFormAddress(branch.address);
      setFormWhatsappNumber(branch.whatsappNumber || '');
      setFormSystemPrompt(branch.systemPrompt || '');
      setFormIsActive(branch.isActive !== false);
      setFormDeliveryOnly(branch.deliveryOnly === true);
      setFormIsBusinessHoursEnabled(branch.isBusinessHoursEnabled || false);
      setFormBusinessHoursStart(branch.businessHoursStart || '09:00');
      setFormBusinessHoursEnd(branch.businessHoursEnd || '18:00');
      setFormOutOfHoursMessage(branch.outOfHoursMessage || 'Lo sentimos, estamos fuera de horario.');
    } else {
      setEditingBranch(null);
      setFormName('');
      setFormCityId(cities.length > 0 ? cities[0]._id : '');
      setFormAddress('');
      setFormWhatsappNumber('');
      setFormSystemPrompt('Eres un asistente experto en ventas...');
      setFormIsActive(true);
      setFormDeliveryOnly(false);
      setFormIsBusinessHoursEnabled(false);
      setFormBusinessHoursStart('09:00');
      setFormBusinessHoursEnd('18:00');
      setFormOutOfHoursMessage('Lo sentimos, en este momento nos encontramos fuera de nuestro horario de atención. Te responderemos a la brevedad posible.');
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Sucursales</h1>
          <p className="text-corporate-400 text-sm mt-1">Administra las sucursales y la personalidad de IA de cada una</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => openModal()}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Sucursal
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center p-12 text-corporate-400 flex flex-col items-center">
            <Building2 className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay sucursales registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-corporate-50 border-b border-corporate-100">
                <tr>
                  <th className="px-6 py-4 font-medium text-corporate-600">Nombre</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Ciudad</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Dirección</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Teléfono (WhatsApp)</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Estado</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Envíos</th>
                  {canEdit && <th className="px-6 py-4 font-medium text-corporate-600 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-100">
                {branches.map((branch) => (
                  <tr key={branch._id} className="hover:bg-corporate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-corporate-900">{branch.name}</td>
                    <td className="px-6 py-4 text-corporate-600">{branch.cityId?.name || 'Sin Ciudad'}</td>
                    <td className="px-6 py-4 text-corporate-600">{branch.address}</td>
                    <td className="px-6 py-4 font-medium text-corporate-900">{branch.whatsappNumber || 'No registrado'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {branch.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${branch.deliveryOnly ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                        {branch.deliveryOnly ? 'Solo Envío' : 'Envío + Recojo'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => openModal(branch)}
                          className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(branch._id)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-corporate-50 sticky top-0 z-10">
              <h3 className="font-semibold text-lg text-corporate-900">
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
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
                    placeholder="Ej. Sucursal Centro"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Ciudad</label>
                  <select
                    required value={formCityId} onChange={(e) => setFormCityId(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                  >
                    <option value="" disabled>Seleccione una ciudad</option>
                    {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Dirección Completa</label>
                  <input
                    type="text" required value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                    placeholder="Ej. Av. Arce 1234, Zona Sopocachi"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Número de WhatsApp (Opcional)</label>
                  <input
                    type="text" value={formWhatsappNumber} onChange={(e) => setFormWhatsappNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                    placeholder="Ej. +59170000000"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-corporate-700 mb-1">System Prompt (Personalidad de IA)</label>
                  <textarea
                    required rows={8} value={formSystemPrompt} onChange={(e) => setFormSystemPrompt(e.target.value)}
                    className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-none text-sm"
                  />
                  <p className="text-xs text-corporate-400 mt-1">Este prompt define cómo se comportará la Inteligencia Artificial exclusivamente para esta sucursal.</p>
                </div>

                <div className="col-span-2 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox" id="isActive" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                  />
                  <label htmlFor="isActive" className="text-sm text-corporate-700">Sucursal Activa</label>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox" id="deliveryOnly" checked={formDeliveryOnly} onChange={(e) => setFormDeliveryOnly(e.target.checked)}
                    className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                  />
                  <label htmlFor="deliveryOnly" className="text-sm text-corporate-700">Solo envíos a domicilio</label>
                  <span className="text-xs text-corporate-400">(Si está activado, no ofrecerá recojo en sucursal)</span>
                </div>

                <div className="col-span-2 border-t border-corporate-100 pt-4 mt-2">
                  <h4 className="font-bold text-sm text-corporate-900 mb-3">Horario de Atención</h4>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox" id="isBusinessHoursEnabled" checked={formIsBusinessHoursEnabled} onChange={(e) => setFormIsBusinessHoursEnabled(e.target.checked)}
                      className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                    />
                    <label htmlFor="isBusinessHoursEnabled" className="text-sm text-corporate-700">Habilitar Restricción de Horarios</label>
                  </div>

                  {formIsBusinessHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 bg-corporate-50 p-4 rounded-lg border border-corporate-100">
                      <div>
                        <label className="block text-xs font-medium text-corporate-700 mb-1">Hora de Inicio</label>
                        <input
                          type="time" required={formIsBusinessHoursEnabled} value={formBusinessHoursStart} onChange={(e) => setFormBusinessHoursStart(e.target.value)}
                          className="w-full px-3 py-1.5 border border-corporate-200 rounded-md focus:ring-2 focus:ring-accent outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-corporate-700 mb-1">Hora de Fin</label>
                        <input
                          type="time" required={formIsBusinessHoursEnabled} value={formBusinessHoursEnd} onChange={(e) => setFormBusinessHoursEnd(e.target.value)}
                          className="w-full px-3 py-1.5 border border-corporate-200 rounded-md focus:ring-2 focus:ring-accent outline-none text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-corporate-700 mb-1">Mensaje de Ausencia</label>
                        <textarea
                          required={formIsBusinessHoursEnabled} rows={2} value={formOutOfHoursMessage} onChange={(e) => setFormOutOfHoursMessage(e.target.value)}
                          className="w-full px-3 py-1.5 border border-corporate-200 rounded-md focus:ring-2 focus:ring-accent outline-none resize-none text-sm"
                          placeholder="Ej. Lo sentimos, estamos fuera de horario."
                        />
                        <p className="text-[10px] text-corporate-500 mt-1">Este mensaje se enviará si un cliente escribe fuera del horario. La IA se pausará automáticamente para ese chat.</p>
                      </div>
                    </div>
                  )}
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
                  Guardar Sucursal
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

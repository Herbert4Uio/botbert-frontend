import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, Loader2, Building2 } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { X } from 'lucide-react';

export function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    _id: '',
    name: '',
    plan: 'PREMIUM',
    isActive: true,
    isProductsModifiable: false,
    modifiableQuestion: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: ''
  });

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/tenants');
      setTenants(data);
    } catch (error) {
      addToast('Error al cargar empresas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tenant?: any) => {
    if (tenant) {
      setIsEditing(true);
      setFormData({
        _id: tenant._id,
        name: tenant.name,
        plan: tenant.plan,
        isActive: tenant.isActive,
        isProductsModifiable: tenant.isProductsModifiable ?? false,
        modifiableQuestion: tenant.modifiableQuestion ?? '',
        ownerEmail: '',
        ownerName: '',
        ownerPassword: ''
      });
    } else {
      setIsEditing(false);
      setFormData({
        _id: '',
        name: '',
        plan: 'PREMIUM',
        isActive: true,
        isProductsModifiable: false,
        modifiableQuestion: '',
        ownerEmail: '',
        ownerName: '',
        ownerPassword: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/tenants/${formData._id}`, {
          name: formData.name,
          plan: formData.plan,
          isActive: formData.isActive,
          isProductsModifiable: formData.isProductsModifiable,
          modifiableQuestion: formData.modifiableQuestion
        });
        addToast('Empresa actualizada exitosamente', 'success');
      } else {
        await api.post('/tenants', formData);
        addToast('Empresa creada exitosamente', 'success');
      }
      setIsModalOpen(false);
      fetchTenants();
    } catch (error: any) {
      addToast(error.response?.data?.message || 'Error al guardar la empresa', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Empresa',
      message: '¿Estás seguro de que deseas eliminar esta empresa? Todos sus datos podrían perderse si no has hecho backup.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/tenants/${id}`);
          addToast('Empresa eliminada exitosamente', 'success');
          fetchTenants();
        } catch (error) {
          addToast('Error al eliminar la empresa', 'error');
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Gestión de Empresas (Tenants)</h1>
          <p className="text-corporate-400 text-sm mt-1">Administra los clientes SaaS del sistema</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Empresa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-corporate-50 border-b border-corporate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-corporate-900">Empresa</th>
                <th className="px-6 py-4 font-semibold text-corporate-900">Plan</th>
                <th className="px-6 py-4 font-semibold text-corporate-900">Estado</th>
                <th className="px-6 py-4 font-semibold text-corporate-900 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-100">
              {tenants.map(tenant => (
                <tr key={tenant._id} className="hover:bg-corporate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-medium text-corporate-900">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(tenant)}
                        className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tenant._id)}
                        className="p-2 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-corporate-400">
                    No hay empresas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-corporate-100">
              <h2 className="text-xl font-bold text-corporate-900">{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-corporate-400 hover:text-corporate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre de Empresa</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-corporate-700 mb-1">Plan</label>
            <select
              value={formData.plan}
              onChange={e => setFormData({...formData, plan: e.target.value})}
              className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="PREMIUM">Premium</option>
              <option value="FREE">Gratis</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({...formData, isActive: e.target.checked})}
              className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-corporate-700">Empresa Activa</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isProductsModifiable"
              checked={formData.isProductsModifiable}
              onChange={e => setFormData({...formData, isProductsModifiable: e.target.checked})}
              className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
            />
            <label htmlFor="isProductsModifiable" className="text-sm font-medium text-corporate-700">Productos Modificables</label>
          </div>

          {formData.isProductsModifiable && (
            <div>
              <label className="block text-sm font-medium text-corporate-700 mb-1">Pregunta de Personalización</label>
              <input
                type="text"
                value={formData.modifiableQuestion}
                onChange={e => setFormData({...formData, modifiableQuestion: e.target.value})}
                className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                placeholder="Ej: ¿Tenés alguna restricción alimenticia?"
              />
              <p className="text-xs text-corporate-400 mt-1">Pregunta que la IA hará al cliente después de elegir un producto.</p>
            </div>
          )}

          {!isEditing && (
            <div className="mt-6 border-t border-corporate-100 pt-6 space-y-4">
              <h4 className="font-medium text-corporate-900">Crear cuenta del Propietario (OWNER)</h4>
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required={!isEditing}
                  value={formData.ownerName}
                  onChange={e => setFormData({...formData, ownerName: e.target.value})}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Correo (Email)</label>
                <input
                  type="email"
                  required={!isEditing}
                  value={formData.ownerEmail}
                  onChange={e => setFormData({...formData, ownerEmail: e.target.value})}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  required={!isEditing}
                  value={formData.ownerPassword}
                  onChange={e => setFormData({...formData, ownerPassword: e.target.value})}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-corporate-100 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
      />
    </div>
  );
}

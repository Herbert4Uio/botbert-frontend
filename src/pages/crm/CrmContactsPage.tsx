import { useState, useEffect } from 'react';
import { Users, Search, Filter, X } from 'lucide-react';
import { crmService } from '../../services/crm.service';

export function CrmContactsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');

  // Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSelectedTags, setModalSelectedTags] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    nit: '',
    address: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersData, tagsData] = await Promise.all([
        crmService.getCustomers(),
        crmService.getTags()
      ]);
      setCustomers(customersData);
      setTags(tagsData);
    } catch (e) {
      console.error('Error fetching data', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      (c.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.profileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phoneNumber || '').includes(searchQuery) ||
      (c.whatsappId || '').includes(searchQuery);
    
    const matchesTag = selectedTagFilter === '' || c.tags?.some((t: any) => t._id === selectedTagFilter);

    return matchesSearch && matchesTag;
  });

  const openModal = (customer: any) => {
    setSelectedCustomer(customer);
    setModalSelectedTags(customer.tags?.map((t: any) => t._id) || []);
    setEditForm({
      fullName: customer.fullName || '',
      phoneNumber: customer.phoneNumber || '',
      nit: customer.nit || '',
      address: customer.address || ''
    });
    setIsModalOpen(true);
  };

  const saveCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      await crmService.updateCustomer(selectedCustomer._id, editForm);
      await crmService.updateCustomerTags(selectedCustomer._id, modalSelectedTags);
      setIsModalOpen(false);
      loadData(); // recargar para ver cambios
    } catch (e) {
      console.error('Error updating customer', e);
    }
  };

  const toggleModalTag = (tagId: string) => {
    if (modalSelectedTags.includes(tagId)) {
      setModalSelectedTags(modalSelectedTags.filter(id => id !== tagId));
    } else {
      setModalSelectedTags([...modalSelectedTags, tagId]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-corporate-600" />
            Directorio de Contactos
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Gestiona tus clientes y prospectos, y asígnales etiquetas.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corporate-500/20 focus:border-corporate-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              className="text-sm bg-transparent border-none focus:outline-none py-2 text-gray-700 cursor-pointer"
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
            >
              <option value="">Todas las etiquetas</option>
              {tags.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm shadow-gray-100/50">
              <tr>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre del Contacto</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono / WhatsApp</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Etiquetas (Tags)</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado el</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">Cargando contactos...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-900 font-medium text-lg">No se encontraron contactos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr 
                    key={c._id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openModal(c)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{c.fullName || c.profileName || 'Sin Nombre'}</div>
                      {c.fullName && c.profileName && c.fullName !== c.profileName && (
                        <div className="text-xs text-gray-500">Perfil: {c.profileName}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">{c.phoneNumber || c.whatsappId?.split('@')[0]}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.length > 0 ? (
                          c.tags.map((t: any) => (
                            <span key={t._id} className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: t.color || '#ccc' }}>
                              {t.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin etiquetas</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edición de Contacto */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Gestionar Contacto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-corporate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-corporate-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">{selectedCustomer.profileName || 'Sin Nombre'}</h4>
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedCustomer.whatsappId}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20 focus:border-corporate-500"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20 focus:border-corporate-500"
                      placeholder="+591..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">NIT / Documento</label>
                    <input 
                      type="text" 
                      value={editForm.nit}
                      onChange={(e) => setEditForm({...editForm, nit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20 focus:border-corporate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dirección (Opcional)</label>
                  <input 
                    type="text" 
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20 focus:border-corporate-500"
                    placeholder="Av. Principal #123"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3 border-t border-gray-100 pt-4">Etiquetas Asignadas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => {
                    const isSelected = modalSelectedTags.includes(t._id);
                    return (
                      <button
                        key={t._id}
                        onClick={() => toggleModalTag(t._id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected ? 'border-transparent text-white ring-2 ring-offset-1' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        style={{ 
                          backgroundColor: isSelected ? t.color : 'transparent',
                          borderColor: isSelected ? t.color : '#e5e7eb',
                          '--tw-ring-color': t.color
                        } as any}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 && <p className="text-sm text-gray-400 italic">No hay etiquetas creadas.</p>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={saveCustomer}
                className="px-4 py-2 text-sm font-medium text-white bg-corporate-600 rounded-lg hover:bg-corporate-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

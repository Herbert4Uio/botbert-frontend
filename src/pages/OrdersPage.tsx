import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { ShoppingBag, Loader2, X, MapPin, Calendar, CreditCard, User, CheckCircle2, Truck, PackageCheck, Clock, XCircle, LayoutGrid, List, Search } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Customer {
  _id: string;
  profileName: string;
  fullName?: string;
  whatsappId: string;
  phoneNumber?: string;
  address?: string;
}

interface Branch {
  _id: string;
  name: string;
  city: string;
  address: string;
}

interface Order {
  _id: string;
  customerId: Customer | string;
  branchId: Branch | string;
  items: OrderItem[];
  totalAmount: number;
  paymentType: string;
  paymentTiming: string;
  deliveryType: string;
  status: string;
  isPaid: boolean;
  createdAt: string;
  billingName?: string;
  billingNit?: string;
  shippingDate?: string;
  shippingTimeRange?: string;
  shippingAddress?: string;
  shippingInstructions?: string;
}

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  'PENDING': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'CONFIRMED': { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  'ON_THE_WAY': { label: 'En Camino', color: 'bg-purple-100 text-purple-700', icon: Truck },
  'DELIVERED': { label: 'Entregado', color: 'bg-green-100 text-green-700', icon: PackageCheck },
  'CANCELLED': { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const KANBAN_COLUMNS = ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED'];

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // UI States
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

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

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // Polling cada 15 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const statusLabel = STATUS_MAP[newStatus]?.label || newStatus;
    confirmAction(
      'Cambiar estado de entrega',
      `¿Estás seguro de cambiar el estado de la orden a "${statusLabel}"?`,
      async () => {
        try {
          await api.patch(`/orders/${orderId}/status`, { status: newStatus });
          fetchOrders();
          addToast(`Estado de entrega actualizado a "${statusLabel}"`, 'success');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error actualizando el estado de entrega', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  };

  const handlePaidStatusChange = (orderId: string, isPaid: boolean) => {
    confirmAction(
      isPaid ? 'Marcar como Pagado' : 'Marcar como No Pagado',
      `¿Confirmas cambiar el estado de pago a "${isPaid ? 'PAGADO' : 'NO PAGADO'}"?`,
      async () => {
        try {
          await api.patch(`/orders/${orderId}/paid`, { isPaid });
          fetchOrders();
          if (selectedOrder && selectedOrder._id === orderId) {
            setSelectedOrder({ ...selectedOrder, isPaid });
          }
          addToast(isPaid ? 'La orden se marcó como PAGADA' : 'La orden se marcó como NO PAGADA', 'success');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error actualizando estado de pago', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  };

  const getCustomerName = (customer: Customer | string) => {
    if (typeof customer === 'string') return 'Cliente Desconocido';
    return customer.fullName || customer.profileName || 'Cliente';
  };

  const getCustomerPhone = (customer: Customer | string) => {
    if (typeof customer === 'string') return '';
    if (customer.phoneNumber) return customer.phoneNumber;
    // Fix para números de Baileys que vienen con :device@s.whatsapp.net
    const jid = customer.whatsappId || '';
    const numberOnly = jid.split('@')[0].split(':')[0];
    return numberOnly;
  };

  const getBranchName = (branch: Branch | string) => {
    if (!branch) return 'Sucursal Principal';
    if (typeof branch === 'string') return 'Sucursal ' + branch.slice(-4);
    return branch.name;
  };

  const getProductsSummary = (items: OrderItem[]) => {
    return items.map(i => `${i.quantity}x ${i.name}`).join(', ');
  };

  // Filtrado de Órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Búsqueda
      const customerName = getCustomerName(order.customerId).toLowerCase();
      const orderId = order._id.toLowerCase();
      const matchesSearch = customerName.includes(searchTerm.toLowerCase()) || orderId.includes(searchTerm.toLowerCase());
      
      // Filtro Logístico (Tipo de Entrega)
      const matchesDelivery = deliveryFilter === 'ALL' || order.deliveryType === deliveryFilter;
      
      // Filtro de Fecha (Simple)
      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        const today = new Date().toISOString().split('T')[0];
        // Si hay shippingDate se usa, sino el createdAt
        const orderDate = order.shippingDate || new Date(order.createdAt).toISOString().split('T')[0];
        matchesDate = orderDate === today;
      }

      return matchesSearch && matchesDelivery && matchesDate;
    });
  }, [orders, searchTerm, deliveryFilter, dateFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado y Controles */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-corporate-900">Gestión de Órdenes</h1>
            <p className="text-corporate-400 text-sm mt-1">Administra los pedidos generados por IA</p>
          </div>
          
          <div className="flex items-center gap-2 bg-corporate-50 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-corporate-900 shadow-sm' : 'text-corporate-500 hover:text-corporate-900'}`}
            >
              <List className="w-4 h-4" /> Tabla
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-white text-corporate-900 shadow-sm' : 'text-corporate-500 hover:text-corporate-900'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Tablero
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corporate-300" />
            <input 
              type="text" 
              placeholder="Buscar por cliente o ID de pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-corporate-50 border border-corporate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-sm"
            />
          </div>
          
          <select 
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="w-full px-4 py-2 bg-corporate-50 border border-corporate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-sm font-medium text-corporate-700"
          >
            <option value="ALL">📦 Todos los tipos de entrega</option>
            <option value="PICKUP">🏬 Solo Recojos</option>
            <option value="DELIVERY">🚚 Solo Envíos a Domicilio</option>
          </select>

          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-4 py-2 bg-corporate-50 border border-corporate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-sm font-medium text-corporate-700"
          >
            <option value="ALL">📅 Todas las fechas</option>
            <option value="TODAY">🔥 Para Hoy</option>
          </select>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-corporate-100 text-center p-16 text-corporate-400 flex flex-col items-center">
          <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-corporate-700">No hay órdenes para mostrar</h3>
          <p className="text-sm mt-1">Prueba cambiando los filtros o espera a que ingresen nuevos pedidos.</p>
        </div>
      ) : (
        <>
          {/* VISTA DE TABLA */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-corporate-50 border-b border-corporate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">ID / Fecha</th>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">Cliente</th>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">Productos</th>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">Total</th>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">Entrega</th>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">Pago</th>
                      <th className="px-6 py-4 font-bold text-corporate-600 text-sm">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-100">
                    {filteredOrders.map((order) => {
                      const statusInfo = STATUS_MAP[order.status] || STATUS_MAP['PENDING'];
                      return (
                        <tr 
                          key={order._id} 
                          className="hover:bg-corporate-50/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-corporate-900">#{order._id.slice(-6).toUpperCase()}</div>
                            <div className="text-xs text-corporate-400 mt-1">
                              {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-corporate-900">
                              {getCustomerName(order.customerId)}
                            </div>
                            <div className="text-xs text-corporate-400">
                              +{getCustomerPhone(order.customerId)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-corporate-800 max-w-[200px] truncate" title={getProductsSummary(order.items)}>
                              {getProductsSummary(order.items)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-corporate-900">${order.totalAmount.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.deliveryType === 'PICKUP' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {order.deliveryType === 'PICKUP' ? '🏬 Recojo' : '🚚 Envío'}
                            </span>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handlePaidStatusChange(order._id, !order.isPaid)}
                              className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${order.isPaid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              {order.isPaid ? 'PAGADO' : 'NO PAGADO'}
                            </button>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              className={`text-sm font-bold px-3 py-1.5 rounded-lg appearance-none cursor-pointer border-r-8 border-transparent focus:outline-none focus:ring-2 focus:ring-accent ${statusInfo.color}`}
                            >
                              {Object.keys(STATUS_MAP).map(key => (
                                <option key={key} value={key}>{STATUS_MAP[key].label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA DE TABLERO KANBAN */}
          {viewMode === 'kanban' && (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
              {KANBAN_COLUMNS.map(columnKey => {
                const columnOrders = filteredOrders.filter(o => o.status === columnKey);
                const info = STATUS_MAP[columnKey];
                const Icon = info.icon;
                
                return (
                  <div key={columnKey} className="flex-shrink-0 w-80 flex flex-col bg-corporate-50/50 rounded-xl border border-corporate-100 snap-start">
                    <div className="p-4 flex items-center justify-between border-b border-corporate-100 bg-white rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${info.color.split(' ')[1]}`} />
                        <h3 className="font-bold text-corporate-800">{info.label}</h3>
                      </div>
                      <span className="bg-corporate-100 text-corporate-600 text-xs font-bold px-2 py-1 rounded-full">
                        {columnOrders.length}
                      </span>
                    </div>
                    
                    <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[650px] custom-scrollbar">
                      {columnOrders.map(order => (
                        <div key={order._id} className="bg-white p-4 rounded-xl shadow-sm border border-corporate-100 hover:shadow-md transition-shadow group relative cursor-pointer" onClick={() => setSelectedOrder(order)}>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-bold text-corporate-400">#{order._id.slice(-6).toUpperCase()}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${order.deliveryType === 'PICKUP' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {order.deliveryType === 'PICKUP' ? 'RECOJO' : 'ENVÍO'}
                            </span>
                          </div>
                          <h4 className="font-bold text-corporate-900 text-sm mb-1 line-clamp-1">{getCustomerName(order.customerId)}</h4>
                          <p className="text-xs text-corporate-500 flex items-center gap-1 mb-3">
                            <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-corporate-50">
                            <div className="flex flex-col">
                              <span className="font-bold text-accent text-sm">${order.totalAmount.toFixed(2)}</span>
                              <span className={`text-[9px] font-bold mt-1 ${order.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                {order.isPaid ? 'PAGADO' : 'NO PAGADO'}
                              </span>
                            </div>
                            
                            {/* Selector rápido de estado (oculto hasta hover) */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                               <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                  className={`text-[11px] font-bold px-2 py-1 rounded-md appearance-none cursor-pointer border-r-4 border-transparent focus:outline-none ${info.color}`}
                                >
                                  {Object.keys(STATUS_MAP).map(key => (
                                    <option key={key} value={key}>{STATUS_MAP[key].label}</option>
                                  ))}
                                </select>
                            </div>
                          </div>
                        </div>
                      ))}
                      {columnOrders.length === 0 && (
                        <div className="text-center py-8 text-corporate-400 text-sm italic">
                          Sin órdenes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Detalles de Orden (Rediseño Digital Ticket) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-corporate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-white">
              <div>
                <h3 className="font-bold text-2xl text-corporate-900">
                  Pedido <span className="text-accent">#{selectedOrder._id.slice(-6).toUpperCase()}</span>
                </h3>
                <p className="text-corporate-500 text-sm mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> 
                  Generado el {new Date(selectedOrder.createdAt).toLocaleDateString()} a las {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${STATUS_MAP[selectedOrder.status]?.color || ''}`}>
                  {STATUS_MAP[selectedOrder.status]?.label}
                </span>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-corporate-400 hover:text-corporate-900 bg-corporate-50 hover:bg-corporate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-corporate-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Columna Izquierda: Logística y Cliente */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Tarjeta Cliente */}
                  <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm">
                    <h4 className="text-xs font-bold text-corporate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Datos del Cliente
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-corporate-400">Nombre WhatsApp</p>
                        <p className="font-semibold text-corporate-900">{typeof selectedOrder.customerId !== 'string' && selectedOrder.customerId.profileName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-corporate-400">Teléfono</p>
                        <p className="font-semibold text-corporate-900">+{getCustomerPhone(selectedOrder.customerId)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta Facturación */}
                  <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm">
                    <h4 className="text-xs font-bold text-corporate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Facturación
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-corporate-400">Razón Social</p>
                        <p className="font-semibold text-corporate-900">{selectedOrder.billingName || 'S/N'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-corporate-400">NIT / CI</p>
                        <p className="font-semibold text-corporate-900">{selectedOrder.billingNit || 'S/N'}</p>
                      </div>
                      <div className="pt-3 border-t border-corporate-100">
                        <p className="text-xs text-corporate-400 mb-1">Método de Pago</p>
                        <div className="flex items-center gap-2">
                          <span className="inline-block bg-corporate-100 text-corporate-700 text-xs font-bold px-2.5 py-1 rounded-md">
                             {selectedOrder.paymentType} • {selectedOrder.paymentTiming === 'PAY_NOW' ? 'Anticipado' : 'Al Entregar'}
                          </span>
                          <button
                            onClick={() => handlePaidStatusChange(selectedOrder._id, !selectedOrder.isPaid)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${selectedOrder.isPaid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                            {selectedOrder.isPaid ? '✓ PAGADO' : '✗ NO PAGADO'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Logística y Productos */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Tarjeta Logística */}
                  <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Detalles de Entrega
                      </h4>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedOrder.deliveryType === 'PICKUP' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {selectedOrder.deliveryType === 'PICKUP' ? '🏬 RECOJO EN SUCURSAL' : '🚚 ENVÍO A DOMICILIO'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-corporate-400">Fecha Programada</p>
                        <p className="font-bold text-corporate-900">{selectedOrder.shippingDate || 'No especificada'} {selectedOrder.shippingTimeRange && `(${selectedOrder.shippingTimeRange})`}</p>
                      </div>

                      {selectedOrder.deliveryType === 'PICKUP' && (
                        <div className="col-span-2 bg-orange-50 border border-orange-200 p-3 rounded-lg mt-2">
                          <p className="text-xs font-bold text-orange-800 mb-1">Recoger en:</p>
                          <p className="text-sm font-bold text-orange-900">{getBranchName(selectedOrder.branchId)}</p>
                        </div>
                      )}
                      
                      {selectedOrder.deliveryType === 'DELIVERY' && (
                        <>
                          <div className="col-span-2">
                            <p className="text-xs text-corporate-400">Dirección de Entrega</p>
                            <p className="font-medium text-corporate-900">{selectedOrder.shippingAddress || 'No provista'}</p>
                          </div>
                          {selectedOrder.shippingInstructions && selectedOrder.shippingInstructions !== 'Ninguna' && (
                            <div className="col-span-2 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                              <p className="text-xs font-bold text-yellow-800 mb-1">Instrucciones Especiales:</p>
                              <p className="text-sm text-yellow-900">{selectedOrder.shippingInstructions}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resumen de Productos */}
                  <div className="bg-white p-0 rounded-xl border border-corporate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-corporate-100 bg-corporate-50/50">
                       <h4 className="text-xs font-bold text-corporate-400 uppercase tracking-wider">Productos Solicitados</h4>
                    </div>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white border-b border-corporate-100">
                        <tr>
                          <th className="px-6 py-3 font-medium text-corporate-400">Producto</th>
                          <th className="px-6 py-3 font-medium text-corporate-400 text-center">Cant.</th>
                          <th className="px-6 py-3 font-medium text-corporate-400 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-corporate-100 bg-white">
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-corporate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-corporate-800">{item.name}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-corporate-100 text-corporate-700 px-2.5 py-1 rounded-md font-medium">{item.quantity}</span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-corporate-900">${(item.quantity * item.price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-corporate-900 text-white">
                        <tr>
                          <td colSpan={2} className="px-6 py-4 font-bold text-right uppercase tracking-wider text-xs text-corporate-300">TOTAL DE LA ORDEN:</td>
                          <td className="px-6 py-4 font-bold text-right text-xl text-accent">${selectedOrder.totalAmount.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                </div>
              </div>
            </div>
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

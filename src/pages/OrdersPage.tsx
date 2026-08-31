import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { ShoppingBag, Loader2, X, MapPin, Calendar, CreditCard, User, CheckCircle2, Truck, PackageCheck, Clock, XCircle, LayoutGrid, List, Search, MessageSquare, Phone, Hash, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { OrderFormModal } from '../components/orders/OrderFormModal';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  modifications?: string[];
  scheduledDates?: string[];
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
  eventDetails?: {
    eventName: string;
    eventDate: string;
    eventTime: string;
    numberOfPeople: number;
    serviceType: string;
    dietaryRestrictions: string;
  };
}

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  'PENDING': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'CONFIRMED': { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  'ON_THE_WAY': { label: 'En Camino', color: 'bg-purple-100 text-purple-700', icon: Truck },
  'DELIVERED': { label: 'Entregado', color: 'bg-green-100 text-green-700', icon: PackageCheck },
  'CANCELLED': { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const KANBAN_COLUMNS = ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED'];

const getMapsLink = (address?: string) => {
  if (!address) return null;
  const match = address.match(/Lat:\s*(-?\d+(?:\.\d+)?),\s*Lng:\s*(-?\d+(?:\.\d+)?)/i);
  if (match) {
    return `https://www.google.com/maps?q=${match[1]},${match[2]}`;
  }
  return null;
};

const formatAddress = (address?: string) => {
  if (!address) return <span className="text-corporate-300 italic">No provista</span>;
  if (address.includes('[El cliente ha compartido una ubicación GPS por WhatsApp')) {
    return (
      <span className="flex items-center gap-2 text-indigo-700 font-semibold">
        📍 Ubicación GPS compartida vía WhatsApp
      </span>
    );
  }
  return address;
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // UI States
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

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

  const handleDeleteOrder = (orderId: string) => {
    confirmAction(
      'Eliminar Orden',
      '¿Estás seguro de que deseas eliminar esta orden? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/orders/${orderId}`);
          fetchOrders();
          setSelectedOrder(null);
          addToast('Orden eliminada exitosamente', 'success');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error eliminando la orden', 'error');
        }
      },
      true
    );
  };

  const handleEditOrder = () => {
    setOrderToEdit(selectedOrder);
    setIsFormOpen(true);
    setSelectedOrder(null); // Close details modal
  };

  const handleCreateOrder = () => {
    setOrderToEdit(null);
    setIsFormOpen(true);
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
          
          <button 
            onClick={handleCreateOrder}
            className="bg-accent text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-accent/90 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" /> Nueva Orden
          </button>
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
                            <span className="font-bold text-corporate-900">Bs. {order.totalAmount.toFixed(2)}</span>
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
                              <span className="font-bold text-accent text-sm">Bs. {order.totalAmount.toFixed(2)}</span>
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

      {/* Modal Detalles de Orden — Rediseño Profesional */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-corporate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[94vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 fade-in duration-300 sm:duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-corporate-100 px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-bold text-corporate-900 truncate">
                    Pedido <span className="text-accent">#{selectedOrder._id.slice(-6).toUpperCase()}</span>
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_MAP[selectedOrder.status]?.color || ''}`}
                  >
                    {(() => {
                      const Icon = STATUS_MAP[selectedOrder.status]?.icon;
                      return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
                    })()}
                    {STATUS_MAP[selectedOrder.status]?.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-corporate-400 mt-0.5 sm:mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {new Date(selectedOrder.createdAt).toLocaleDateString('es-BO', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}{' '}
                  a las {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditOrder}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg transition-colors border border-blue-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteOrder(selectedOrder._id)}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs rounded-lg transition-colors border border-red-200"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 ml-2 text-corporate-400 hover:text-corporate-900 bg-corporate-50 hover:bg-corporate-100 rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="overflow-y-auto flex-1 bg-gradient-to-b from-corporate-50/40 to-white px-5 py-5 sm:px-6 sm:py-6">
              {/* Layout: column en mobile, 1/3 + 2/3 en desktop */}
              <div className="flex flex-col lg:flex-row gap-5 sm:gap-6">

                {/* ═══ Columna lateral ═══ */}
                <div className="w-full lg:w-5/12 xl:w-4/12 space-y-4 sm:space-y-5">

                  {/* ── Cliente ── */}
                  <div className="bg-white rounded-xl border border-corporate-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-corporate-50 to-white px-4 py-3 border-b border-corporate-100">
                      <h4 className="text-[11px] font-bold text-corporate-500 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Cliente
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-[11px] text-corporate-400 font-medium">Nombre</p>
                        <p className="text-sm font-semibold text-corporate-900">
                          {typeof selectedOrder.customerId !== 'string' && selectedOrder.customerId.profileName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-corporate-400 font-medium">Teléfono</p>
                        <a
                          href={`https://wa.me/${getCustomerPhone(selectedOrder.customerId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          +{getCustomerPhone(selectedOrder.customerId)}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* ── Facturación ── */}
                  <div className="bg-white rounded-xl border border-corporate-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-corporate-50 to-white px-4 py-3 border-b border-corporate-100">
                      <h4 className="text-[11px] font-bold text-corporate-500 uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" /> Facturación
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-[11px] text-corporate-400 font-medium">Razón Social</p>
                        <p className="text-sm font-semibold text-corporate-900">{selectedOrder.billingName || 'S/N'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-corporate-400 font-medium">NIT / CI</p>
                        <p className="text-sm font-semibold text-corporate-900">
                          {selectedOrder.billingNit || (
                            <span className="text-corporate-300 italic">No registrado</span>
                          )}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-corporate-100">
                        <p className="text-[11px] text-corporate-400 font-medium mb-2">Método de Pago</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-corporate-100 text-corporate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg">
                            <Hash className="w-3 h-3" />
                            {selectedOrder.paymentType} · {selectedOrder.paymentTiming === 'PAY_NOW' ? 'Anticipado' : 'Al Entregar'}
                          </span>
                          <button
                            onClick={() => handlePaidStatusChange(selectedOrder._id, !selectedOrder.isPaid)}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${
                              selectedOrder.isPaid
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedOrder.isPaid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {selectedOrder.isPaid ? 'PAGADO' : 'NO PAGADO'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Detalles del Evento (Catering) ── */}
                  {selectedOrder.eventDetails && selectedOrder.eventDetails.eventName && (
                    <div className="bg-white rounded-xl border border-corporate-100 shadow-sm overflow-hidden border-t-4 border-t-purple-500">
                      <div className="bg-gradient-to-r from-purple-50 to-white px-4 py-3 border-b border-corporate-100">
                        <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Catering / Evento
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-[11px] text-corporate-400 font-medium">Evento</p>
                          <p className="text-sm font-semibold text-corporate-900">{selectedOrder.eventDetails.eventName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-corporate-400 font-medium">Fecha</p>
                            <p className="text-sm font-semibold text-corporate-900">{selectedOrder.eventDetails.eventDate}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-corporate-400 font-medium">Hora</p>
                            <p className="text-sm font-semibold text-corporate-900">{selectedOrder.eventDetails.eventTime}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-corporate-400 font-medium">Personas</p>
                            <p className="text-sm font-semibold text-corporate-900">{selectedOrder.eventDetails.numberOfPeople}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-corporate-400 font-medium">Servicio</p>
                            <p className="text-sm font-semibold text-corporate-900">{selectedOrder.eventDetails.serviceType}</p>
                          </div>
                        </div>
                        {selectedOrder.eventDetails.dietaryRestrictions && selectedOrder.eventDetails.dietaryRestrictions.toLowerCase() !== 'ninguna' && (
                          <div className="pt-2">
                            <p className="text-[11px] text-red-400 font-bold">Restricciones Alimentarias</p>
                            <p className="text-sm text-red-600 font-medium">{selectedOrder.eventDetails.dietaryRestrictions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══ Columna principal ═══ */}
                <div className="w-full lg:w-7/12 xl:w-8/12 space-y-4 sm:space-y-5">

                  {/* ── Logística / Entrega ── */}
                  <div className="bg-white rounded-xl shadow-sm border-l-4 overflow-hidden"
                    style={{ borderLeftColor: selectedOrder.deliveryType === 'PICKUP' ? '#f97316' : '#6366f1' }}
                  >
                    <div className="bg-gradient-to-r from-corporate-50 to-white px-4 py-3 border-b border-corporate-100 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-[11px] font-bold text-corporate-500 uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> {selectedOrder.deliveryType === 'PICKUP' ? 'Recojo' : 'Envío'}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          selectedOrder.deliveryType === 'PICKUP'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {selectedOrder.deliveryType === 'PICKUP' ? '🏬 RECOJO EN SUCURSAL' : '🚚 ENVÍO A DOMICILIO'}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-corporate-400 font-medium">Fecha Programada</p>
                          <p className="text-sm font-bold text-corporate-900">
                            {selectedOrder.shippingDate || (
                              <span className="text-corporate-300 italic">No especificada</span>
                            )}
                            {selectedOrder.shippingTimeRange && (
                              <span className="text-corporate-500 font-medium"> ({selectedOrder.shippingTimeRange})</span>
                            )}
                          </p>
                        </div>

                        {selectedOrder.deliveryType === 'PICKUP' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:col-span-2">
                            <p className="text-[11px] font-bold text-orange-700 mb-0.5">Sucursal para recoger</p>
                            <p className="text-sm font-bold text-orange-900">{getBranchName(selectedOrder.branchId)}</p>
                          </div>
                        )}

                        {selectedOrder.deliveryType === 'DELIVERY' && (
                          <div className="sm:col-span-2">
                            <p className="text-[11px] text-corporate-400 font-medium mb-1">Dirección de Entrega</p>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <p className="text-sm font-medium text-corporate-900">
                                {formatAddress(selectedOrder.shippingAddress)}
                              </p>
                              {(() => {
                                const mapLink = getMapsLink(selectedOrder.shippingAddress);
                                return mapLink ? (
                                  <a
                                    href={mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    Ver en Maps
                                  </a>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedOrder.deliveryType === 'DELIVERY' &&
                        selectedOrder.shippingInstructions &&
                        selectedOrder.shippingInstructions !== 'Ninguna' && (
                          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[11px] font-bold text-amber-700 mb-0.5">Instrucciones Especiales</p>
                              <p className="text-sm text-amber-900">{selectedOrder.shippingInstructions}</p>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* ── Productos ── */}
                  <div className="bg-white rounded-xl border border-corporate-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-corporate-50 to-white px-4 py-3 border-b border-corporate-100">
                      <h4 className="text-[11px] font-bold text-corporate-500 uppercase tracking-wider flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5" /> Productos{' '}
                        <span className="text-corporate-300 font-normal normal-case">({selectedOrder.items.length})</span>
                      </h4>
                    </div>

                    {/* Tabla responsiva: en mobile cambia a cards */}
                    <div className="hidden sm:block">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-corporate-100">
                            <th className="px-4 py-3 text-[11px] font-semibold text-corporate-400 uppercase tracking-wider">Producto</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-corporate-400 uppercase tracking-wider text-center">Cant.</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-corporate-400 uppercase tracking-wider text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-corporate-100">
                          {selectedOrder.items.map((item, idx) => {
                            const hasMods = item.modifications && item.modifications.length > 0;
                            const hasDates = item.scheduledDates && item.scheduledDates.length > 0;
                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${
                                  hasMods || hasDates
                                    ? 'bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-l-amber-400'
                                    : 'hover:bg-corporate-50/50'
                                }`}
                              >
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-corporate-900">{item.name}</span>
                                    {hasMods && (
                                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                        <MessageSquare className="w-3 h-3" />
                                        {item.modifications!.length} mod.
                                      </span>
                                    )}
                                  </div>
                                  {hasMods && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {item.modifications!.map((mod, mi) => (
                                        <span
                                          key={mi}
                                          className="inline-block bg-amber-50 text-amber-700 text-[11px] px-2 py-0.5 rounded-md border border-amber-200/60 italic"
                                        >
                                          ✎ {mod}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {hasDates && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {item.scheduledDates!.map((date, di) => (
                                        <span
                                          key={di}
                                          className="inline-block bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded-md border border-blue-200/60 font-medium"
                                        >
                                          📅 {date}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <span className="inline-flex items-center justify-center bg-corporate-100 text-corporate-700 w-8 h-8 rounded-lg font-bold text-sm">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-semibold text-corporate-900">
                                  Bs. {(item.quantity * item.price).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-corporate-900">
                            <td colSpan={2} className="px-4 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-corporate-300">
                              Total de la orden
                            </td>
                            <td className="px-4 py-4 text-right text-lg font-bold text-accent">Bs. {selectedOrder.totalAmount.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Vista mobile: cards en lugar de tabla */}
                    <div className="sm:hidden divide-y divide-corporate-100">
                      {selectedOrder.items.map((item, idx) => {
                        const hasMods = item.modifications && item.modifications.length > 0;
                        const hasDates = item.scheduledDates && item.scheduledDates.length > 0;
                        return (
                          <div
                            key={idx}
                            className={`px-4 py-3.5 space-y-2 ${
                              hasMods || hasDates ? 'bg-amber-50/70 border-l-4 border-l-amber-400' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-semibold text-corporate-900 text-sm truncate">{item.name}</span>
                                {hasMods && (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                    <MessageSquare className="w-3 h-3" />
                                    {item.modifications!.length}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-corporate-900 text-sm shrink-0 ml-2">
                                Bs. {(item.quantity * item.price).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-corporate-400">
                              <span className="bg-corporate-100 text-corporate-700 px-2 py-0.5 rounded-md font-bold">
                                {item.quantity} ud.
                              </span>
                            </div>
                            {hasMods && (
                              <div className="flex flex-wrap gap-1">
                                {item.modifications!.map((mod, mi) => (
                                  <span
                                    key={mi}
                                    className="inline-block bg-amber-50 text-amber-700 text-[11px] px-2 py-0.5 rounded-md border border-amber-200/60 italic"
                                  >
                                    ✎ {mod}
                                  </span>
                                ))}
                              </div>
                            )}
                            {hasDates && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.scheduledDates!.map((date, di) => (
                                  <span
                                    key={di}
                                    className="inline-block bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded-md border border-blue-200/60 font-medium"
                                  >
                                    📅 {date}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Total mobile */}
                      <div className="bg-corporate-900 px-4 py-4 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-corporate-300">Total</span>
                        <span className="text-lg font-bold text-accent">Bs. {selectedOrder.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
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

      <OrderFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchOrders}
        orderToEdit={orderToEdit}
      />
    </div>
  );
}

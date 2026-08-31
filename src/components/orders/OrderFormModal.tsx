import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Plus, Trash2, Calendar, MapPin, User, Package, CreditCard, Save, MessageSquare, ShoppingBag } from 'lucide-react';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderToEdit?: any; // Si es null, es creación
}

export function OrderFormModal({ isOpen, onClose, onSuccess, orderToEdit }: OrderFormModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Datos para los selects
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Estado del formulario
  const [customerId, setCustomerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [deliveryType, setDeliveryType] = useState('PICKUP'); // PICKUP | DELIVERY
  const [paymentType, setPaymentType] = useState('CASH'); // QR | CASH | TRANSFER
  const [paymentTiming, setPaymentTiming] = useState('PAY_NOW'); // PAY_NOW | PAY_LATER
  const [isPaid, setIsPaid] = useState(false);
  const [status, setStatus] = useState('PENDING');
  const [shippingDate, setShippingDate] = useState('');
  const [shippingTimeRange, setShippingTimeRange] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingInstructions, setShippingInstructions] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingNit, setBillingNit] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(true);

  // Catering
  const [enableCatering, setEnableCatering] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(0);
  const [serviceType, setServiceType] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('Ninguna');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (orderToEdit) {
        populateForm(orderToEdit);
      } else {
        resetForm();
      }
    }
  }, [isOpen, orderToEdit]);

  const fetchData = async () => {
    try {
      const [custRes, branchRes, prodRes] = await Promise.all([
        api.get('/customers'),
        api.get('/branches'),
        api.get('/catalog/products')
      ]);
      setCustomers(custRes.data);
      setBranches(branchRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Error fetching data for form:', error);
    }
  };

  const populateForm = (order: any) => {
    setCustomerId(typeof order.customerId === 'object' ? order.customerId._id : order.customerId);
    setBranchId(order.branchId ? (typeof order.branchId === 'object' ? order.branchId._id : order.branchId) : '');
    setItems(order.items || []);
    setDeliveryType(order.deliveryType || 'PICKUP');
    setPaymentType(order.paymentType || 'CASH');
    setPaymentTiming(order.paymentTiming || 'PAY_NOW');
    setIsPaid(order.isPaid || false);
    setStatus(order.status || 'PENDING');
    setShippingDate(order.shippingDate || '');
    setShippingTimeRange(order.shippingTimeRange || '');
    setShippingAddress(order.shippingAddress || '');
    setShippingInstructions(order.shippingInstructions || '');
    setBillingName(order.billingName || '');
    setBillingNit(order.billingNit || '');
    
    if (order.eventDetails && order.eventDetails.eventName) {
      setEnableCatering(true);
      setEventName(order.eventDetails.eventName);
      setEventDate(order.eventDetails.eventDate || '');
      setEventTime(order.eventDetails.eventTime || '');
      setNumberOfPeople(order.eventDetails.numberOfPeople || 0);
      setServiceType(order.eventDetails.serviceType || '');
      setDietaryRestrictions(order.eventDetails.dietaryRestrictions || 'Ninguna');
    } else {
      setEnableCatering(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setBranchId('');
    setItems([]);
    setDeliveryType('PICKUP');
    setPaymentType('CASH');
    setPaymentTiming('PAY_NOW');
    setIsPaid(false);
    setStatus('PENDING');
    setShippingDate('');
    setShippingTimeRange('');
    setShippingAddress('');
    setShippingInstructions('');
    setBillingName('');
    setBillingNit('');
    setEnableCatering(false);
    setEventName('');
    setEventDate('');
    setEventTime('');
    setNumberOfPeople(0);
    setServiceType('');
    setDietaryRestrictions('Ninguna');
    setSendConfirmation(true);
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const addItem = () => {
    setItems([...items, { productId: '', name: '', price: 0, quantity: 1, modifications: [], scheduledDates: [] }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'productId') {
      const prod = products.find(p => p._id === value);
      if (prod) {
        newItems[index].productId = value;
        newItems[index].name = prod.name;
        newItems[index].price = prod.price;
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) return alert('Debes seleccionar un cliente');
    if (items.length === 0) return alert('Debes agregar al menos un producto');
    
    const orderData: any = {
      customerId,
      branchId: branchId || undefined,
      items,
      totalAmount: calculateTotal(),
      deliveryType,
      paymentType,
      paymentTiming,
      isPaid,
      status,
      shippingDate,
      shippingTimeRange,
      shippingAddress,
      shippingInstructions,
      billingName,
      billingNit
    };

    if (enableCatering) {
      orderData.eventDetails = {
        eventName,
        eventDate,
        eventTime,
        numberOfPeople,
        serviceType,
        dietaryRestrictions
      };
    }

    setLoading(true);
    try {
      if (orderToEdit) {
        await api.put(`/orders/${orderToEdit._id}`, orderData);
      } else {
        await api.post('/orders', { data: orderData, sendConfirmation });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error guardando la orden');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-corporate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-corporate-100">
          <h2 className="text-xl font-bold text-corporate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-accent" />
            {orderToEdit ? 'Editar Orden' : 'Nueva Orden Manual'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-corporate-50 rounded-full transition-colors text-corporate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-corporate-50/30">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Columna Izquierda: Cliente, Sucursal, Facturación */}
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-corporate-800 flex items-center gap-2 border-b pb-2">
                  <User className="w-4 h-4 text-corporate-500" /> Información Principal
                </h3>
                
                <div>
                  <label className="block text-xs font-bold text-corporate-600 mb-1">Cliente *</label>
                  <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
                    <option value="">Seleccionar Cliente...</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.profileName} {c.phoneNumber ? `(+${c.phoneNumber})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-corporate-600 mb-1">Sucursal</label>
                  <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
                    <option value="">(Opcional) Asignar Sucursal...</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">Estado de Orden</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none font-bold">
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="ON_THE_WAY">ON_THE_WAY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pagos */}
              <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-corporate-800 flex items-center gap-2 border-b pb-2">
                  <CreditCard className="w-4 h-4 text-corporate-500" /> Pagos & Facturación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">Método</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
                      <option value="CASH">Efectivo</option>
                      <option value="QR">QR</option>
                      <option value="TRANSFER">Transferencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">Momento Pago</label>
                    <select value={paymentTiming} onChange={e => setPaymentTiming(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
                      <option value="PAY_NOW">Ahora</option>
                      <option value="PAY_LATER">Al Entregar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold text-corporate-700">Marcar como PAGADO</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">Razón Social</label>
                    <input type="text" value={billingName} onChange={e => setBillingName(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" placeholder="Nombre factura..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">NIT / CI</label>
                    <input type="text" value={billingNit} onChange={e => setBillingNit(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" placeholder="NIT..." />
                  </div>
                </div>
              </div>

            </div>

            {/* Columna Derecha: Logística y Catering */}
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-corporate-800 flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-4 h-4 text-corporate-500" /> Logística
                </h3>
                
                <div>
                  <label className="block text-xs font-bold text-corporate-600 mb-1">Tipo de Entrega</label>
                  <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
                    <option value="PICKUP">Recojo en Sucursal</option>
                    <option value="DELIVERY">Envío a Domicilio</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">Fecha Entrega/Evento</label>
                    <input type="date" value={shippingDate} onChange={e => setShippingDate(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-corporate-600 mb-1">Hora / Rango</label>
                    <input type="text" value={shippingTimeRange} onChange={e => setShippingTimeRange(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" placeholder="Ej. 14:00 - 15:00" />
                  </div>
                </div>

                {deliveryType === 'DELIVERY' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-corporate-600 mb-1">Dirección de Entrega</label>
                      <textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={2} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" placeholder="Dirección exacta..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-corporate-600 mb-1">Instrucciones Especiales</label>
                      <input type="text" value={shippingInstructions} onChange={e => setShippingInstructions(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" placeholder="Ej. Tocar timbre rojo" />
                    </div>
                  </>
                )}
              </div>

              {/* Catering Details */}
              <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm space-y-4 border-t-4 border-t-purple-500">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-corporate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-corporate-500" /> Detalles Catering / Eventos
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={enableCatering} onChange={e => setEnableCatering(e.target.checked)} className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold">Habilitar</span>
                  </label>
                </div>

                {enableCatering && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-corporate-600 mb-1">Nombre del Evento</label>
                        <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej. Boda Civil, Cumpleaños" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-corporate-600 mb-1">Cant. Personas</label>
                        <input type="number" value={numberOfPeople} onChange={e => setNumberOfPeople(parseInt(e.target.value) || 0)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-corporate-600 mb-1">Tipo Servicio</label>
                        <input type="text" value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej. Buffet" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-corporate-600 mb-1">Restricciones Alimentarias</label>
                        <input type="text" value={dietaryRestrictions} onChange={e => setDietaryRestrictions(e.target.value)} className="w-full border border-corporate-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Lista de Productos */}
          <div className="bg-white p-5 rounded-xl border border-corporate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-corporate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-corporate-500" /> Carrito de Compras
              </h3>
              <button type="button" onClick={addItem} className="text-sm font-bold text-accent bg-accent/10 px-3 py-1 rounded-lg hover:bg-accent/20 transition-colors flex items-center gap-1">
                <Plus className="w-4 h-4" /> Agregar Ítem
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-corporate-50 p-3 rounded-lg border border-corporate-100">
                  <select 
                    value={item.productId} 
                    onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                    className="flex-1 border border-corporate-200 rounded-lg px-2 py-1.5 text-sm outline-none"
                    required
                  >
                    <option value="">Seleccionar Producto...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} (${p.price})</option>
                    ))}
                  </select>
                  <input 
                    type="number" min="1" 
                    value={item.quantity} 
                    onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20 border border-corporate-200 rounded-lg px-2 py-1.5 text-sm outline-none text-center"
                    title="Cantidad"
                  />
                  <div className="w-24 font-bold text-corporate-900 text-right">
                    Bs. {(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-corporate-400 text-center py-4 italic">No hay productos agregados</p>
              )}
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-lg">
              <span className="font-bold text-corporate-600">Total Calculado:</span>
              <span className="font-bold text-accent text-2xl">Bs. {calculateTotal().toFixed(2)}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-corporate-100 bg-corporate-50 flex items-center justify-between rounded-b-2xl">
          {!orderToEdit ? (
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-corporate-200 shadow-sm hover:border-accent transition-colors">
              <input type="checkbox" checked={sendConfirmation} onChange={e => setSendConfirmation(e.target.checked)} className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-corporate-700 flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-corporate-400" />
                Avisar al cliente por WhatsApp
              </span>
            </label>
          ) : (
            <div></div> // Espacio vacío
          )}
          
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-corporate-600 hover:bg-corporate-100 transition-colors">
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-accent text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-accent/90 transition-colors shadow-md shadow-accent/20"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : (orderToEdit ? 'Guardar Cambios' : 'Crear Orden')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

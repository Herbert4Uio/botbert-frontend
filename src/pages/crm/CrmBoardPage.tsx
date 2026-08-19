import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Settings, X, Trash2 } from 'lucide-react';
import { crmService } from '../../services/crm.service';

export function CrmBoardPage() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Deal
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealForm, setDealForm] = useState<any>({});
  
  // Modal Settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [stagesConfig, setStagesConfig] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pipelinesData, customersData] = await Promise.all([
        crmService.getPipelines(),
        crmService.getCustomers()
      ]);
      setCustomers(customersData);
      
      if (pipelinesData.length > 0) {
        const mainPipeline = pipelinesData[0];
        setPipeline(mainPipeline);
        setStagesConfig(mainPipeline.stages);
        loadDeals(mainPipeline._id);
      }
    } catch (error) {
      console.error('Error loading CRM data', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async (pipelineId: string) => {
    try {
      const data = await crmService.getDeals(pipelineId);
      setDeals(data);
    } catch (error) {
      console.error('Error loading deals', error);
    }
  };

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStageId = destination.droppableId;
    
    // Mutación optimista
    const newDeals = Array.from(deals);
    const dealIndex = newDeals.findIndex(d => d._id === draggableId);
    if (dealIndex > -1) {
      newDeals[dealIndex].stageId = newStageId;
      setDeals(newDeals);
    }

    try {
      await crmService.updateDealStage(draggableId, newStageId);
    } catch (error) {
      console.error('Error updating deal stage', error);
      loadDeals(pipeline._id);
    }
  };

  const openDealModal = (deal?: any, defaultStageId?: string) => {
    if (deal) {
      setDealForm({ ...deal, customerId: deal.customerId?._id || '' });
    } else {
      setDealForm({
        title: '',
        value: 0,
        customerId: '',
        stageId: defaultStageId || (pipeline?.stages.length > 0 ? pipeline.stages[0]._id : ''),
        expectedCloseDate: ''
      });
    }
    setIsDealModalOpen(true);
  };

  const saveDeal = async () => {
    try {
      if (dealForm._id) {
        await crmService.updateDeal(dealForm._id, dealForm);
      } else {
        await crmService.createDeal({ ...dealForm, pipelineId: pipeline._id });
      }
      setIsDealModalOpen(false);
      loadDeals(pipeline._id);
    } catch (error) {
      console.error('Error saving deal', error);
    }
  };

  const savePipelineSettings = async () => {
    try {
      // Reordenar
      const sortedStages = stagesConfig.map((s, idx) => ({ ...s, order: idx + 1 }));
      await crmService.updatePipeline(pipeline._id, { stages: sortedStages });
      setIsSettingsModalOpen(false);
      loadData(); // Recargar todo para refrescar la vista
    } catch (error) {
      console.error('Error updating pipeline', error);
    }
  };

  const addStageConfig = () => {
    setStagesConfig([
      ...stagesConfig, 
      { _id: Math.random().toString(), name: 'Nueva Fase', color: '#9CA3AF', isNew: true }
    ]);
  };

  if (loading) return <div className="p-6 text-gray-500">Cargando Embudo...</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pipeline?.name || 'Embudo de Ventas'}</h1>
          <p className="text-sm text-gray-500">Arrastra las oportunidades a través de las fases de venta.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm"
          >
            <Settings className="w-4 h-4" />
            Configurar Embudo
          </button>
          <button 
            onClick={() => openDealModal()}
            className="flex items-center gap-2 bg-corporate-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-corporate-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Deal
          </button>
        </div>
      </div>

      {!pipeline ? (
        <div className="text-center text-gray-500 mt-10">No se pudo inicializar el embudo.</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 h-full custom-scrollbar">
            {pipeline.stages?.sort((a:any, b:any) => a.order - b.order).map((stage: any, sIdx: number) => {
              const stageDeals = deals.filter(d => d.stageId === stage._id);
              const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
              const isLastStage = sIdx === pipeline.stages.length - 1;
              
              return (
                <div key={stage._id} className="min-w-[320px] w-[320px] bg-gray-100/50 rounded-xl flex flex-col h-full border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || '#ccc' }}></span>
                        {stage.name}
                      </h3>
                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{stageDeals.length}</span>
                    </div>
                    <div className="text-sm font-semibold text-corporate-600 mt-2">
                      Bs. {totalValue.toLocaleString()}
                    </div>
                  </div>

                  <Droppable droppableId={stage._id}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto p-3 min-h-[150px] custom-scrollbar"
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal._id} draggableId={deal._id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openDealModal(deal)}
                                className={`p-4 rounded-lg shadow-sm border mb-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                                  isLastStage 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <h4 className={`font-semibold text-sm mb-1 ${isLastStage ? 'text-green-900' : 'text-gray-900'}`}>
                                  {deal.title}
                                </h4>
                                <p className={`text-xs mb-3 ${isLastStage ? 'text-green-700' : 'text-gray-500'}`}>
                                  {deal.customerId?.fullName || deal.customerId?.profileName || 'Sin Contacto'}
                                </p>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                  <p className={`text-sm font-bold ${isLastStage ? 'text-green-700' : 'text-gray-900'}`}>
                                    Bs. {deal.value?.toLocaleString() || 0}
                                  </p>
                                  {deal.expectedCloseDate && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded">
                                      {new Date(deal.expectedCloseDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        <button 
                          onClick={() => openDealModal(null, stage._id)}
                          className="w-full py-2 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-corporate-600 hover:bg-white rounded-lg transition-colors mt-2"
                        >
                          <Plus className="w-4 h-4" /> Añadir Deal
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Modal: Editar/Crear Deal */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">{dealForm._id ? 'Editar Oportunidad' : 'Nueva Oportunidad'}</h3>
              <button onClick={() => setIsDealModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título del Deal</label>
                <input 
                  type="text" 
                  value={dealForm.title || ''}
                  onChange={(e) => setDealForm({...dealForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20"
                  placeholder="Ej. Servicio Boda 100 pax"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente / Contacto</label>
                <select 
                  value={dealForm.customerId || ''}
                  onChange={(e) => setDealForm({...dealForm, customerId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20"
                >
                  <option value="">Selecciona un cliente...</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.fullName || c.profileName} ({c.phoneNumber})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor (Bs)</label>
                  <input 
                    type="number" 
                    value={dealForm.value || ''}
                    onChange={(e) => setDealForm({...dealForm, value: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Cierre</label>
                  <input 
                    type="date" 
                    value={dealForm.expectedCloseDate ? dealForm.expectedCloseDate.split('T')[0] : ''}
                    onChange={(e) => setDealForm({...dealForm, expectedCloseDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fase Actual</label>
                <select 
                  value={dealForm.stageId || ''}
                  onChange={(e) => setDealForm({...dealForm, stageId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-corporate-500/20 bg-gray-50"
                >
                  {pipeline?.stages.map((s:any) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsDealModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={saveDeal}
                className="px-4 py-2 text-sm font-medium text-white bg-corporate-600 rounded-lg hover:bg-corporate-700"
              >
                Guardar Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configurar Embudo */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Configurar Fases del Embudo</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Personaliza las columnas de tu tablero. El orden de arriba hacia abajo será de izquierda a derecha. 
                (Protip: La última columna se considera siempre como "Ganado").
              </p>
              
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {stagesConfig.map((s, idx) => (
                  <div key={s._id || idx} className="flex items-center gap-3 bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                    <div className="cursor-move text-gray-400 px-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </div>
                    <input 
                      type="color" 
                      value={s.color || '#ccc'} 
                      onChange={(e) => {
                        const newConfig = [...stagesConfig];
                        newConfig[idx].color = e.target.value;
                        setStagesConfig(newConfig);
                      }}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <input 
                      type="text" 
                      value={s.name} 
                      onChange={(e) => {
                        const newConfig = [...stagesConfig];
                        newConfig[idx].name = e.target.value;
                        setStagesConfig(newConfig);
                      }}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-corporate-500"
                    />
                    <button 
                      onClick={() => {
                        const newConfig = [...stagesConfig];
                        newConfig.splice(idx, 1);
                        setStagesConfig(newConfig);
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Eliminar fase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={addStageConfig}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-corporate-500 hover:text-corporate-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir Nueva Fase
              </button>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={savePipelineSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-corporate-600 rounded-lg hover:bg-corporate-700"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

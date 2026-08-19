import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { crmService } from '../../services/crm.service';

export function CrmDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await crmService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Cargando métricas del CRM...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-red-500">Error al cargar el dashboard.</div>;
  }

  // Encontrar el valor máximo para calcular los porcentajes del gráfico
  const maxStageValue = stats.stages && stats.stages.length > 0 
    ? Math.max(...stats.stages.map((s: any) => s.value))
    : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard CRM</h1>
        <p className="text-gray-500 mt-2 text-sm">Resumen en tiempo real de tus oportunidades de venta y pipeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Oportunidades</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalDeals}</p>
          <p className="text-xs text-blue-600 mt-2 flex items-center font-medium">
            En tu embudo activo
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Valor del Pipeline</h3>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">Bs. {stats.pipelineValue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Ingresos potenciales totales</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tratos Ganados</h3>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.wonDeals}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Tratos cerrados con éxito</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contactos CRM</h3>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Directorio de prospectos y clientes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución del Valor por Fase (Embudo)</h3>
        
        {stats.stages && stats.stages.length > 0 ? (
          <div className="flex flex-col gap-4">
            {stats.stages.map((stage: any, index: number) => {
              const percentage = maxStageValue > 0 ? Math.round((stage.value / maxStageValue) * 100) : 0;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-48 text-sm font-medium text-gray-700 truncate" title={stage.name}>
                    {stage.name}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: stage.color || '#3B82F6',
                        minWidth: percentage > 0 ? '5%' : '0%'
                      }}
                    ></div>
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-sm font-bold text-gray-900">Bs. {stage.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{stage.count} deals</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aún no hay fases configuradas en tu embudo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tool, Department, Assignment, Employee, StandardToolList, CollectiveStation } from '@/lib/data';
import { Wrench, Users, ClipboardCheck, AlertTriangle, ArrowRight, Plus, ListChecks, Building2, Package } from 'lucide-react';

export default function Dashboard({ tools, departments, assignments, employees, standardLists, collectiveStations, onNavigate }: { 
  tools: Tool[], departments: Department[], assignments: Assignment[], employees: Employee[], standardLists: StandardToolList[], collectiveStations: CollectiveStation[], onNavigate: (tab: string) => void 
}) {
  // Helper to check for missing tools
  const getMissingToolsCount = (assignment: Assignment) => {
    const dept = departments.find(d => d.id === assignment.departmentId);
    let missingCount = 0;
    
    if (dept && dept.standardListId) {
      const standardList = standardLists.find(s => s.id === dept.standardListId);
      if (standardList) {
        standardList.tools.forEach(stdTool => {
          const assignedTool = assignment.assignedTools?.find(t => t.toolId === stdTool.toolId);
          const assignedQty = assignedTool ? assignedTool.quantity : 0;
          if (assignedQty < stdTool.quantity) {
            missingCount += (stdTool.quantity - assignedQty);
          }
        });
      }
    }
    return missingCount;
  };

  const pendingAssignments = (assignments || []).filter(a => getMissingToolsCount(a) > 0);
  const totalToolsAssigned = (assignments || []).reduce((acc, curr) => acc + (curr.assignedTools || []).reduce((sum, t) => sum + t.quantity, 0), 0);
  const totalCollectiveTools = (collectiveStations || []).reduce((acc, curr) => acc + (curr.tools || []).reduce((sum, t) => sum + t.quantity, 0), 0);

  const chartData = (departments || []).map(dept => {
    const individualCount = (assignments || [])
      .filter(a => a.departmentId === dept.id)
      .reduce((acc, curr) => acc + (curr.assignedTools || []).reduce((sum, t) => sum + t.quantity, 0), 0);
    
    // For collective tools, we'll match by line name if it matches department name
    const collectiveCount = (collectiveStations || [])
      .filter(s => s.line === dept.name)
      .reduce((acc, curr) => acc + (curr.tools || []).reduce((sum, t) => sum + t.quantity, 0), 0);

    return {
      name: dept.name,
      individual: individualCount,
      collective: collectiveCount,
      total: individualCount + collectiveCount
    };
  }).filter(d => d.total > 0);

  const stats = [
    { label: 'Total de Ferramentas', value: (tools || []).length, icon: Wrench, color: 'text-blue-600', bgColor: 'bg-blue-50', tab: 'tools' },
    { label: 'Uso Coletivo (Postos)', value: (collectiveStations || []).length, icon: Package, color: 'text-indigo-600', bgColor: 'bg-indigo-50', tab: 'collective' },
    { label: 'Atribuições Ativas', value: (assignments || []).length, icon: ClipboardCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50', tab: 'assignments' },
    { label: 'Pendências de Entrega', value: pendingAssignments.length, icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50', tab: 'assignments' },
  ];

  const recentAssignments = [...(assignments || [])]
    .sort((a, b) => new Date(b.dateAssigned).getTime() - new Date(a.dateAssigned).getTime())
    .slice(0, 5);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Painel de Controle</h1>
          <p className="text-slate-500 mt-1">Bem-vindo ao sistema de gestão de ferramentas Volga.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('assignments')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nova Atribuição
          </button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              onClick={() => onNavigate(stat.tab)}
              className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-800">Distribuição por Departamento</h2>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ferramentas Atribuídas</span>
            </div>
            <div className="h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="individual" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={45} name="Individual" />
                    <Bar dataKey="collective" stackId="a" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={45} name="Coletivo" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <ClipboardCheck className="w-12 h-12 opacity-20" />
                  <p>Nenhuma atribuição realizada ainda.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button 
              onClick={() => onNavigate('tools')}
              className="p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <Wrench className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-slate-700">Registrar Ferramenta</span>
            </button>
            <button 
              onClick={() => onNavigate('standard')}
              className="p-4 bg-white border border-slate-100 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <ListChecks className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-slate-700">Gerenciar Listas</span>
            </button>
            <button 
              onClick={() => onNavigate('collective')}
              className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <Package className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-slate-700">Uso Coletivo</span>
            </button>
            <button 
              onClick={() => onNavigate('employees')}
              className="p-4 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <Building2 className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-slate-700">Ver Departamentos</span>
            </button>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Atividades Recentes</h2>
            <button 
              onClick={() => onNavigate('assignments')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
            >
              Ver Todas
            </button>
          </div>
          <div className="p-6 flex-1">
            {recentAssignments.length > 0 ? (
              <div className="space-y-6">
                {recentAssignments.map((assignment, idx) => {
                  const emp = employees.find(e => e.id === assignment.employeeId);
                  const dept = departments.find(d => d.id === assignment.departmentId);
                  const missingCount = getMissingToolsCount(assignment);
                  
                  return (
                    <div key={assignment.id} className="flex gap-4 items-start group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        missingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {missingCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {emp?.name || 'Desconhecido'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dept?.name} • {new Date(assignment.dateAssigned).toLocaleDateString()}
                        </p>
                        {missingCount > 0 && (
                          <span className="inline-block mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter">
                            {missingCount} pendência(s)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                <ClipboardCheck className="w-12 h-12 opacity-20" />
                <p className="text-sm">Nenhuma atividade recente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

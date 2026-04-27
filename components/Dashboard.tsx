import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Tool, Department, Assignment, Employee, StandardToolList, CollectiveStation } from '@/lib/data';
import { Wrench, Users, ClipboardCheck, AlertTriangle, ArrowRight, Plus, ListChecks, Building2, Package, Activity, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard({ 
  tools, departments, assignments, employees, standardLists, collectiveStations, onNavigate, isDarkMode, toggleDarkMode,
  isGuest = false
}: { 
  tools: Tool[], departments: Department[], assignments: Assignment[], employees: Employee[], standardLists: StandardToolList[], collectiveStations: CollectiveStation[], onNavigate: (tab: string) => void,
  isDarkMode: boolean, toggleDarkMode: () => void,
  isGuest?: boolean
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
    { label: 'Total de Ferramentas', value: (tools || []).length, icon: Wrench, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', tab: 'tools' },
    { label: 'Uso Coletivo (Postos)', value: (collectiveStations || []).length, icon: Package, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', tab: 'collective' },
    { label: 'Atribuições Ativas', value: (assignments || []).length, icon: ClipboardCheck, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', tab: 'assignments' },
    { label: 'Pendências de Entrega', value: pendingAssignments.length, icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', tab: 'assignments' },
  ];

  const recentAssignments = [...(assignments || [])]
    .sort((a, b) => new Date(b.dateAssigned).getTime() - new Date(a.dateAssigned).getTime())
    .slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-400" />
            Painel de Controle
          </h1>
          <p className="text-zinc-400 mt-1 font-mono text-sm">SISTEMA // STATUS: ONLINE</p>
        </div>
        <div className="flex gap-3">
          {!isGuest && (
            <button 
              onClick={() => onNavigate('assignments')}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 hover:border-cyan-400 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" /> Nova Atribuição
            </button>
          )}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={i} 
              variants={itemVariants}
              onClick={() => onNavigate(stat.tab)}
              className={`bg-[#0a0a0a] rounded-xl p-6 border ${stat.borderColor} cursor-pointer hover:bg-zinc-900/80 transition-all group relative overflow-hidden`}
            >
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl border ${stat.borderColor} group-hover:scale-110 transition-transform shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="relative z-10">
                <p className="text-sm text-zinc-400 font-medium">{stat.label}</p>
                <p className={`text-4xl font-bold ${stat.color} mt-1 font-mono tracking-tight`}>{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-white/105 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-cyan-400" />
                Distribuição por Departamento
              </h2>
              <span className="text-xs font-mono text-cyan-500/70 uppercase tracking-widest border border-cyan-500/20 px-2 py-1 rounded bg-cyan-500/5">Métricas Ativas</span>
            </div>
            <div className="h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'monospace' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'monospace' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '12px', 
                        border: '1px solid rgba(56, 189, 248, 0.2)', 
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                        padding: '12px',
                        color: '#f8fafc',
                        fontFamily: 'monospace'
                      }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontFamily: 'monospace', fontSize: '12px' }} />
                    <Bar dataKey="individual" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} name="Individual" />
                    <Bar dataKey="collective" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} name="Coletivo" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
                  <div className="w-16 h-16 rounded-full border border-white/105 flex items-center justify-center bg-zinc-900/50">
                    <ClipboardCheck className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-mono text-sm">Aguardando dados...</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button 
              onClick={() => onNavigate('tools')}
              className="p-4 bg-[#0a0a0a] border border-white/105 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all flex flex-col items-center text-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Wrench className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-cyan-400 transition-colors uppercase tracking-wider">Registrar Ferramenta</span>
            </button>
            <button 
              onClick={() => onNavigate('standard')}
              className="p-4 bg-[#0a0a0a] border border-white/105 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/10 transition-all flex flex-col items-center text-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <ListChecks className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-purple-400 transition-colors uppercase tracking-wider">Gerenciar Listas</span>
            </button>
            <button 
              onClick={() => onNavigate('collective')}
              className="p-4 bg-[#0a0a0a] border border-white/105 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all flex flex-col items-center text-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Package className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">Uso Coletivo</span>
            </button>
            <button 
              onClick={() => onNavigate('employees')}
              className="p-4 bg-[#0a0a0a] border border-white/105 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex flex-col items-center text-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Building2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Departamentos</span>
            </button>
          </div>
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-xl border border-white/105 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-1 bg-gradient-to-l from-transparent via-blue-500/50 to-transparent" />
          <div className="p-6 border-b border-white/5/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Log de Atividades
            </h2>
            <button 
              onClick={() => onNavigate('assignments')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-widest"
            >
              [Ver_Todas]
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
                    <motion.div 
                      key={assignment.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex gap-4 items-start group relative"
                    >
                      <div className="absolute left-5 top-10 bottom-[-24px] w-px bg-zinc-900 group-last:hidden" />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 border ${
                        missingCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}>
                        {missingCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors">
                          {emp?.name || 'Desconhecido'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1 font-mono">
                          {dept?.name} | {new Date(assignment.dateAssigned).toLocaleDateString()}
                        </p>
                        {missingCount > 0 && (
                          <span className="inline-block mt-2 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase tracking-widest">
                            {missingCount} pendência(s)
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 py-12">
                <div className="w-16 h-16 rounded-full border border-white/105 flex items-center justify-center bg-zinc-900/50">
                  <ClipboardCheck className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-mono text-sm">Nenhum log registrado.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

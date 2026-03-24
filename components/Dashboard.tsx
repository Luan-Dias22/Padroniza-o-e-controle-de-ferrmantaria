import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tool, AssemblyLine, Assignment } from '@/lib/data';
import { Wrench, Users, LayoutList, ClipboardCheck } from 'lucide-react';

export default function Dashboard({ tools, lines, assignments, onNavigate }: { 
  tools: Tool[], lines: AssemblyLine[], assignments: Assignment[], onNavigate: (tab: string) => void 
}) {
  const chartData = lines.map(line => {
    const assignedToolsCount = assignments
      .filter(a => a.lineId === line.id)
      .reduce((acc, curr) => acc + (curr.assignedTools || []).reduce((sum, t) => sum + t.quantity, 0), 0);
    return {
      name: line.name,
      tools: assignedToolsCount
    };
  });

  const stats = [
    { label: 'Total de Ferramentas', value: tools.length, icon: Wrench, color: 'bg-blue-500', tab: 'tools' },
    { label: 'Linhas de Montagem', value: lines.length, icon: LayoutList, color: 'bg-purple-500', tab: 'standard' },
    { label: 'Atribuições Ativas', value: assignments.length, icon: ClipboardCheck, color: 'bg-green-500', tab: 'assignments' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Painel</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              onClick={() => onNavigate(stat.tab)}
              className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className={`${stat.color} text-white p-4 rounded-lg`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Ferramentas Atribuídas por Linha de Montagem</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="tools" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

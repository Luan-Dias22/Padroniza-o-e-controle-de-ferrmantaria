'use client';

import { useState } from 'react';
import { Wrench, LayoutDashboard, ListChecks, Users, Menu, X, Building2 } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ToolRegistration from '@/components/ToolRegistration';
import StandardToolLists from '@/components/StandardToolLists';
import EmployeeAssignments from '@/components/EmployeeAssignments';
import Employees from '@/components/Employees';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { mockTools, mockLines, mockStandardLists, mockEmployees, mockAssignments, mockDepartments, Tool, AssemblyLine, StandardToolList, Employee, Assignment, Department } from '@/lib/data';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [tools, setTools, toolsInit] = useLocalStorage<Tool[]>('tools', mockTools);
  const [lines, setLines, linesInit] = useLocalStorage<AssemblyLine[]>('assemblyLines', mockLines);
  const [standardLists, setStandardLists, listsInit] = useLocalStorage<StandardToolList[]>('standardToolLists', mockStandardLists);
  const [employees, setEmployees, empInit] = useLocalStorage<Employee[]>('employees', mockEmployees);
  const [departments, setDepartments, deptInit] = useLocalStorage<Department[]>('departments', mockDepartments);
  const [assignments, setAssignments, assignInit] = useLocalStorage<Assignment[]>('assignments', mockAssignments);

  const isReady = toolsInit && linesInit && listsInit && empInit && assignInit && deptInit;

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'tools', label: 'Registro de Ferramentas', icon: Wrench },
    { id: 'standard', label: 'Listas Padrão', icon: ListChecks },
    { id: 'employees', label: 'Colaboradores', icon: Building2 },
    { id: 'assignments', label: 'Atribuições', icon: Users },
  ];

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="font-bold text-lg flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-400" />
          ToolManager
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0`}>
        <div className="p-6 hidden md:flex items-center gap-3 text-white font-bold text-xl border-b border-slate-800">
          <Wrench className="w-6 h-6 text-blue-400" />
          ToolManager
        </div>
        <nav className="p-4 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {activeTab === 'dashboard' && (
          <Dashboard 
            tools={tools} 
            lines={lines} 
            assignments={assignments} 
            onNavigate={setActiveTab} 
          />
        )}
        {activeTab === 'tools' && (
          <ToolRegistration 
            tools={tools} 
            setTools={setTools} 
            standardLists={standardLists}
            setStandardLists={setStandardLists}
            assignments={assignments}
            setAssignments={setAssignments}
          />
        )}
        {activeTab === 'standard' && (
          <StandardToolLists 
            lines={lines} 
            setLines={setLines}
            tools={tools}
            standardLists={standardLists}
            setStandardLists={setStandardLists}
          />
        )}
        {activeTab === 'employees' && (
          <Employees 
            employees={employees}
            setEmployees={setEmployees}
            departments={departments}
            setDepartments={setDepartments}
            assignments={assignments}
            setAssignments={setAssignments}
            lines={lines}
            tools={tools}
            standardLists={standardLists}
          />
        )}
        {activeTab === 'assignments' && (
          <EmployeeAssignments 
            employees={employees}
            setEmployees={setEmployees}
            lines={lines}
            tools={tools}
            standardLists={standardLists}
            assignments={assignments}
            setAssignments={setAssignments}
          />
        )}
      </main>
    </div>
  );
}

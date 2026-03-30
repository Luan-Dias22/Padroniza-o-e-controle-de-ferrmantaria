'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Wrench, LayoutDashboard, ListChecks, Users, Menu, X, Building2, LogOut, LogIn, FileText, LayoutGrid } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ToolRegistration from '@/components/ToolRegistration';
import StandardToolLists from '@/components/StandardToolLists';
import EmployeeAssignments from '@/components/EmployeeAssignments';
import Employees from '@/components/Employees';
import Reports from '@/components/Reports';
import CollectiveTools from '@/components/CollectiveTools';
import { useFirestore } from '@/lib/useFirestore';
import { mockTools, mockStandardLists, mockEmployees, mockAssignments, mockDepartments, Tool, StandardToolList, Employee, Assignment, Department, CollectiveLine, CollectiveStation } from '@/lib/data';
import { auth, signInWithGoogle, logOut } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const [tools, setTools, toolsInit] = useFirestore<Tool>('tools', mockTools);
  const [standardLists, setStandardLists, listsInit] = useFirestore<StandardToolList>('standardToolLists', mockStandardLists);
  const [employees, setEmployees, empInit] = useFirestore<Employee>('employees', mockEmployees);
  const [departments, setDepartments, deptInit] = useFirestore<Department>('departments', mockDepartments);
  const [assignments, setAssignments, assignInit] = useFirestore<Assignment>('assignments', mockAssignments);
  const [collectiveLines, setCollectiveLines, linesInit] = useFirestore<CollectiveLine>('collectiveLines', []);
  const [collectiveStations, setCollectiveStations, stationsInit] = useFirestore<CollectiveStation>('collectiveStations', []);

  const isReady = authInitialized && (!user || (toolsInit && listsInit && empInit && assignInit && deptInit && linesInit && stationsInit));

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('O pop-up foi fechado antes de concluir o login. Tente novamente.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Este domínio não está autorizado no Firebase. Por favor, verifique as configurações.');
      } else {
        setLoginError(`Erro ao fazer login: ${error.message}. Se você estiver usando Safari, modo anônimo ou bloqueadores de rastreamento, tente desativá-los ou usar outro navegador.`);
      }
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'tools', label: 'Registro de Ferramentas', icon: Wrench },
    { id: 'standard', label: 'Listas Padrão', icon: ListChecks },
    { id: 'employees', label: 'Colaboradores', icon: Building2 },
    { id: 'assignments', label: 'Atribuições', icon: Users },
    { id: 'collective', label: 'Ferramentas Coletivas', icon: LayoutGrid },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-600">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">ToolManager</h1>
          <p className="text-slate-500 mb-8">Faça login para gerenciar o inventário de ferramentas da sua equipe.</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-left">
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
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
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0 z-40`}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">ToolManager</span>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            {user.photoURL ? (
              <Image src={user.photoURL} alt="Profile" width={32} height={32} className="rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName || 'Usuário'}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {activeTab === 'dashboard' && (
          <Dashboard 
            tools={tools} 
            departments={departments} 
            assignments={assignments} 
            employees={employees}
            standardLists={standardLists}
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
            departments={departments} 
            setDepartments={setDepartments}
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
            tools={tools}
            standardLists={standardLists}
          />
        )}
        {activeTab === 'assignments' && (
          <EmployeeAssignments 
            employees={employees}
            setEmployees={setEmployees}
            departments={departments}
            tools={tools}
            standardLists={standardLists}
            assignments={assignments}
            setAssignments={setAssignments}
          />
        )}
        {activeTab === 'reports' && (
          <Reports 
            tools={tools}
            departments={departments}
            assignments={assignments}
            employees={employees}
          />
        )}
        {activeTab === 'collective' && (
          <CollectiveTools 
            lines={collectiveLines}
            setLines={setCollectiveLines}
            stations={collectiveStations}
            setStations={setCollectiveStations}
            tools={tools}
          />
        )}
      </main>
    </div>
  );
}

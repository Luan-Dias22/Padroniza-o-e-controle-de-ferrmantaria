'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Wrench, LayoutDashboard, ListChecks, Users, Menu, X, Building2, LogOut, LogIn, FileText, LayoutGrid, Settings as SettingsIcon, Calculator, ExternalLink } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ToolRegistration from '@/components/ToolRegistration';
import StandardToolLists from '@/components/StandardToolLists';
import EmployeeAssignments from '@/components/EmployeeAssignments';
import Employees from '@/components/Employees';
import Reports from '@/components/Reports';
import CollectiveTools from '@/components/CollectiveTools';
import Settings from '@/components/Settings';
import Budgets from '@/components/Budgets';
import { useFirestore } from '@/lib/useFirestore';
import { mockTools, mockStandardLists, mockEmployees, mockAssignments, mockDepartments, Tool, StandardToolList, Employee, Assignment, Department, CollectiveLine, CollectiveStation } from '@/lib/data';
import { auth, signInWithGoogle, signInWithGoogleRedirect, logOut } from '@/lib/firebase';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return savedTheme === 'dark' || (!savedTheme && prefersDark);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setUser(result.user);
        }
      } catch (error: any) {
        console.error("Redirect login error:", error);
        setLoginError(`Erro ao fazer login via redirecionamento: ${error.message}`);
      }
    };

    checkRedirectResult();

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
    setIsLoggingIn(true);
    try {
      // Revertendo para Popup pois o ambiente do AI Studio bloqueia o Redirecionamento (Erro 403)
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoggingIn(false);
      
      if (error.code === 'auth/popup-blocked') {
        setLoginError('O pop-up de login foi bloqueado. Por favor, clique novamente e permita pop-ups para este site.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('O login foi cancelado. Tente clicar no botão novamente.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Domínio não autorizado. Se estiver usando o link de compartilhamento, tente o link de desenvolvimento.');
      } else {
        setLoginError(`Erro: ${error.message || 'Erro ao conectar'}. Dica: Tente abrir o app em uma nova aba do navegador.`);
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
    { id: 'budgets', label: 'Orçamentos', icon: Calculator },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon },
  ];

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-600">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
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
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar com Google
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="font-bold text-lg flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-400" />
          ToolManager
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-screen transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:block
      `}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">ToolManager</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-2 space-y-0.5 flex-grow overflow-y-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-left ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* User Profile & Logout */}
        <div className="p-2 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-1 px-2">
            {user.photoURL ? (
              <Image src={user.photoURL} alt="Profile" width={24} height={24} className="rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                <Users className="w-3 h-3 text-slate-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white truncate">{user.displayName || 'Usuário'}</p>
              <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[11px] font-medium">Sair</span>
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
            collectiveStations={collectiveStations}
            onNavigate={setActiveTab} 
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
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
            collectiveStations={collectiveStations}
            standardLists={standardLists}
            collectiveLines={collectiveLines}
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
        {activeTab === 'settings' && (
          <Settings />
        )}
        {activeTab === 'budgets' && (
          <Budgets 
            tools={tools}
            setTools={setTools}
            departments={departments}
            assignments={assignments}
            employees={employees}
            collectiveStations={collectiveStations}
            standardLists={standardLists}
            collectiveLines={collectiveLines}
          />
        )}
      </main>
    </div>
  );
}

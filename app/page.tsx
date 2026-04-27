'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, LayoutDashboard, ListChecks, Users, Menu, X, Building2, LogOut, LogIn, FileText, LayoutGrid, Settings as SettingsIcon, Calculator, Zap, Package } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ToolRegistration from '@/components/ToolRegistration';
import StandardToolLists from '@/components/StandardToolLists';
import EmployeeAssignments from '@/components/EmployeeAssignments';
import Employees from '@/components/Employees';
import Reports from '@/components/Reports';
import CollectiveTools from '@/components/CollectiveTools';
import Settings from '@/components/Settings';
import Budgets from '@/components/Budgets';
import Inventory from '@/components/Inventory';
import { useFirestore } from '@/lib/useFirestore';
import { mockTools, mockStandardLists, mockEmployees, mockAssignments, mockDepartments, Tool, StandardToolList, Employee, Assignment, Department, CollectiveLine, CollectiveStation, StockEntry } from '@/lib/data';
import { auth, signInWithGoogle, logOut } from '@/lib/firebase';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Force dark mode for the technological look
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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

  const [tools, setTools, toolsInit, syncTools] = useFirestore<Tool>('tools', mockTools, user?.uid || (isGuest ? 'guest' : null));
  const [standardLists, setStandardLists, listsInit, syncLists] = useFirestore<StandardToolList>('standardToolLists', mockStandardLists, user?.uid || (isGuest ? 'guest' : null));
  const [employees, setEmployees, empInit, syncEmployees] = useFirestore<Employee>('employees', mockEmployees, user?.uid || (isGuest ? 'guest' : null));
  const [departments, setDepartments, deptInit, syncDepts] = useFirestore<Department>('departments', mockDepartments, user?.uid || (isGuest ? 'guest' : null));
  const [assignments, setAssignments, assignInit, syncAssignments] = useFirestore<Assignment>('assignments', mockAssignments, user?.uid || (isGuest ? 'guest' : null));
  const [collectiveLines, setCollectiveLines, linesInit, syncLines] = useFirestore<CollectiveLine>('collectiveLines', [], user?.uid || (isGuest ? 'guest' : null));
  const [collectiveStations, setCollectiveStations, stationsInit, syncStations] = useFirestore<CollectiveStation>('collectiveStations', [], user?.uid || (isGuest ? 'guest' : null));
  const [stockEntries, setStockEntries, stockInit, syncStock] = useFirestore<StockEntry>('stockEntries', [], user?.uid || (isGuest ? 'guest' : null));

  const syncAllData = async (targetUserId?: string) => {
    try {
      await Promise.all([
        syncTools(targetUserId),
        syncLists(targetUserId),
        syncEmployees(targetUserId),
        syncDepts(targetUserId),
        syncAssignments(targetUserId),
        syncLines(targetUserId),
        syncStations(targetUserId),
        syncStock(targetUserId)
      ]);
      return true;
    } catch (error) {
      console.error("Error syncing all data:", error);
      return false;
    }
  };

  const restoreTemplateAll = () => {
    setTools(mockTools);
    setStandardLists(mockStandardLists);
    setEmployees(mockEmployees);
    setDepartments(mockDepartments);
    setAssignments(mockAssignments);
    setCollectiveLines([]);
    setCollectiveStations([]);
    setStockEntries([]);
  };

  const getBackupData = () => {
    return {
      tools,
      standardLists,
      employees,
      departments,
      assignments,
      collectiveLines,
      collectiveStations,
      stockEntries,
      timestamp: new Date().toISOString(),
      version: '1.1'
    };
  };

  const restoreFromBackup = (data: any) => {
    if (data.tools) setTools(data.tools);
    if (data.standardLists) setStandardLists(data.standardLists);
    if (data.employees) setEmployees(data.employees);
    if (data.departments) setDepartments(data.departments);
    if (data.assignments) setAssignments(data.assignments);
    if (data.collectiveLines) setCollectiveLines(data.collectiveLines || []);
    if (data.collectiveStations) setCollectiveStations(data.collectiveStations || []);
    if (data.stockEntries) setStockEntries(data.stockEntries || []);
    return true;
  };

  const isReady = authInitialized && (!user || (toolsInit && listsInit && empInit && assignInit && deptInit && linesInit && stationsInit && stockInit));

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    setIsGuest(false);
    try {
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

  const handleGuestLogin = () => {
    setIsGuest(true);
    setUser({
      uid: 'guest',
      displayName: 'Convidado',
      email: 'convidado@sistema.com',
      photoURL: null,
    } as User);
  };

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false);
      setUser(null);
    } else {
      await logOut();
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'tools', label: 'Registro de Ferramentas', icon: Wrench },
    { id: 'standard', label: 'Listas Padrão', icon: ListChecks },
    { id: 'employees', label: 'Colaboradores', icon: Building2 },
    { id: 'assignments', label: 'Atribuições', icon: Users },
    { id: 'collective', label: 'Ferramentas Coletivas', icon: LayoutGrid },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'budgets', label: 'Orçamentos', icon: Calculator },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon },
  ];

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-cyan-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Zap className="w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-sm max-w-md w-full text-center relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 relative mx-auto mb-6"
          >
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill 
              className="object-contain"
              onError={(e) => {
                const target = e.target as any;
                target.style.display = 'none';
                target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl items-center justify-center shadow-sm">
              <Wrench className="w-12 h-12" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-white mb-2 tracking-tight">Tool Manager <span className="text-cyan-400">OS</span></h1>
          <p className="text-zinc-400 mb-8 text-sm">Sistema avançado de gestão e padronização de ferramentaria.</p>
          
          {loginError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20 text-left"
            >
              {loginError}
            </motion.div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-sm mb-4"
          >
            {isLoggingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Acessar Sistema
              </>
            )}
          </button>

          <button
            onClick={handleGuestLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-[#0a0a0a] hover:bg-slate-700 text-zinc-300 font-medium py-3 px-4 rounded-xl transition-all border border-white/5"
          >
            <Users className="w-5 h-5" />
            Entrar como Convidado
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans text-zinc-200 selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Global Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="font-bold text-lg flex items-center gap-3 text-white">
          <div className="w-8 h-8 relative">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill 
              className="object-contain"
              onError={(e) => {
                const target = e.target as any;
                target.style.display = 'none';
                target.nextSibling.style.display = 'flex';
              }}
            />
            <Wrench className="hidden w-full h-full text-cyan-400" />
          </div>
          Tool Manager <span className="text-cyan-400 text-xs align-top">OS</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-zinc-300 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-transparent/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a]/50 backdrop-blur-xl border-r border-white/5 flex-shrink-0 flex flex-col h-screen
          md:relative md:translate-x-0 md:block
        `}
        initial={false}
        animate={{ x: isMobileMenuOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 768 ? '-100%' : 0) }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="p-5 flex items-center justify-between border-b border-white/5/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative flex-shrink-0">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill 
                className="object-contain"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as any;
                  target.style.display = 'none';
                  target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl items-center justify-center shadow-sm">
                <Wrench className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Tool Manager</span>
          </div>
          <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-3 space-y-1 flex-grow overflow-y-auto custom-scrollbar">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative group ${
                  isActive 
                    ? 'text-cyan-400 bg-cyan-500/10' 
                    : 'text-zinc-400 hover:bg-[#0a0a0a]/50 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/20 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-cyan-400' : 'group-hover:text-cyan-400 transition-colors'}`} />
                <span className="text-sm font-medium relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/5/50 bg-[#0a0a0a]/30">
          <div className="flex items-center gap-3 mb-3">
            {user.photoURL ? (
              <Image src={user.photoURL} alt="Profile" width={36} height={36} className="rounded-full border border-white/5" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 bg-[#0a0a0a] border border-white/5 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName || 'Operador'}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Desconectar
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto relative z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                tools={tools} 
                departments={departments} 
                assignments={assignments} 
                employees={employees}
                standardLists={standardLists}
                collectiveStations={collectiveStations}
                onNavigate={setActiveTab} 
                isDarkMode={true}
                toggleDarkMode={() => {}}
                isGuest={isGuest}
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
                isGuest={isGuest}
              />
            )}
            {activeTab === 'standard' && (
              <StandardToolLists 
                departments={departments} 
                setDepartments={setDepartments}
                tools={tools}
                standardLists={standardLists}
                setStandardLists={setStandardLists}
                isGuest={isGuest}
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
                isGuest={isGuest}
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
                stockEntries={stockEntries}
                setStockEntries={setStockEntries}
                isGuest={isGuest}
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
                stockEntries={stockEntries}
              />
            )}
            {activeTab === 'collective' && (
              <CollectiveTools 
                lines={collectiveLines}
                setLines={setCollectiveLines}
                stations={collectiveStations}
                setStations={setCollectiveStations}
                tools={tools}
                stockEntries={stockEntries}
                isGuest={isGuest}
              />
            )}
            {activeTab === 'inventory' && (
              <Inventory 
                tools={tools}
                departments={departments}
                collectiveLines={collectiveLines}
                collectiveStations={collectiveStations}
                stockEntries={stockEntries}
                standardLists={standardLists}
                employees={employees}
                setStockEntries={setStockEntries}
                isGuest={isGuest}
              />
            )}
            {activeTab === 'settings' && (
              <Settings 
                onSync={syncAllData} 
                onSyncToGuest={() => syncAllData('guest')}
                onGetBackup={getBackupData}
                onRestoreBackup={restoreFromBackup}
                isGuest={isGuest} 
              />
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
                stockEntries={stockEntries}
                isGuest={isGuest}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

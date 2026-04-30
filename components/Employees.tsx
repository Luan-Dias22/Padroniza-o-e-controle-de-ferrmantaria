import { useState, useMemo } from 'react';
import { Employee, Department, Assignment, Tool, StandardToolList } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, Users, Building2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmModal from './ConfirmModal';
import { sortByName } from '@/lib/utils';

export default function Employees({
  employees, setEmployees,
  departments, setDepartments,
  assignments, setAssignments,
  tools, standardLists,
  isGuest = false,
  currentUser
}: {
  employees: Employee[], setEmployees: (e: Employee[]) => void,
  departments: Department[], setDepartments: (d: Department[]) => void,
  assignments: Assignment[], setAssignments: (a: Assignment[]) => void,
  tools: Tool[], standardLists: StandardToolList[],
  isGuest?: boolean,
  currentUser: any
}) {
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptNewcomers, setEditDeptNewcomers] = useState<number>(0);
  const [editDeptRequiredHeadcount, setEditDeptRequiredHeadcount] = useState<number>(0);

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [sortByMatricula, setSortByMatricula] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => sortByName(a.name, b.name));
  }, [departments]);

  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpId.trim() || !newEmpDept) return;
    
    if (editingEmpId) {
      setEmployees(employees.map(emp => emp.id === editingEmpId ? {
        ...emp,
        employeeId: newEmpId.trim(),
        name: newEmpName.trim(),
        departmentId: newEmpDept,
        uid: currentUser?.uid || 'guest'
      } : emp));
      setEditingEmpId(null);
    } else {
      setEmployees([...employees, {
        id: crypto.randomUUID(),
        employeeId: newEmpId.trim(),
        name: newEmpName.trim(),
        departmentId: newEmpDept,
        uid: currentUser?.uid || 'guest'
      }]);
    }
    
    setNewEmpName('');
    setNewEmpId('');
    setNewEmpDept('');
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setNewEmpId(emp.employeeId);
    setNewEmpName(emp.name);
    setNewEmpDept(emp.departmentId);
  };

  const cancelEditEmployee = () => {
    setEditingEmpId(null);
    setNewEmpName('');
    setNewEmpId('');
    setNewEmpDept('');
  };

  const handleDeleteEmployee = (id: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Colaborador',
      message: 'Excluir este colaborador? Todas as suas atribuições de ferramentas também serão excluídas.',
      onConfirm: () => {
        setEmployees(employees.filter(emp => emp.id !== id));
        // Cascade delete assignments
        setAssignments(assignments.filter(a => a.employeeId !== id));
      }
    });
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    
    setDepartments([...departments, {
      id: crypto.randomUUID(),
      name: newDeptName.trim(),
      expectedNewcomers: 0,
      uid: currentUser?.uid || 'guest'
    }]);
    
    setNewDeptName('');
  };

  const handleUpdateDepartment = () => {
    if (!editDeptName.trim() || !editingDeptId) return;
    setDepartments(departments.map(d => d.id === editingDeptId ? { 
      ...d, 
      name: editDeptName.trim(), 
      expectedNewcomers: editDeptNewcomers,
      requiredHeadcount: editDeptRequiredHeadcount,
      uid: currentUser?.uid || 'guest'
    } : d));
    setEditingDeptId(null);
  };

  const handleDeleteDepartment = (id: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Departamento',
      message: 'Excluir este departamento? Os colaboradores vinculados ficarão sem departamento.',
      onConfirm: () => {
        setDepartments(departments.filter(d => d.id !== id));
        // Cascade update employees
        setEmployees(employees.map(emp => 
          emp.departmentId === id ? { ...emp, departmentId: '' } : emp
        ));
      }
    });
  };

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
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Colaboradores e Departamentos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departments Management */}
        <motion.div variants={itemVariants} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-teal-500/50" />
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Departamentos</h2>
          </div>
          {!isGuest && (
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
              <form onSubmit={handleAddDepartment} className="flex gap-2">
                <input 
                  type="text" 
                  value={newDeptName} 
                  onChange={e => setNewDeptName(e.target.value)}
                  placeholder="Novo departamento..."
                  className="flex-1 p-2.5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                />
                <button type="submit" className="p-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 hover:border-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {sortedDepartments.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 p-4 text-sm font-mono">Nenhum departamento criado.</p>
            ) : (
              <ul className="space-y-2">
                {sortedDepartments.map(dept => (
                  <motion.li 
                    key={dept.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100/50 dark:bg-slate-800/50 border border-transparent transition-colors"
                  >
                    {editingDeptId === dept.id ? (
                      <div className="flex flex-col gap-3 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={editDeptName} 
                          onChange={e => setEditDeptName(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                          placeholder="Nome do departamento"
                        />
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Novatos previstos:</span>
                            <input 
                              type="number"
                              min="0"
                              value={editDeptNewcomers} 
                              onChange={e => setEditDeptNewcomers(parseInt(e.target.value) || 0)}
                              className="w-16 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Funcionários Nec.:</span>
                            <input 
                              type="number"
                              min="0"
                              value={editDeptRequiredHeadcount} 
                              onChange={e => setEditDeptRequiredHeadcount(parseInt(e.target.value) || 0)}
                              className="w-16 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                            />
                            <div className="flex-1"></div>
                            <button onClick={handleUpdateDepartment} className="text-emerald-400 p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{dept.name}</span>
                          <div className="flex gap-1">
                            {!isGuest && (
                              <>
                                <button onClick={() => { 
                                  setEditingDeptId(dept.id); 
                                  setEditDeptName(dept.name); 
                                  setEditDeptNewcomers(dept.expectedNewcomers || 0);
                                  setEditDeptRequiredHeadcount(dept.requiredHeadcount || 0);
                                }} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteDepartment(dept.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {(dept.expectedNewcomers || 0) > 0 && (
                          <span className="text-[10px] font-mono text-emerald-400 mt-2 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 w-fit uppercase tracking-widest">
                            +{dept.expectedNewcomers} novato(s) previsto(s)
                          </span>
                        )}
                        {(dept.requiredHeadcount || 0) > 0 && (
                          <span className="text-[10px] font-mono text-cyan-400 mt-1 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 w-fit uppercase tracking-widest">
                            Meta: {dept.requiredHeadcount} funcionário(s)
                          </span>
                        )}
                      </div>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Employees Management */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[500px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-1 bg-gradient-to-l from-emerald-500/50 to-transparent" />
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingEmpId ? 'Editar Colaborador' : 'Colaboradores'}</h2>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                className="flex-1 sm:flex-none text-sm p-2 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all sm:w-48"
              />
              <button
                onClick={() => setSortByMatricula(!sortByMatricula)}
                className={`text-xs font-mono p-2 border rounded-xl outline-none transition-all uppercase tracking-wider ${
                  sortByMatricula 
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:bg-slate-800/50'
                }`}
                title="Ordenar por Matrícula"
              >
                Matrícula {sortByMatricula ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          {!isGuest && (
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
              <form onSubmit={handleSubmitEmployee} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <input 
                  type="text" 
                  value={newEmpId} 
                  onChange={e => setNewEmpId(e.target.value)}
                  placeholder="Matrícula (ex: EMP-103)"
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                />
                <input 
                  type="text" 
                  value={newEmpName} 
                  onChange={e => setNewEmpName(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all sm:col-span-2"
                />
                <select
                  value={newEmpDept}
                  onChange={e => setNewEmpDept(e.target.value)}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all appearance-none"
                >
                  <option value="">-- Departamento --</option>
                  {sortedDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <div className="sm:col-span-4 flex justify-end gap-3 mt-2">
                  {editingEmpId && (
                    <button 
                      type="button" 
                      onClick={cancelEditEmployee}
                      className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-900 dark:text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                    {editingEmpId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingEmpId ? 'Atualizar Colaborador' : 'Adicionar Colaborador'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {employees.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-mono text-sm">
                Nenhum colaborador registrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {employees
                  .filter(emp => {
                    if (!employeeSearch) return true;
                    const searchLower = employeeSearch.toLowerCase();
                    return emp.name.toLowerCase().includes(searchLower) || emp.employeeId.toLowerCase().includes(searchLower);
                  })
                  .sort((a, b) => {
                    if (sortByMatricula) {
                      return a.employeeId.localeCompare(b.employeeId);
                    }
                    return a.name.localeCompare(b.name);
                  })
                  .map((emp, idx) => {
                  const dept = departments.find(d => d.id === emp.departmentId);
                  
                  return (
                    <motion.div 
                      key={emp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between bg-slate-50/30 dark:bg-slate-950/30 hover:border-slate-300 dark:border-slate-700 hover:bg-slate-100/30 dark:bg-slate-800/30 transition-all group"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{emp.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Matrícula: <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{emp.employeeId}</span></p>
                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {dept?.name || 'Sem departamento'}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isGuest && (
                          <>
                            <button onClick={() => handleEditEmployee(emp)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

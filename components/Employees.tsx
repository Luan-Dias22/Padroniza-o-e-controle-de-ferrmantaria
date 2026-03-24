import { useState } from 'react';
import { Employee, Department, Assignment, AssemblyLine, Tool, StandardToolList } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, Users, Building2, AlertTriangle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function Employees({
  employees, setEmployees,
  departments, setDepartments,
  assignments, setAssignments,
  lines, tools, standardLists
}: {
  employees: Employee[], setEmployees: (e: Employee[]) => void,
  departments: Department[], setDepartments: (d: Department[]) => void,
  assignments: Assignment[], setAssignments: (a: Assignment[]) => void,
  lines: AssemblyLine[], tools: Tool[], standardLists: StandardToolList[]
}) {
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

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

  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpId.trim() || !newEmpDept) return;
    
    if (editingEmpId) {
      setEmployees(employees.map(emp => emp.id === editingEmpId ? {
        ...emp,
        employeeId: newEmpId.trim(),
        name: newEmpName.trim(),
        departmentId: newEmpDept
      } : emp));
      setEditingEmpId(null);
    } else {
      setEmployees([...employees, {
        id: crypto.randomUUID(),
        employeeId: newEmpId.trim(),
        name: newEmpName.trim(),
        departmentId: newEmpDept
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
      name: newDeptName.trim()
    }]);
    
    setNewDeptName('');
  };

  const handleUpdateDepartment = () => {
    if (!editDeptName.trim() || !editingDeptId) return;
    setDepartments(departments.map(d => d.id === editingDeptId ? { ...d, name: editDeptName.trim() } : d));
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

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      <h1 className="text-2xl font-bold text-slate-800">Colaboradores e Departamentos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departments Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Departamentos</h2>
          </div>
          <div className="p-4 border-b border-slate-100">
            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input 
                type="text" 
                value={newDeptName} 
                onChange={e => setNewDeptName(e.target.value)}
                placeholder="Novo departamento..."
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {departments.length === 0 ? (
              <p className="text-center text-slate-500 p-4 text-sm">Nenhum departamento criado.</p>
            ) : (
              <ul className="space-y-1">
                {departments.map(dept => (
                  <li 
                    key={dept.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent"
                  >
                    {editingDeptId === dept.id ? (
                      <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={editDeptName} 
                          onChange={e => setEditDeptName(e.target.value)}
                          className="flex-1 p-1 border border-slate-300 rounded text-sm"
                        />
                        <button onClick={handleUpdateDepartment} className="text-green-600 p-1"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm text-slate-700">{dept.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingDeptId(dept.id); setEditDeptName(dept.name); }} className="p-1 text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteDepartment(dept.id)} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Employees Management */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{editingEmpId ? 'Editar Colaborador' : 'Colaboradores'}</h2>
          </div>
          <div className="p-4 border-b border-slate-100">
            <form onSubmit={handleSubmitEmployee} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input 
                type="text" 
                value={newEmpId} 
                onChange={e => setNewEmpId(e.target.value)}
                placeholder="Matrícula (ex: EMP-103)"
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input 
                type="text" 
                value={newEmpName} 
                onChange={e => setNewEmpName(e.target.value)}
                placeholder="Nome do colaborador"
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none sm:col-span-2"
              />
              <select
                value={newEmpDept}
                onChange={e => setNewEmpDept(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Departamento --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="sm:col-span-4 flex justify-end gap-2 mt-1">
                {editingEmpId && (
                  <button 
                    type="button" 
                    onClick={cancelEditEmployee}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                )}
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                  {editingEmpId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingEmpId ? 'Atualizar Colaborador' : 'Adicionar Colaborador'}
                </button>
              </div>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {employees.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Nenhum colaborador registrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employees.map(emp => {
                  const dept = departments.find(d => d.id === emp.departmentId);
                  
                  const empAssignments = assignments.filter(a => a.employeeId === emp.id);
                  const missingTools: { lineName: string, toolName: string, missingQty: number }[] = [];
                  
                  empAssignments.forEach(assignment => {
                    const line = lines.find(l => l.id === assignment.lineId);
                    if (!line || !line.standardListId) return;
                    
                    const standardList = standardLists.find(s => s.id === line.standardListId);
                    if (!standardList) return;
                
                    standardList.tools.forEach(stdTool => {
                      const assignedTool = assignment.assignedTools?.find(t => t.toolId === stdTool.toolId);
                      const assignedQty = assignedTool ? assignedTool.quantity : 0;
                      if (assignedQty < stdTool.quantity) {
                        const tool = tools.find(t => t.id === stdTool.toolId);
                        missingTools.push({
                          lineName: line.name,
                          toolName: tool ? tool.name : 'Desconhecida',
                          missingQty: stdTool.quantity - assignedQty
                        });
                      }
                    });
                  });

                  return (
                    <div 
                      key={emp.id}
                      className="p-3 border border-slate-200 rounded-lg flex items-start justify-between bg-slate-50"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-500">Matrícula: {emp.employeeId}</p>
                        <p className="text-xs text-blue-600 mt-1">{dept?.name || 'Sem departamento'}</p>
                        
                        {missingTools.length > 0 && (
                          <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                            <div className="flex items-center gap-1 font-semibold mb-1">
                              <AlertTriangle className="w-3 h-3" />
                              Faltam ferramentas (Lista Padrão):
                            </div>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {missingTools.map((mt, idx) => (
                                <li key={idx}>
                                  {mt.toolName} (Falta: {mt.missingQty}) - {mt.lineName}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleEditEmployee(emp)} className="p-1 text-slate-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

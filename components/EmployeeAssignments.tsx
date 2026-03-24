import { useState } from 'react';
import { Employee, Assignment, Department, Tool, StandardToolList } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function EmployeeAssignments({
  employees, setEmployees, departments, tools, standardLists, assignments, setAssignments
}: {
  employees: Employee[], setEmployees: (e: Employee[]) => void,
  departments: Department[], tools: Tool[], standardLists: StandardToolList[],
  assignments: Assignment[], setAssignments: (a: Assignment[]) => void
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  
  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customTools, setCustomTools] = useState<{ toolId: string, quantity: number }[]>([]);

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

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setCustomTools([]);
      return;
    }
    const emp = employees.find(e => e.id === empId);
    const dept = departments.find(d => d.id === emp?.departmentId);
    const standardList = standardLists.find(s => s.id === dept?.standardListId);
    setCustomTools(standardList ? [...standardList.tools] : []);
  };

  const toggleCustomTool = (toolId: string) => {
    if (customTools.some(t => t.toolId === toolId)) {
      setCustomTools(customTools.filter(t => t.toolId !== toolId));
    } else {
      setCustomTools([...customTools, { toolId, quantity: 1 }]);
    }
  };

  const updateCustomToolQuantity = (toolId: string, quantity: number) => {
    if (quantity < 1) quantity = 1;
    setCustomTools(customTools.map(t => t.toolId === toolId ? { ...t, quantity } : t));
  };

  const handleSaveAssignment = () => {
    if (!selectedEmployeeId) return;
    
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (!emp) return;

    if (editingAssignmentId) {
      setAssignments(assignments.map(a => a.id === editingAssignmentId ? {
        ...a, employeeId: selectedEmployeeId, departmentId: emp.departmentId, assignedTools: customTools
      } : a));
    } else {
      setAssignments([...assignments, {
        id: crypto.randomUUID(),
        employeeId: selectedEmployeeId,
        departmentId: emp.departmentId,
        assignedTools: customTools,
        dateAssigned: new Date().toISOString()
      }]);
    }
    
    setIsAssigning(false);
    setEditingAssignmentId(null);
    setSelectedEmployeeId('');
    setCustomTools([]);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setIsAssigning(true);
    setEditingAssignmentId(assignment.id);
    setSelectedEmployeeId(assignment.employeeId);
    setCustomTools([...(assignment.assignedTools || [])]);
  };

  const handleDeleteAssignment = (id: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Atribuição',
      message: 'Excluir esta atribuição?',
      onConfirm: () => {
        setAssignments(assignments.filter(a => a.id !== id));
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Atribuições de Funcionários</h1>
        {!isAssigning && (
          <button 
            onClick={() => { setIsAssigning(true); setEditingAssignmentId(null); setSelectedEmployeeId(''); setCustomTools([]); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Atribuição
          </button>
        )}
      </div>

      {isAssigning && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-lg font-bold text-slate-800">{editingAssignmentId ? 'Editar Atribuição' : 'Criar Atribuição'}</h2>
            <button onClick={() => setIsAssigning(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selecionar Funcionário</label>
                <select 
                  value={selectedEmployeeId}
                  onChange={e => handleEmployeeSelect(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Selecionar Funcionário --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
                {selectedEmployeeId && (
                  <p className="text-xs text-slate-500 mt-1">
                    As ferramentas padrão para o departamento deste funcionário foram carregadas. Você pode modificá-las abaixo.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ferramentas Atribuídas ({customTools.length})</label>
              <div className="border border-slate-200 rounded-lg p-3 h-64 overflow-y-auto bg-slate-50">
                {!selectedEmployeeId ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center">
                    Selecione um funcionário primeiro para carregar as ferramentas padrão.
                  </div>
                ) : tools.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Nenhuma ferramenta disponível.</div>
                ) : (
                  <div className="space-y-2">
                    {tools.map(tool => {
                      const isSelected = customTools.some(t => t.toolId === tool.id);
                      const emp = employees.find(e => e.id === selectedEmployeeId);
                      const dept = departments.find(d => d.id === emp?.departmentId);
                      const isStandard = standardLists.find(s => s.id === dept?.standardListId)?.tools?.some(t => t.toolId === tool.id);
                      
                      return (
                        <div 
                          key={tool.id}
                          className={`p-2 border rounded flex items-center gap-3 bg-white transition-colors ${
                            isSelected ? 'border-blue-400' : 'border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div 
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                            }`}
                            onClick={() => toggleCustomTool(tool.id)}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleCustomTool(tool.id)}>
                            <p className="text-sm font-medium text-slate-800 truncate">{tool.name}</p>
                            <p className="text-xs text-slate-500 truncate">{tool.brand}</p>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-600">Qtd:</label>
                              <input 
                                type="number" 
                                min="1"
                                value={customTools.find(t => t.toolId === tool.id)?.quantity || 1}
                                onChange={(e) => updateCustomToolQuantity(tool.id, parseInt(e.target.value) || 1)}
                                className="w-14 p-1 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                          {isStandard && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Padrão</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <button 
              onClick={() => setIsAssigning(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveAssignment}
              disabled={!selectedEmployeeId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Atribuição
            </button>
          </div>
        </div>
      )}

      {!isAssigning && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Atribuições Atuais</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-medium">Funcionário</th>
                  <th className="p-4 font-medium">Departamento</th>
                  <th className="p-4 font-medium">Ferramentas Atribuídas</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma atribuição encontrada.</td>
                  </tr>
                ) : (
                  assignments.map(assignment => {
                    const emp = employees.find(e => e.id === assignment.employeeId);
                    const dept = departments.find(d => d.id === assignment.departmentId);
                    const date = new Date(assignment.dateAssigned).toLocaleDateString();
                    
                    const missingTools: { toolName: string, missingQty: number }[] = [];
                    if (dept && dept.standardListId) {
                      const standardList = standardLists.find(s => s.id === dept.standardListId);
                      if (standardList) {
                        standardList.tools.forEach(stdTool => {
                          const assignedTool = assignment.assignedTools?.find(t => t.toolId === stdTool.toolId);
                          const assignedQty = assignedTool ? assignedTool.quantity : 0;
                          if (assignedQty < stdTool.quantity) {
                            const tool = tools.find(t => t.id === stdTool.toolId);
                            missingTools.push({
                              toolName: tool ? tool.name : 'Desconhecida',
                              missingQty: stdTool.quantity - assignedQty
                            });
                          }
                        });
                      }
                    }
                    
                    return (
                      <tr key={assignment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-slate-800">{emp?.name || 'Desconhecido'}</p>
                          <p className="text-xs text-slate-500">{emp?.employeeId}</p>
                        </td>
                        <td className="p-4 text-slate-600">{dept?.name || 'Desconhecido'}</td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                              {(assignment.assignedTools || []).reduce((acc, t) => acc + t.quantity, 0)} itens ({(assignment.assignedTools || []).length} tipos)
                            </span>
                            {missingTools.length > 0 && (
                              <div className="text-xs text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-200">
                                <div className="flex items-center gap-1 font-semibold mb-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Faltam ferramentas:
                                </div>
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {missingTools.map((mt, idx) => (
                                    <li key={idx}>
                                      {mt.toolName} (Falta: {mt.missingQty})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 text-sm">{date}</td>
                        <td className="p-4 flex justify-end gap-2">
                          <button onClick={() => handleEditAssignment(assignment)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

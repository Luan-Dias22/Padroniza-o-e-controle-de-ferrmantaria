'use client';

import { useState } from 'react';
import { Department, Tool, CollectiveAssignment } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, X, Package, Search, Filter } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface CollectiveToolsProps {
  departments: Department[];
  tools: Tool[];
  collectiveAssignments: CollectiveAssignment[];
  setCollectiveAssignments: (assignments: CollectiveAssignment[]) => void;
}

export default function CollectiveTools({
  departments,
  tools,
  collectiveAssignments,
  setCollectiveAssignments
}: CollectiveToolsProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedTools, setSelectedTools] = useState<{ toolId: string, quantity: number }[]>([]);
  const [toolSearch, setToolSearch] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null
  });

  const handleAddTool = (toolId: string) => {
    if (selectedTools.find(t => t.toolId === toolId)) return;
    setSelectedTools([...selectedTools, { toolId, quantity: 1 }]);
  };

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter(t => t.toolId !== toolId));
  };

  const handleUpdateQuantity = (toolId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedTools(selectedTools.map(t => t.toolId === toolId ? { ...t, quantity } : t));
  };

  const handleSave = () => {
    if (!selectedDeptId || selectedTools.length === 0) return;

    if (editingId) {
      setCollectiveAssignments((collectiveAssignments || []).map(a => 
        a.id === editingId ? { ...a, departmentId: selectedDeptId, assignedTools: selectedTools } : a
      ));
    } else {
      const newAssignment: CollectiveAssignment = {
        id: crypto.randomUUID(),
        departmentId: selectedDeptId,
        assignedTools: selectedTools,
        dateAssigned: new Date().toISOString()
      };
      setCollectiveAssignments([...(collectiveAssignments || []), newAssignment]);
    }

    resetForm();
  };

  const resetForm = () => {
    setIsAssigning(false);
    setEditingId(null);
    setSelectedDeptId('');
    setSelectedTools([]);
    setToolSearch('');
  };

  const handleEdit = (assignment: CollectiveAssignment) => {
    setIsAssigning(true);
    setEditingId(assignment.id);
    setSelectedDeptId(assignment.departmentId);
    setSelectedTools([...assignment.assignedTools]);
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = () => {
    if (deleteModal.id) {
      setCollectiveAssignments((collectiveAssignments || []).filter(a => a.id !== deleteModal.id));
    }
    setDeleteModal({ isOpen: false, id: null });
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(toolSearch.toLowerCase()) || 
    t.brand.toLowerCase().includes(toolSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title="Excluir Atribuição Coletiva"
        message="Tem certeza que deseja remover esta atribuição de ferramentas da linha?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Uso Coletivo por Linha
        </h1>
        {!isAssigning && (
          <button 
            onClick={() => setIsAssigning(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Nova Atribuição
          </button>
        )}
      </div>

      {isAssigning && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {editingId ? 'Editar Atribuição Coletiva' : 'Nova Atribuição Coletiva'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Linha de Montagem / Departamento</label>
                <select 
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma linha...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Buscar Ferramentas</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Nome ou marca..."
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                  {filteredTools.map(tool => (
                    <div key={tool.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{tool.name}</p>
                        <p className="text-xs text-slate-500">{tool.brand} • {tool.category}</p>
                      </div>
                      <button 
                        onClick={() => handleAddTool(tool.id)}
                        disabled={selectedTools.some(t => t.toolId === tool.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Ferramentas Selecionadas</h3>
              <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] border border-dashed border-slate-300">
                {selectedTools.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm mt-10">Nenhuma ferramenta selecionada.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTools.map(st => {
                      const tool = tools.find(t => t.id === st.toolId);
                      return (
                        <div key={st.toolId} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{tool?.name}</p>
                            <p className="text-xs text-slate-500">{tool?.brand}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Qtd:</label>
                              <input 
                                type="number"
                                min="1"
                                value={st.quantity}
                                onChange={(e) => handleUpdateQuantity(st.toolId, parseInt(e.target.value) || 1)}
                                className="w-16 p-1 border border-slate-300 rounded text-sm text-center outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <button 
                              onClick={() => handleRemoveTool(st.toolId)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
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

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={resetForm}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={!selectedDeptId || selectedTools.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {editingId ? 'Atualizar Atribuição' : 'Salvar Atribuição'}
            </button>
          </div>
        </div>
      )}

      {!isAssigning && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Atribuições Atuais por Linha</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Linha / Departamento</th>
                  <th className="p-4 font-semibold">Ferramentas</th>
                  <th className="p-4 font-semibold">Data Atribuição</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!collectiveAssignments || collectiveAssignments.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhuma atribuição coletiva realizada.</td>
                  </tr>
                ) : (
                  collectiveAssignments.map(assignment => {
                    const dept = departments.find(d => d.id === assignment.departmentId);
                    return (
                      <tr key={assignment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">{dept?.name || 'Desconhecido'}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {assignment.assignedTools.map(at => {
                              const tool = tools.find(t => t.id === at.toolId);
                              return (
                                <span key={at.toolId} className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100">
                                  {tool?.name} ({at.quantity})
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {new Date(assignment.dateAssigned).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(assignment)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(assignment.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

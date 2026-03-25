import { useState } from 'react';
import { Tool, StandardToolList, Assignment } from '@/lib/data';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function ToolRegistration({ 
  tools, setTools,
  standardLists, setStandardLists,
  assignments, setAssignments
}: { 
  tools: Tool[], setTools: (tools: Tool[]) => void,
  standardLists: StandardToolList[], setStandardLists: (lists: StandardToolList[]) => void,
  assignments: Assignment[], setAssignments: (assignments: Assignment[]) => void
}) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ brand: '', name: '', category: 'ferramenta manual', description: '' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.brand || !formData.name) {
      setError('Marca e Nome são obrigatórios.');
      return;
    }

    if (isEditing) {
      setTools(tools.map(t => t.id === isEditing ? { ...t, ...formData } : t));
      setIsEditing(null);
    } else {
      setTools([...tools, { id: crypto.randomUUID(), ...formData }]);
    }
    setFormData({ brand: '', name: '', category: 'ferramenta manual', description: '' });
  };

  const handleEdit = (tool: Tool) => {
    setIsEditing(tool.id);
    setFormData({ brand: tool.brand, name: tool.name, category: tool.category, description: tool.description });
  };

  const handleDelete = (id: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Ferramenta',
      message: 'Tem certeza que deseja excluir esta ferramenta? Ela será removida de todos os kits e atribuições.',
      onConfirm: () => {
        setTools(tools.filter(t => t.id !== id));
        
        // Cascade delete from standard lists
        setStandardLists(standardLists.map(list => ({
          ...list,
          tools: (list.tools || []).filter(t => t.toolId !== id)
        })));

        // Cascade delete from assignments
        setAssignments(assignments.map(assignment => ({
          ...assignment,
          assignedTools: (assignment.assignedTools || []).filter(t => t.toolId !== id)
        })));
      }
    });
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      <h1 className="text-2xl font-bold text-slate-800">Registro de Ferramentas</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{isEditing ? 'Editar Ferramenta' : 'Adicionar Nova Ferramenta'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Marca da Ferramenta *</label>
            <input 
              type="text" 
              value={formData.brand} 
              onChange={e => setFormData({...formData, brand: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="ex: Bosch, Makita"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="ex: Furadeira Elétrica"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ferramenta manual">Ferramenta Manual</option>
              <option value="ferramenta elétrica">Ferramenta Elétrica</option>
              <option value="ferramenta pneumática">Ferramenta Pneumática</option>
              <option value="medição">Medição</option>
              <option value="segurança">Segurança</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input 
              type="text" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Descrição opcional"
            />
          </div>
          
          {error && <div className="md:col-span-2 text-red-500 text-sm">{error}</div>}
          
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            {isEditing && (
              <button 
                type="button" 
                onClick={() => { setIsEditing(null); setFormData({ brand: '', name: '', category: 'ferramenta manual', description: '' }); setError(''); }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEditing ? 'Atualizar Ferramenta' : 'Adicionar Ferramenta'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Ferramentas Registradas</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar ferramentas..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-medium">Marca</th>
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma ferramenta encontrada.</td>
                </tr>
              ) : (
                filteredTools.map(tool => (
                  <tr key={tool.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{tool.brand}</td>
                    <td className="p-4 text-slate-600">{tool.name}</td>
                    <td className="p-4 text-slate-600 capitalize">{tool.category}</td>
                    <td className="p-4 text-slate-600">{tool.description}</td>
                    <td className="p-4 flex justify-end gap-2">
                      <button onClick={() => handleEdit(tool)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tool.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

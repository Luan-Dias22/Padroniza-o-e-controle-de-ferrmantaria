import { useState } from 'react';
import { Tool, StandardToolList, Assignment } from '@/lib/data';
import { Plus, Edit2, Trash2, Search, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmModal from './ConfirmModal';

export default function ToolRegistration({ 
  tools, setTools,
  standardLists, setStandardLists,
  assignments, setAssignments,
  isGuest = false,
  currentUser
}: { 
  tools: Tool[], setTools: (tools: Tool[]) => void,
  standardLists: StandardToolList[], setStandardLists: (lists: StandardToolList[]) => void,
  assignments: Assignment[], setAssignments: (assignments: Assignment[]) => void,
  isGuest?: boolean,
  currentUser: any
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
      setTools(tools.map(t => t.id === isEditing ? { ...t, ...formData, uid: currentUser?.uid || 'guest' } : t));
      setIsEditing(null);
    } else {
      setTools([...tools, { id: crypto.randomUUID(), ...formData, uid: currentUser?.uid || 'guest' }]);
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
  ).sort((a, b) => a.name.localeCompare(b.name));

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
        <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Wrench className="w-5 h-5 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Registro de Ferramentas</h1>
      </div>

      {!isGuest && (
        <motion.div variants={itemVariants} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 to-blue-500/50" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            {isEditing ? <Edit2 className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-cyan-400" />}
            {isEditing ? 'Editar Ferramenta' : 'Adicionar Nova Ferramenta'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Marca da Ferramenta *</label>
              <input 
                type="text" 
                value={formData.brand} 
                onChange={e => setFormData({...formData, brand: e.target.value})}
                className="w-full p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                placeholder="ex: Bosch, Makita"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Nome *</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                placeholder="ex: Furadeira Elétrica"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Categoria</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all appearance-none"
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
              <label className="block text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Descrição</label>
              <input 
                type="text" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                placeholder="Descrição opcional"
              />
            </div>
            
            {error && <div className="md:col-span-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>}
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              {isEditing && (
                <button 
                  type="button" 
                  onClick={() => { setIsEditing(null); setFormData({ brand: '', name: '', category: 'ferramenta manual', description: '' }); setError(''); }}
                  className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-900 dark:text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isEditing ? 'Atualizar Ferramenta' : 'Adicionar Ferramenta'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 dark:bg-slate-900/80">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Catálogo de Ferramentas</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar ferramentas..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-mono border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 font-medium">Marca</th>
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-sm">Nenhuma ferramenta encontrada.</td>
                </tr>
              ) : (
                filteredTools.map((tool, idx) => (
                  <motion.tr 
                    key={tool.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-100/30 dark:bg-slate-800/30 transition-colors group"
                  >
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{tool.brand}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{tool.name}</td>
                    <td className="p-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 capitalize">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs border border-slate-300 dark:border-slate-700">{tool.category}</span>
                    </td>
                    <td className="p-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 truncate max-w-xs">{tool.description || '-'}</td>
                    <td className="p-4 flex justify-end gap-2">
                      {!isGuest && (
                        <>
                          <button onClick={() => handleEdit(tool)} className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tool.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

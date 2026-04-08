import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Settings as SettingsIcon, Upload, Image as ImageIcon, Trash2, CloudUpload, CheckCircle2, AlertCircle, Zap, Bug } from 'lucide-react';
import { getLogoBase64, setLogoBase64 } from '@/lib/pdfUtils';
import { motion, AnimatePresence } from 'motion/react';
import firebaseConfig from '@/firebase-applet-config.json';

export default function Settings({ onSync, onRestoreTemplate }: { 
  onSync?: () => Promise<boolean>,
  onRestoreTemplate?: () => void 
}) {
  const [showDebug, setShowDebug] = useState(false);
  const [logo, setLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return getLogoBase64();
    }
    return null;
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    if (!onSync) return;
    setSyncStatus('loading');
    const success = await onSync();
    setSyncStatus(success ? 'success' : 'error');
    
    if (success) {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogo(base64String);
        setLogoBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('companyLogo');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-2rem)]"
    >
      <div className="p-6 border-b border-slate-800/50 bg-slate-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            Configurações
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie as configurações gerais do sistema, como a logo da empresa para os relatórios.
          </p>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        <div className="max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 shadow-inner"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-cyan-400" />
              Logo da Empresa
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Esta logo será exibida no cabeçalho dos relatórios em PDF e nos Termos de Responsabilidade.
              Recomendamos uma imagem com fundo transparente (PNG) para melhor visualização.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-48 h-32 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/50 relative overflow-hidden group transition-colors hover:border-cyan-500/50">
                {logo ? (
                  <>
                    <Image src={logo} alt="Logo da Empresa" width={192} height={128} className="max-w-full max-h-full object-contain p-2" unoptimized />
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button
                        onClick={handleRemoveLogo}
                        className="p-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        title="Remover logo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Sem logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl cursor-pointer transition-all font-medium shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Upload className="w-5 h-5" />
                  <span>Escolher Imagem</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="text-xs text-slate-500 mt-3 text-center sm:text-left">
                  Formatos suportados: PNG, JPG, SVG. Tamanho máximo recomendado: 2MB.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 shadow-inner mt-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-cyan-400" />
              Sincronização de Dados
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Se você estiver vendo dados no aplicativo que ainda não aparecem no seu banco de dados na nuvem, use este botão para forçar uma sincronização manual.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleSync}
                disabled={syncStatus === 'loading'}
                className={`
                  flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all shadow-lg w-full sm:w-auto justify-center
                  ${syncStatus === 'loading' ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 
                    syncStatus === 'success' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
                    syncStatus === 'error' ? 'bg-red-600/20 text-red-400 border border-red-500/30' :
                    'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'}
                `}
              >
                {syncStatus === 'loading' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Sincronizando...
                  </>
                ) : syncStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Dados Salvos na Nuvem!
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Erro ao Sincronizar
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-5 h-5" />
                    Sincronizar Dados Atuais com a Nuvem
                  </>
                )}
              </button>
              
              <AnimatePresence>
                {syncStatus === 'success' && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-emerald-400 text-xs font-medium"
                  >
                    Todos os dados foram gravados com sucesso na sua conta luansold@gmail.com.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 shadow-inner mt-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Recuperação de Emergência
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Se o seu aplicativo estiver totalmente vazio após o login, use este botão para recarregar os dados de exemplo (template). Depois de carregar, não esqueça de clicar em &quot;Sincronizar&quot; acima para salvá-los na sua conta.
            </p>

            <button
              onClick={onRestoreTemplate}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              Restaurar Dados do Template (Exemplo)
            </button>
          </motion.div>

          <div className="mt-12 pt-6 border-t border-slate-800/50">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="text-slate-600 hover:text-slate-400 text-xs flex items-center gap-2 transition-colors"
            >
              <Bug className="w-3 h-3" />
              {showDebug ? 'Ocultar Informações de Diagnóstico' : 'Mostrar Informações de Diagnóstico'}
            </button>
            
            <AnimatePresence>
              {showDebug && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-black/40 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-500 overflow-hidden"
                >
                  <p className="mb-2 text-cyan-500/70 uppercase tracking-widest font-bold">Configuração Ativa:</p>
                  <pre>{JSON.stringify(firebaseConfig, null, 2)}</pre>
                  <p className="mt-4 mb-2 text-cyan-500/70 uppercase tracking-widest font-bold">Ambiente:</p>
                  <p>URL: {typeof window !== 'undefined' ? window.location.origin : 'Server-side'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

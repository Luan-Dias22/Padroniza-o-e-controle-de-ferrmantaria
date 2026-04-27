import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Settings as SettingsIcon, Upload, Image as ImageIcon, Trash2, CloudUpload, CheckCircle2, AlertCircle, Zap, Bug, Users, Download, FileUp, Database } from 'lucide-react';
import { getLogoBase64, setLogoBase64 } from '@/lib/pdfUtils';
import { motion, AnimatePresence } from 'motion/react';
import firebaseConfig from '@/firebase-applet-config.json';

export default function Settings({ onSync, onSyncToGuest, onGetBackup, onRestoreBackup, isGuest = false }: { 
  onSync?: () => Promise<boolean>,
  onSyncToGuest?: () => Promise<boolean>,
  onGetBackup?: () => any,
  onRestoreBackup?: (data: any) => boolean,
  isGuest?: boolean
}) {
  const [showDebug, setShowDebug] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return getLogoBase64();
    }
    return null;
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [guestSyncStatus, setGuestSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    if (!onSync) return;
    setSyncStatus('loading');
    const success = await onSync();
    setSyncStatus(success ? 'success' : 'error');
    
    if (success) {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleSyncToGuest = async () => {
    if (!onSyncToGuest) return;
    setGuestSyncStatus('loading');
    const success = await onSyncToGuest();
    setGuestSyncStatus(success ? 'success' : 'error');
    
    if (success) {
      setTimeout(() => setGuestSyncStatus('idle'), 3000);
    }
  };

  const handleDownloadBackup = () => {
    if (!onGetBackup) return;
    try {
      const data = onGetBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-ferramentaria-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 3000);
    } catch (error) {
      console.error("Backup error:", error);
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 3000);
    }
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRestoreBackup) return;

    setRestoreStatus('loading');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = onRestoreBackup(json);
        setRestoreStatus(success ? 'success' : 'error');
        if (success) {
          setTimeout(() => setRestoreStatus('idle'), 3000);
        }
      } catch (error) {
        console.error("Restore error:", error);
        setRestoreStatus('error');
        setTimeout(() => setRestoreStatus('idle'), 3000);
      }
    };
    reader.onerror = () => {
      setRestoreStatus('error');
      setTimeout(() => setRestoreStatus('idle'), 3000);
    };
    reader.readAsText(file);
    
    // Reset input
    if (e.target) e.target.value = '';
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
      className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/105 overflow-hidden flex flex-col h-[calc(100vh-2rem)]"
    >
      <div className="p-6 border-b border-white/5/50 bg-zinc-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-white flex items-center gap-2 tracking-tight">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            Configurações
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
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
            className="bg-zinc-900/30 border border-white/105/50 rounded-xl p-6 shadow-inner"
          >
            <h2 className="text-lg font-semibold font-sans tracking-tight text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-cyan-400" />
              Logo da Empresa
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Esta logo será exibida no cabeçalho dos relatórios em PDF e nos Termos de Responsabilidade.
              Recomendamos uma imagem com fundo transparente (PNG) para melhor visualização.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-48 h-32 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center bg-zinc-900/50 relative overflow-hidden group transition-colors hover:border-cyan-500/50">
                {logo ? (
                  <>
                    <Image src={logo} alt="Logo da Empresa" width={192} height={128} className="max-w-full max-h-full object-contain p-2" unoptimized />
                    <div className="absolute inset-0 bg-transparent/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button
                        onClick={handleRemoveLogo}
                        className="p-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 hover:text-red-300 transition-all shadow-sm"
                        title="Remover logo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-500 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Sem logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                {!isGuest ? (
                  <>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl cursor-pointer transition-all font-medium shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                      <Upload className="w-5 h-5" />
                      <span>Escolher Imagem</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    <p className="text-xs text-zinc-500 mt-3 text-center sm:text-left">
                      Formatos suportados: PNG, JPG, SVG. Tamanho máximo recomendado: 2MB.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500 italic">
                    A alteração da logo está desabilitada no modo convidado.
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/30 border border-white/105/50 rounded-xl p-6 shadow-inner mt-6"
          >
            <h2 className="text-lg font-semibold font-sans tracking-tight text-white mb-4 flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-cyan-400" />
              Sincronização de Dados
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Gerencie como seus dados são salvos na nuvem e o que os convidados podem ver.
            </p>

            <div className="space-y-6">
              <div>
                <p className="text-zinc-300 text-sm font-medium mb-3">Sua Conta Particular</p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {!isGuest ? (
                    <button
                      onClick={handleSync}
                      disabled={syncStatus === 'loading'}
                      className={`
                        flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all shadow-lg w-full sm:w-auto justify-center
                        ${syncStatus === 'loading' ? 'bg-slate-700 text-zinc-400 cursor-not-allowed' : 
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
                          Dados Salvos!
                        </>
                      ) : syncStatus === 'error' ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Erro ao Sincronizar
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-5 h-5" />
                          Salvar na Minha Conta
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">
                      A sincronização está desabilitada no modo convidado.
                    </p>
                  )}
                  
                  <AnimatePresence>
                    {syncStatus === 'success' && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-emerald-400 text-xs font-medium"
                      >
                        Dados gravados com sucesso na sua conta particular.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {!isGuest && (
                <div className="pt-6 border-t border-white/5/30">
                  <p className="text-zinc-300 text-sm font-medium mb-1 text-cyan-400">Acesso para Convidados</p>
                  <p className="text-zinc-500 text-xs mb-4">
                    Use este botão para tornar seus dados atuais visíveis para qualquer pessoa que entrar como &quot;Convidado&quot;.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                      onClick={handleSyncToGuest}
                      disabled={guestSyncStatus === 'loading'}
                      className={`
                        flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all shadow-lg w-full sm:w-auto justify-center
                        ${guestSyncStatus === 'loading' ? 'bg-slate-700 text-zinc-400 cursor-not-allowed' : 
                          guestSyncStatus === 'success' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' :
                          guestSyncStatus === 'error' ? 'bg-red-600/20 text-red-400 border border-red-500/30' :
                          'bg-zinc-900 hover:bg-slate-700 text-zinc-200 border border-white/105'}
                      `}
                    >
                      {guestSyncStatus === 'loading' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          Publicando...
                        </>
                      ) : guestSyncStatus === 'success' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Publicado para Convidados!
                        </>
                      ) : guestSyncStatus === 'error' ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Erro ao Publicar
                        </>
                      ) : (
                        <>
                          <Users className="w-5 h-5" />
                          Publicar para Visualização de Convidados
                        </>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {guestSyncStatus === 'success' && (
                        <motion.p 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-cyan-400 text-xs font-medium"
                        >
                          Agora os convidados verão estes dados ao acessar o sistema.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-900/30 border border-white/105/50 rounded-xl p-6 shadow-inner mt-6"
          >
            <h2 className="text-lg font-semibold font-sans tracking-tight text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              Backup e Restauração
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Exporte todos os seus dados para um arquivo de segurança ou restaure um backup anterior. 
              Isso inclui ferramentas, funcionários, atribuições e histórico de estoque.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {!isGuest ? (
                <>
                  <button
                    onClick={handleDownloadBackup}
                    className="flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-slate-700 text-zinc-200 border border-white/105 rounded-xl transition-all text-sm font-medium w-full sm:w-auto justify-center"
                  >
                    <Download className="w-4 h-4" />
                    Gerar Arquivo de Backup
                  </button>

                  <div className="relative w-full sm:w-auto">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadBackup}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={restoreStatus === 'loading'}
                      className={`
                        flex items-center gap-2 px-5 py-3 rounded-xl transition-all text-sm font-medium w-full sm:w-auto justify-center
                        ${restoreStatus === 'loading' ? 'bg-slate-700 text-zinc-400 cursor-not-allowed' : 
                          restoreStatus === 'success' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
                          restoreStatus === 'error' ? 'bg-red-600/20 text-red-400 border border-red-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'}
                      `}
                    >
                      {restoreStatus === 'loading' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          Restaurando...
                        </>
                      ) : restoreStatus === 'success' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Backup Restaurado!
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4" />
                          Recuperar Backup (Upload)
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500 italic">
                  As opções de backup estão desabilitadas no modo convidado.
                </p>
              )}
            </div>
            
            <AnimatePresence>
              {backupStatus === 'success' && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-emerald-400 text-xs mt-3 font-medium"
                >
                  Backup gerado e baixado com sucesso!
                </motion.p>
              )}
              {restoreStatus === 'success' && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-emerald-400 text-xs mt-3 font-medium"
                >
                  Os dados foram carregados no aplicativo. Clique em &quot;Salvar na Minha Conta&quot; acima para persistir na nuvem.
                </motion.p>
              )}
              {restoreStatus === 'error' && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs mt-3 font-medium"
                >
                  Erro ao ler o arquivo de backup. Verifique se o formato está correto.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="mt-12 pt-6 border-t border-white/5/50">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="text-slate-600 hover:text-zinc-400 text-xs flex items-center gap-2 transition-colors"
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
                  className="mt-4 p-4 bg-black/40 rounded-lg border border-white/105 font-mono text-[10px] text-zinc-500 overflow-hidden"
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

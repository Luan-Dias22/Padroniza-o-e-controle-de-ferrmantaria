import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { getLogoBase64, setLogoBase64 } from '@/lib/pdfUtils';

export default function Settings() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    setLogo(getLogoBase64());
  }, []);

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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            Configurações
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie as configurações gerais do sistema, como a logo da empresa para os relatórios.
          </p>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <div className="max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-500" />
              Logo da Empresa
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              Esta logo será exibida no cabeçalho dos relatórios em PDF e nos Termos de Responsabilidade.
              Recomendamos uma imagem com fundo transparente (PNG) para melhor visualização.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-48 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                {logo ? (
                  <>
                    <img src={logo} alt="Logo da Empresa" className="max-w-full max-h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={handleRemoveLogo}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Remover logo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Sem logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl cursor-pointer transition-colors font-medium">
                  <Upload className="w-5 h-5" />
                  <span>Escolher Imagem</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="text-xs text-slate-500 mt-2 text-center sm:text-left">
                  Formatos suportados: PNG, JPG, SVG. Tamanho máximo recomendado: 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

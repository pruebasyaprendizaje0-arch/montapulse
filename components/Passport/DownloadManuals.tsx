import React from 'react';
import { Download, FileText, Shield, User as UserIcon } from 'lucide-react';

interface DownloadManualsProps {
  isAdmin?: boolean;
}

export const DownloadManuals: React.FC<DownloadManualsProps> = ({ isAdmin }) => {
  const handleDownload = (fileName: string) => {
    const link = document.createElement('a');
    link.href = `/docs/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      <button
        onClick={() => handleDownload('Manual_Usuario.md')}
        className="flex items-center justify-between p-5 bg-[#111111] border border-white/5 rounded-3xl hover:bg-white/5 hover:border-orange-500/30 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Manual de Usuario</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Guía para Clientes</p>
          </div>
        </div>
        <div className="p-2 bg-white/5 rounded-xl border border-white/5 group-hover:bg-orange-500 group-hover:text-white transition-colors">
          <Download className="w-4 h-4" />
        </div>
      </button>

      {isAdmin && (
        <button
          onClick={() => handleDownload('Manual_Funciones.md')}
          className="flex items-center justify-between p-5 bg-[#111111] border border-white/5 rounded-3xl hover:bg-white/5 hover:border-sky-500/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Manual Técnico</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Funciones Internas</p>
            </div>
          </div>
          <div className="p-2 bg-white/5 rounded-xl border border-white/5 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <Download className="w-4 h-4" />
          </div>
        </button>
      )}
    </div>
  );
};

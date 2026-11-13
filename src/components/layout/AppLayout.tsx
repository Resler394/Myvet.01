import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useClinicData } from '../../context/DataContext';

export const AppLayout: React.FC = () => {
  const { error, refreshAll, loading } = useClinicData();

  return (
    <div className="min-h-screen bg-[#F8F8F1] flex text-[#1B2F1C]">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-[#F8F8F1] pt-14 lg:pt-0">
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => refreshAll()}
              disabled={loading}
              className="px-3 py-1 bg-white border border-[#FECDD3] rounded-lg text-xs font-bold hover:bg-red-50 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Réessayer</span>
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};

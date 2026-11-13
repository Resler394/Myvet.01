import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle2, Printer, Calendar, AlertTriangle, History } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { api, ApiError } from '../services/apiClient';
import { useClinicData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDzd } from '../../shared/utils/money';
import type { CashClosingSummary } from '../types';

export const CashClosingPage: React.FC = () => {
  const { refreshAll } = useClinicData();
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState('2026-08-14');
  const [summary, setSummary] = useState<CashClosingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close day modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('0');
  const [countedCb, setCountedCb] = useState('0');
  const [countedCheck, setCountedCheck] = useState('0');
  const [closingNotes, setClosingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSummary = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CashClosingSummary>(`/api/cash-closings?date=${encodeURIComponent(date)}`);
      setSummary(data);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement de la caisse.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary(selectedDate);
  }, [selectedDate, loadSummary]);

  const openCloseModal = () => {
    if (summary) {
      setCountedCash(String(summary.cashDzd));
      setCountedCb(String(summary.cbDzd));
      setCountedCheck(String(summary.checkTransferDzd));
    }
    setClosingNotes('');
    setIsCloseModalOpen(true);
  };

  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<CashClosingSummary>('/api/cash-closings', {
        closingDate: selectedDate,
        countedCashDzd: parseFloat(countedCash) || 0,
        countedCbDzd: parseFloat(countedCb) || 0,
        countedCheckTransferDzd: parseFloat(countedCheck) || 0,
        notes: closingNotes,
      });
      setSummary(res);
      setIsCloseModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Impossible de clôturer la caisse.');
    } finally {
      setSubmitting(false);
    }
  };

  const expectedCountedTotal =
    (parseFloat(countedCash) || 0) + (parseFloat(countedCb) || 0) + (parseFloat(countedCheck) || 0);
  const previewVariance = summary ? expectedCountedTotal - summary.expectedDzd : 0;

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Clôture de caisse (DZD)
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Rapport financier journalier et réconciliation des encaissements en Dinars Algériens
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#C7D2BA] rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-[#52604C]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[13px] font-semibold text-[#1B2F1C] bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-[#C7D2BA] text-[#1B2F1C] text-[13px] font-semibold rounded-xl hover:bg-[#F8F8F1] transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#52604C]" />
            <span>Imprimer le journal</span>
          </button>

          <button
            onClick={openCloseModal}
            disabled={!summary || summary.isClosed}
            className={`px-5 py-2 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center gap-1.5 shadow-xs ${
              summary?.isClosed
                ? 'bg-[#E7ECD9] text-[#3A683D] border border-[#C7D2BA] cursor-default'
                : 'bg-[#3A683D] hover:bg-[#2F5933] text-white cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{summary?.isClosed ? 'Journée clôturée' : 'Clôturer la journée'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Carte Bancaire"
          value={loading ? '—' : formatDzd(summary?.cbDzd || 0)}
        />
        <StatCard
          title="Total Espèces"
          value={loading ? '—' : formatDzd(summary?.cashDzd || 0)}
        />
        <StatCard
          title="Chèques / Virements"
          value={loading ? '—' : formatDzd(summary?.checkTransferDzd || 0)}
        />
        <StatCard
          title="Total du jour"
          value={loading ? '—' : formatDzd(summary?.totalDzd || 0)}
          valueColor="text-[#3A683D]"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7ECD9] pb-4">
          <div>
            <h3 className="text-[17px] font-bold text-[#1B2F1C]">
              Journal des encaissements — {selectedDate}
            </h3>
            <span className="text-[13px] text-[#52604C]">
              Opérateur : {summary?.operatorName || session.user?.fullName || 'Personnel My Vet'} ({session.activeClinic?.name || 'My Vet'})
            </span>
          </div>
          <span
            className={`px-3 py-1 font-bold text-[12px] rounded-full border self-start sm:self-auto ${
              (summary?.varianceDzd || 0) === 0
                ? 'bg-[#E7ECD9] text-[#3A683D] border-[#C7D2BA]'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {summary?.isClosed
              ? `Clôturée (écart ${formatDzd(summary.varianceDzd)})`
              : `Équilibrée (écart ${formatDzd(summary?.varianceDzd || 0)})`}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[13px] text-[#52604C]">Chargement du journal de caisse...</div>
        ) : !summary || summary.entries.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[#859766]">
            Aucun encaissement enregistré pour la date {selectedDate}.
          </div>
        ) : (
          <div className="space-y-3">
            {summary.entries.map((op) => (
              <div
                key={op.id}
                className="p-3.5 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-[12px] text-[#859766] shrink-0">{op.time}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-[13.5px] text-[#1B2F1C] truncate">
                      {op.clientName} — {op.patientName}
                      {op.invoiceNumber && (
                        <span className="ml-2 font-mono text-[11px] font-normal text-[#52604C]">
                          ({op.invoiceNumber})
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#52604C] truncate">{op.description}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[14px] text-[#1B2F1C]">{formatDzd(op.amountDzd)}</div>
                  <div className="text-[11.5px] text-[#52604C]">{op.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History of closed days */}
      {summary && summary.history && summary.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E7ECD9] pb-3">
            <History className="w-5 h-5 text-[#3A683D]" />
            <h3 className="text-[16px] font-bold text-[#1B2F1C]">Historique des clôtures validées</h3>
          </div>
          <div className="divide-y divide-[#E7ECD9]">
            {summary.history.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between text-[13px]">
                <div>
                  <span className="font-bold text-[#1B2F1C]">{h.closingDate}</span>
                  <span className="text-[#52604C] ml-3">Opérateur : {h.operatorName}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#3A683D]">{formatDzd(h.totalDzd)}</span>
                  <span className="text-[11.5px] text-[#52604C] ml-3">
                    (Écart : {formatDzd(h.varianceDzd)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={`Valider la clôture de caisse — ${selectedDate}`}
      >
        <form onSubmit={handleCloseDay} className="space-y-4">
          <div className="p-3 bg-[#F8F8F1] rounded-xl border border-[#C7D2BA] text-[13px] flex items-center justify-between">
            <span className="text-[#52604C]">Total théorique attendu (journal) :</span>
            <strong className="text-[#1B2F1C]">{formatDzd(summary?.expectedDzd || 0)}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-[#1B2F1C] mb-1">
                Espèces comptées (DZD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-[#1B2F1C] mb-1">
                Carte Bancaire (DZD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={countedCb}
                onChange={(e) => setCountedCb(e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-[#1B2F1C] mb-1">
                Chèques / Virements (DZD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={countedCheck}
                onChange={(e) => setCountedCheck(e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-[#E7ECD9]/60 rounded-xl border border-[#C7D2BA] text-[13px] flex items-center justify-between">
            <span className="font-semibold text-[#1B2F1C]">Écart constaté :</span>
            <span
              className={`font-bold ${
                Math.abs(previewVariance) < 0.01 ? 'text-[#3A683D]' : 'text-amber-700'
              }`}
            >
              {formatDzd(previewVariance)}
            </span>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Observations / justification d'écart
            </label>
            <textarea
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Ex : Caisse vérifiée en fin de service"
              className="w-full px-3 py-2 text-[13.5px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Validation...' : 'Confirmer la clôture'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

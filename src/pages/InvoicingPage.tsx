import React, { useState } from 'react';
import { Receipt, Plus, Search, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { useClinicData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import { formatDzd } from '../../shared/utils/money';
import type { Invoice, InvoiceStatus, PaymentMethod } from '../types';

export const InvoicingPage: React.FC = () => {
  const { invoices, clients, patients, createInvoice, updateInvoice } = useClinicData();
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Tous' | 'Payée' | 'En attente' | 'Devis'>('Tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payModalInvoice, setPayModalInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Espèces');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newInv, setNewInv] = useState({
    ownerId: '',
    clientName: '',
    animalId: '',
    patientName: '',
    description: 'Consultation vétérinaire & soins',
    amount: '3500',
    status: 'Payée' as InvoiceStatus,
    paymentMethod: 'Espèces' as PaymentMethod,
  });

  const filtered = invoices.filter((i) => {
    const matchesSearch =
      i.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Tous' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = invoices
    .filter((i) => i.status === 'Payée')
    .reduce((acc, curr) => acc + curr.amountDzd, 0);
  const totalPending = invoices
    .filter((i) => i.status === 'En attente' || i.status === 'Partielle')
    .reduce((acc, curr) => acc + Math.max(0, curr.amountDzd - curr.paidDzd), 0);

  const handleSelectPatient = (animalId: string) => {
    const pt = patients.find((p) => p.id === animalId);
    if (!pt) {
      setNewInv((prev) => ({ ...prev, animalId: '' }));
      return;
    }
    setNewInv((prev) => ({
      ...prev,
      animalId: pt.id,
      patientName: pt.name,
      ownerId: pt.ownerId,
      clientName: pt.ownerName,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const amountDzd = parseFloat(newInv.amount) || 0;
      await createInvoice({
        ownerId: newInv.ownerId || null,
        clientName: newInv.clientName,
        animalId: newInv.animalId || null,
        patientName: newInv.patientName,
        amountDzd,
        status: newInv.status,
        paymentMethod: newInv.paymentMethod,
        items: [
          {
            description: newInv.description || 'Honoraires vétérinaires',
            quantity: 1,
            unitPriceDzd: amountDzd,
          },
        ],
      });
      setIsModalOpen(false);
      setNewInv({
        ownerId: '',
        clientName: '',
        animalId: '',
        patientName: '',
        description: 'Consultation vétérinaire & soins',
        amount: '3500',
        status: 'Payée',
        paymentMethod: 'Espèces',
      });
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de la création de la facture.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInvoice) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateInvoice(payModalInvoice.id, {
        status: 'Payée',
        paymentMethod: payMethod,
      });
      setPayModalInvoice(null);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’encaissement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = (inv: Invoice) => {
    const clinic = session.activeClinic;
    const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>${inv.number} — My Vet</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#1B2F1C}
h1{color:#3A683D}table{width:100%;border-collapse:collapse;margin-top:24px}
th,td{border:1px solid #C7D2BA;padding:10px;text-align:left}th{background:#E7ECD9}</style>
</head><body>
<h1>${clinic?.name || 'Cabinet Vétérinaire My Vet'}</h1>
<p>${clinic?.address || 'Ouled Fayet, Alger'} — Tél : ${clinic?.phone || '0797 63 87 04'}</p>
<hr/>
<h2>Document : ${inv.number} (${inv.status})</h2>
<p><strong>Date :</strong> ${inv.dateFormatted}<br/>
<strong>Client :</strong> ${inv.clientName}<br/>
<strong>Patient :</strong> ${inv.patientName}<br/>
<strong>Mode de règlement :</strong> ${inv.paymentMethod || 'Espèces'}</p>
<table><thead><tr><th>Désignation</th><th>Qté</th><th>PU (DZD)</th><th>Total (DZD)</th></tr></thead><tbody>
${(inv.items && inv.items.length > 0
  ? inv.items
  : [{ description: 'Honoraires vétérinaires', quantity: 1, unitPriceDzd: inv.amountDzd, lineTotalDzd: inv.amountDzd }]
)
  .map(
    (it) =>
      `<tr><td>${it.description}</td><td>${it.quantity}</td><td>${formatDzd(it.unitPriceDzd)}</td><td>${formatDzd(
        it.lineTotalDzd ?? it.quantity * it.unitPriceDzd
      )}</td></tr>`
  )
  .join('')}
</tbody></table>
<h3 style="text-align:right;margin-top:20px">Total TTC : ${formatDzd(inv.amountDzd)}</h3>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Facturation & Devis (DZD)
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Émission et suivi des factures d'honoraires, devis et encaissements en Dinar Algérien
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle facture</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard title="Total encaissé ce mois" value={formatDzd(totalPaid)} />
        <StatCard
          title="En attente de paiement"
          value={formatDzd(totalPending)}
          valueColor="text-[#D97706]"
        />
        <StatCard title="Factures & devis émis" value={invoices.length} />
      </div>

      <div className="bg-white rounded-2xl border border-[#C7D2BA] p-4 flex flex-col sm:flex-row items-center gap-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#859766] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par numéro, client, patient..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-[14px] focus:outline-none focus:border-[#3A683D] focus:bg-white text-[#1B2F1C]"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['Tous', 'Payée', 'En attente', 'Devis'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#E7ECD9] text-[#1B2F1C] border border-[#C7D2BA]'
                  : 'bg-white text-[#52604C] border border-[#C7D2BA] hover:bg-[#F8F8F1]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#C7D2BA] shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-[#F8F8F1] border-b border-[#C7D2BA] text-[12px] font-bold text-[#52604C] uppercase">
            <tr>
              <th className="py-3 px-5">Numéro</th>
              <th className="py-3 px-5">Client / Patient</th>
              <th className="py-3 px-5">Date</th>
              <th className="py-3 px-5">Montant TTC</th>
              <th className="py-3 px-5">Statut</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECD9]">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-[#F8F8F1] transition-colors">
                <td className="py-4 px-5 font-bold text-[#1B2F1C]">{inv.number}</td>
                <td className="py-4 px-5">
                  <div className="font-semibold text-[#1B2F1C]">{inv.clientName}</div>
                  <div className="text-[12px] text-[#52604C]">Patient : {inv.patientName}</div>
                </td>
                <td className="py-4 px-5 text-[#52604C]">{inv.dateFormatted}</td>
                <td className="py-4 px-5 font-bold text-[#1B2F1C]">{formatDzd(inv.amountDzd)}</td>
                <td className="py-4 px-5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold ${
                      inv.status === 'Payée'
                        ? 'bg-[#E7ECD9] text-[#3A683D]'
                        : inv.status === 'Devis'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                  {(inv.status === 'En attente' || inv.status === 'Partielle') && (
                    <button
                      onClick={() => {
                        setPayModalInvoice(inv);
                        setPayMethod(inv.paymentMethod || 'Espèces');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E7ECD9] hover:bg-[#D5DFC1] text-[#3A683D] rounded-lg text-[12px] font-semibold cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Encaisser</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadInvoice(inv)}
                    className="p-1.5 hover:bg-[#E7ECD9] rounded-lg text-[#52604C] hover:text-[#1B2F1C] cursor-pointer"
                    title="Télécharger le document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer une facture ou un devis (DZD)">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Sélectionner un patient existant (optionnel)
            </label>
            <select
              value={newInv.animalId}
              onChange={(e) => handleSelectPatient(e.target.value)}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
            >
              <option value="">-- Saisie libre --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.ownerName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom du client *</label>
              <input
                type="text"
                list="myvet-clients-list"
                value={newInv.clientName}
                onChange={(e) => setNewInv({ ...newInv, clientName: e.target.value })}
                placeholder="Ex : Fatima Fatima"
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
              <datalist id="myvet-clients-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom du patient *</label>
              <input
                type="text"
                value={newInv.patientName}
                onChange={(e) => setNewInv({ ...newInv, patientName: e.target.value })}
                placeholder="Ex : Nina"
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Libellé de l'acte *</label>
            <input
              type="text"
              value={newInv.description}
              onChange={(e) => setNewInv({ ...newInv, description: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Montant TTC (DZD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newInv.amount}
                onChange={(e) => setNewInv({ ...newInv, amount: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Statut</label>
              <select
                value={newInv.status}
                onChange={(e) => setNewInv({ ...newInv, status: e.target.value as InvoiceStatus })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="Payée">Facture payée</option>
                <option value="En attente">Facture en attente</option>
                <option value="Devis">Devis</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Mode de règlement</label>
              <select
                value={newInv.paymentMethod}
                onChange={(e) => setNewInv({ ...newInv, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="Espèces">Espèces</option>
                <option value="Carte Bancaire">Carte Bancaire</option>
                <option value="Chèque / Virement">Chèque / Virement</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Génération...' : 'Générer le document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark Invoice Paid Modal */}
      <Modal
        isOpen={!!payModalInvoice}
        onClose={() => setPayModalInvoice(null)}
        title={`Encaisser la facture ${payModalInvoice?.number}`}
      >
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="p-3 bg-[#F8F8F1] rounded-xl border border-[#C7D2BA] text-[13px] flex justify-between">
            <span>Montant dû ({payModalInvoice?.clientName}) :</span>
            <strong className="text-[#3A683D]">
              {formatDzd((payModalInvoice?.amountDzd || 0) - (payModalInvoice?.paidDzd || 0))}
            </strong>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Mode d'encaissement</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
            >
              <option value="Espèces">Espèces</option>
              <option value="Carte Bancaire">Carte Bancaire</option>
              <option value="Chèque / Virement">Chèque / Virement</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setPayModalInvoice(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Validation...' : 'Valider l’encaissement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

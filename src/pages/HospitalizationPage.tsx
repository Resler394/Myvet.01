import React, { useState } from 'react';
import { BedDouble, Plus, ClipboardPlus, LogOut, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { useClinicData } from '../context/DataContext';
import { ApiError } from '../services/apiClient';
import type { HospitalizationBox, HospitalizationStatus } from '../types';

export const HospitalizationPage: React.FC = () => {
  const { hospitalizations, patients, createHospitalization, updateHospitalization } = useClinicData();

  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [careTarget, setCareTarget] = useState<HospitalizationBox | null>(null);
  const [dischargeTarget, setDischargeTarget] = useState<HospitalizationBox | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [admitForm, setAdmitForm] = useState({
    boxCode: 'Box H4',
    animalId: '',
    patientName: '',
    species: 'Chat',
    breed: 'Européen',
    ownerName: '',
    reason: '',
    veterinarian: 'Dr. Martin',
    status: 'Stable' as HospitalizationStatus,
    diet: 'Alimentation thérapeutique',
  });

  const [careNote, setCareNote] = useState('');
  const [careStatus, setCareStatus] = useState<HospitalizationStatus>('Stable');

  const isOccupied = (b: HospitalizationBox) =>
    b.status !== 'Disponible' && b.status !== 'Sorti' && b.patientName !== 'Libre';

  const occupiedCount = hospitalizations.filter(isOccupied).length;
  const availableCount = hospitalizations.filter((b) => !isOccupied(b)).length;
  const criticalCount = hospitalizations.filter((b) => b.status === 'Critique').length;
  const careLogsCount = hospitalizations.reduce((sum, b) => sum + (b.careLogs?.length || 0), 0);

  const handleSelectPatientForAdmit = (animalId: string) => {
    const p = patients.find((pt) => pt.id === animalId);
    if (!p) {
      setAdmitForm((prev) => ({ ...prev, animalId: '', patientName: '', ownerName: '' }));
      return;
    }
    setAdmitForm((prev) => ({
      ...prev,
      animalId: p.id,
      patientName: p.name,
      species: p.species,
      breed: p.breed,
      ownerName: p.ownerName,
      veterinarian: p.veterinarian || 'Dr. Martin',
    }));
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const selected = patients.find((p) => p.id === admitForm.animalId);
      await createHospitalization({
        boxCode: admitForm.boxCode,
        animalId: admitForm.animalId || null,
        ownerId: selected?.ownerId || null,
        patientName: admitForm.patientName,
        species: admitForm.species,
        breed: admitForm.breed,
        ownerName: admitForm.ownerName,
        reason: admitForm.reason,
        veterinarian: admitForm.veterinarian,
        status: admitForm.status,
        diet: admitForm.diet,
      });
      setIsAdmitOpen(false);
      setAdmitForm({
        boxCode: `Box H${hospitalizations.length + 1}`,
        animalId: '',
        patientName: '',
        species: 'Chat',
        breed: 'Européen',
        ownerName: '',
        reason: '',
        veterinarian: 'Dr. Martin',
        status: 'Stable',
        diet: 'Alimentation thérapeutique',
      });
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’admission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careTarget || !careNote.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateHospitalization(careTarget.id, {
        careNote: careNote.trim(),
        status: careStatus,
      });
      setCareTarget(null);
      setCareNote('');
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Impossible d’enregistrer le soin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async () => {
    if (!dischargeTarget) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateHospitalization(dischargeTarget.id, { discharge: true });
      setDischargeTarget(null);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Impossible d’enregistrer la sortie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BedDouble className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Suivi hospitalisation
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Tableau de bord des box de soins intensifs et des animaux hospitalisés
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAdmitOpen(true);
          }}
          className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Admettre un patient</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <StatCard title="Animaux hospitalisés" value={occupiedCount} />
        <StatCard title="Box disponibles" value={availableCount} />
        <StatCard title="Surveillance critique" value={criticalCount} valueColor="text-[#DC2626]" />
        <StatCard title="Actes de soins consignés" value={careLogsCount} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {hospitalizations.map((b) => {
          const isFree = !isOccupied(b);
          return (
            <div
              key={b.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3 ${
                b.status === 'Critique'
                  ? 'border-[#FECDD3] bg-[#FFFBFB]'
                  : 'border-[#C7D2BA]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#E7ECD9] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[16px] text-[#1B2F1C]">{b.boxCode}</span>
                  {!isFree && (
                    <span className="font-bold text-[16px] text-[#3A683D]">
                      — {b.patientName} ({b.species})
                    </span>
                  )}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isFree
                      ? 'bg-[#E7ECD9] text-[#52604C]'
                      : b.status === 'Critique'
                      ? 'bg-rose-100 text-rose-700'
                      : b.status === 'Stable'
                      ? 'bg-[#E7ECD9] text-[#3A683D]'
                      : 'bg-[#E7ECD9] text-[#5A7E32]'
                  }`}
                >
                  {isFree ? 'Disponible' : b.status}
                </span>
              </div>

              {!isFree ? (
                <div className="space-y-3 text-[13px]">
                  <div>
                    <span className="text-[#859766] uppercase text-[11px] font-bold block">Motif</span>
                    <p className="font-semibold text-[#1B2F1C]">{b.reason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12.5px] text-[#52604C]">
                    <div>Propriétaire : <strong className="text-[#1B2F1C]">{b.ownerName}</strong></div>
                    <div>Vétérinaire : <strong className="text-[#1B2F1C]">{b.veterinarian}</strong></div>
                  </div>

                  <div className="p-3 bg-[#F8F8F1] rounded-xl border border-[#C7D2BA] text-[12px] space-y-1">
                    <div><strong>Alimentation :</strong> {b.diet}</div>
                    <div className="text-[#52604C]"><strong>Dernier soin :</strong> {b.lastCare}</div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setCareTarget(b);
                        setCareStatus(b.status);
                        setCareNote('');
                      }}
                      className="px-3 py-1.5 bg-[#E7ECD9] hover:bg-[#D5DFC1] text-[#3A683D] rounded-xl text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardPlus className="w-3.5 h-3.5" />
                      <span>Ajouter un soin</span>
                    </button>
                    <button
                      onClick={() => setDischargeTarget(b)}
                      className="px-3 py-1.5 bg-white border border-[#C7D2BA] hover:bg-[#F8F8F1] text-[#52604C] rounded-xl text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sortie</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-[#859766] text-[13px]">
                  {b.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admit Modal */}
      <Modal isOpen={isAdmitOpen} onClose={() => setIsAdmitOpen(false)} title="Admettre un animal en hospitalisation">
        <form onSubmit={handleAdmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Box *</label>
              <input
                type="text"
                value={admitForm.boxCode}
                onChange={(e) => setAdmitForm({ ...admitForm, boxCode: e.target.value })}
                placeholder="Ex : Box H4"
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Patient enregistré</label>
              <select
                value={admitForm.animalId}
                onChange={(e) => handleSelectPatientForAdmit(e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="">-- Saisie libre ou sélectionner --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species}) — {p.ownerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom du patient *</label>
              <input
                type="text"
                value={admitForm.patientName}
                onChange={(e) => setAdmitForm({ ...admitForm, patientName: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Propriétaire</label>
              <input
                type="text"
                value={admitForm.ownerName}
                onChange={(e) => setAdmitForm({ ...admitForm, ownerName: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Motif d'admission *</label>
            <input
              type="text"
              value={admitForm.reason}
              onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
              placeholder="Ex : Surveillance post-opératoire et perfusion"
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">État clinique</label>
              <select
                value={admitForm.status}
                onChange={(e) => setAdmitForm({ ...admitForm, status: e.target.value as HospitalizationStatus })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="Stable">Stable</option>
                <option value="Critique">Critique</option>
                <option value="En convalescence">En convalescence</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Régime / Alimentation</label>
              <input
                type="text"
                value={admitForm.diet}
                onChange={(e) => setAdmitForm({ ...admitForm, diet: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setIsAdmitOpen(false)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Enregistrement...' : 'Admettre en box'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Care Note Modal */}
      <Modal
        isOpen={!!careTarget}
        onClose={() => setCareTarget(null)}
        title={`Consigner un soin — ${careTarget?.boxCode} (${careTarget?.patientName})`}
      >
        <form onSubmit={handleAddCare} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nouveau statut</label>
            <select
              value={careStatus}
              onChange={(e) => setCareStatus(e.target.value as HospitalizationStatus)}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
            >
              <option value="Critique">Critique</option>
              <option value="Stable">Stable</option>
              <option value="En convalescence">En convalescence</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Observation / Acte réalisé *</label>
            <textarea
              rows={3}
              value={careNote}
              onChange={(e) => setCareNote(e.target.value)}
              placeholder="Ex : Perfusion Ringer vérifiée, température 38.4°C"
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setCareTarget(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Enregistrement...' : 'Enregistrer le soin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Discharge Confirmation Modal */}
      <Modal
        isOpen={!!dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        title="Confirmer la sortie d'hospitalisation"
      >
        <div className="space-y-4">
          <p className="text-[13.5px] text-[#52604C]">
            Confirmer la sortie de <strong className="text-[#1B2F1C]">{dischargeTarget?.patientName}</strong> du{' '}
            <strong className="text-[#1B2F1C]">{dischargeTarget?.boxCode}</strong> ? Le box sera marqué comme disponible après désinfection.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setDischargeTarget(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="button" onClick={handleDischarge} disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Validation...' : 'Confirmer la sortie'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

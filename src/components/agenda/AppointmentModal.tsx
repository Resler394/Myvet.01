import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Appointment, AppointmentType, AppointmentStatus } from '../../types';
import { useClinicData } from '../../context/DataContext';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apt: Partial<Appointment>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  initialAppointment?: Appointment | null;
  defaultDate?: string;
  defaultTime?: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialAppointment,
  defaultDate = '2026-08-14',
  defaultTime = '09:00'
}) => {
  const { patients } = useClinicData();

  const [patientId, setPatientId] = useState(initialAppointment?.patientId || (patients[0]?.id || ''));
  const [date, setDate] = useState(initialAppointment?.date || defaultDate);
  const [startTime, setStartTime] = useState(initialAppointment?.startTime || defaultTime);
  const [type, setType] = useState<AppointmentType>(initialAppointment?.type || 'Consultation');
  const [reason, setReason] = useState(initialAppointment?.reason || '');
  const [veterinarian, setVeterinarian] = useState(initialAppointment?.veterinarian || 'Dr. Martin');
  const [status, setStatus] = useState<AppointmentStatus>(initialAppointment?.status || 'Confirmé');
  const [notes, setNotes] = useState(initialAppointment?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    if (initialAppointment) {
      setPatientId(initialAppointment.patientId);
      setDate(initialAppointment.date);
      setStartTime(initialAppointment.startTime);
      setType(initialAppointment.type);
      setReason(initialAppointment.reason);
      setVeterinarian(initialAppointment.veterinarian);
      setStatus(initialAppointment.status);
      setNotes(initialAppointment.notes || '');
    } else {
      setPatientId(patients[0]?.id || '');
      setDate(defaultDate);
      setStartTime(defaultTime);
      setType('Consultation');
      setReason('');
      setVeterinarian('Dr. Martin');
      setStatus('Confirmé');
      setNotes('');
    }
  }, [initialAppointment, defaultDate, defaultTime, isOpen, patients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      setErrorMsg('Veuillez sélectionner un patient existant.');
      return;
    }

    // Compute end time ~30 mins after start time
    const [h, m] = startTime.split(':').map(Number);
    const endM = (m + 30) % 60;
    const endH = h + Math.floor((m + 30) / 60);
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const aptData: Partial<Appointment> = {
      ...(initialAppointment ? { id: initialAppointment.id } : {}),
      patientId: patient.id,
      patientName: patient.name,
      clientId: patient.ownerId,
      clientName: patient.ownerName,
      date,
      startTime,
      endTime,
      type,
      reason: reason || (type === 'Vaccin' ? 'Vaccination' : type),
      veterinarian,
      status,
      notes
    };

    setSubmitting(true);
    try {
      await onSave(aptData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Impossible d'enregistrer le rendez-vous.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!initialAppointment || !onDelete) return;
    if (!window.confirm('Supprimer ce rendez-vous ?')) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onDelete(initialAppointment.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossible de supprimer le rendez-vous.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialAppointment ? 'Détails du rendez-vous' : 'Nouveau rendez-vous'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Patient Selection */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
            Patient / Animal *
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
            required
          >
            <option value="" disabled>Sélectionner un animal...</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.species} - {p.breed}) — Propriétaire : {p.ownerName}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Heure de début *
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
              required
            >
              {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Type & Veterinarian */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Type de visite *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
            >
              <option value="Consultation">Consultation</option>
              <option value="Vaccin">Vaccin</option>
              <option value="Urgence">Urgence</option>
              <option value="Contrôle">Contrôle</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Vétérinaire *
            </label>
            <select
              value={veterinarian}
              onChange={(e) => setVeterinarian(e.target.value)}
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
            >
              <option value="Dr. Martin">Dr. Martin</option>
              <option value="Dr. Leroy">Dr. Leroy</option>
              <option value="Dr. Bernard">Dr. Bernard</option>
              <option value="Dr. Vétérinaire">Dr. Vétérinaire</option>
            </select>
          </div>
        </div>

        {/* Reason / Title */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
            Motif de la visite *
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : Allergie, Douleur abdominale..."
            className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
            required
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
            Statut
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Confirmé', 'En attente', 'Annulé'] as AppointmentStatus[]).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`py-2 text-[13px] font-semibold rounded-xl border transition-all cursor-pointer ${
                  status === st
                    ? st === 'Confirmé'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : st === 'Annulé'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-[#C7D2BA] text-[#52604C]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
            Remarques / Notes (facultatif)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observations cliniques préalables..."
            className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A683D]/20 focus:border-[#3A683D]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E7ECD9]">
          {initialAppointment && onDelete ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteClick}
              className="text-[#DC2626] hover:bg-[#FEF2F2] px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Supprimer
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#C7D2BA] text-[#1B2F1C] rounded-xl text-[13px] font-medium hover:bg-[#F8F8F1] transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#3A683D] hover:bg-[#2F5933] disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer le rendez-vous'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

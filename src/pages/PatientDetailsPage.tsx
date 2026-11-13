import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Printer,
  Trash2,
  User,
  Phone,
  Info,
  Calendar,
  FileText,
  StickyNote,
  Bell,
  Pill,
  Activity,
  Stethoscope,
  MessageSquare,
  Plus,
  Filter,
  ChevronDown,
  Clock,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import { useClinicData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../services/apiClient';
import { Modal } from '../components/common/Modal';
import { PrescriptionModal } from '../components/common/PrescriptionModal';
import { formatAlgerianPhone } from '../utils/phoneUtils';
import type {
  Communication,
  MedicalConsultation,
  Patient,
  PatientDocument,
  PatientNote,
  PatientReminder,
  PatientTreatment,
  VitalSign,
} from '../types';

export const PatientDetailsPage: React.FC = () => {
  const { id = 'nina' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    patients,
    appointments: allAppointments,
    vaccinations: allVaccinations,
    updatePatient,
    archivePatient,
    createVaccination,
  } = useClinicData();
  const { session } = useAuth();

  const patient = patients.find((p) => p.id === id);

  const [activeTab, setActiveTab] = useState<
    'historique' | 'rdv' | 'documents' | 'notes' | 'rappels' | 'traitements'
  >('historique');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'consultation' | 'vital'>('all');

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [consultations, setConsultations] = useState<MedicalConsultation[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [reminders, setReminders] = useState<PatientReminder[]>([]);
  const [treatments, setTreatments] = useState<PatientTreatment[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [newActionType, setNewActionType] = useState<string | null>(null);

  // Edit form synced when opening edit modal
  const [editForm, setEditForm] = useState<Partial<Patient>>({});

  // Sub-action forms
  const [consultationForm, setConsultationForm] = useState({
    type: 'Consultation générale',
    diagnosis: '',
    treatment: '',
    notes: '',
    veterinarian: session.user?.fullName || 'Dr. Martin',
  });
  const [vitalForm, setVitalForm] = useState({
    weight: '5 kg',
    temperature: '38.5 °C',
    heartRate: '140 bpm',
  });
  const [noteForm, setNoteForm] = useState('');
  const [docForm, setDocForm] = useState({ name: '', type: 'PDF', size: '1.2 MB' });
  const [reminderForm, setReminderForm] = useState({ title: '', date: '2026-08-20' });
  const [treatmentForm, setTreatmentForm] = useState({
    name: 'Antiparasitaire',
    medication: 'Milbemax',
    dosage: '1 comprimé',
    frequency: 'Tous les 3 mois',
    startDate: '2026-08-14',
    endDate: '2026-11-14',
    instructions: 'À administrer pendant le repas',
  });
  const [vaccineForm, setVaccineForm] = useState({
    vaccineName: 'Vaccin annuel (Rage + Typhus)',
    administeredDate: '2026-08-14',
    nextDueDate: '2027-08-14',
    lotNumber: 'BIO-2026-ALG',
    veterinarian: 'Dr. Martin',
  });

  const loadMedicalRecords = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const records = await api.get<any[]>(
        `/api/medical-records?animalId=${encodeURIComponent(patient.id)}`
      );
      setConsultations(
        records
          .filter((r) => r.recordType === 'consultation')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            date: r.date || r.recordedAt || '',
            veterinarian: r.veterinarian || r.author || 'Dr. Martin',
            type: r.type || r.title || 'Consultation',
            diagnosis: r.diagnosis || '',
            treatment: r.treatment || '',
            notes: r.notes || '',
          }))
      );
      setVitals(
        records
          .filter((r) => r.recordType === 'vital')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            date: r.date || r.recordedAt || '',
            weight: r.weight || '—',
            temperature: r.temperature || '—',
            heartRate: r.heartRate || '—',
            notes: r.notes,
          }))
      );
      setNotes(
        records
          .filter((r) => r.recordType === 'note')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            date: r.date || r.recordedAt || '',
            author: r.author || 'Dr. Vétérinaire',
            content: r.content || r.title || '',
          }))
      );
      setDocuments(
        records
          .filter((r) => r.recordType === 'document')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            name: r.name || r.title || 'Document',
            type: r.type || 'PDF',
            uploadDate: r.uploadDate || r.recordedAt || '',
            size: r.size || '—',
          }))
      );
      setReminders(
        records
          .filter((r) => r.recordType === 'reminder')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            title: r.title || '',
            date: r.date || r.recordedAt || '',
            completed: Boolean(r.completed),
          }))
      );
      setTreatments(
        records
          .filter((r) => r.recordType === 'treatment')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            name: r.name || r.title || '',
            medication: r.medication || '',
            dosage: r.dosage || '',
            frequency: r.frequency || '',
            startDate: r.startDate || '',
            endDate: r.endDate || '',
            instructions: r.instructions || '',
            status: r.status || 'En cours',
          }))
      );
      setCommunications(
        records
          .filter((r) => r.recordType === 'communication')
          .map((r) => ({
            id: r.id,
            patientId: patient.id,
            channel: r.channel || 'SMS',
            date: r.date || r.recordedAt || '',
            recipient: r.recipient || patient.ownerName,
            message: r.message || '',
          }))
      );
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur de chargement du dossier médical.');
    }
  }, [patient?.id, patient?.ownerName]);

  useEffect(() => {
    loadMedicalRecords();
  }, [loadMedicalRecords]);

  if (!patient) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-[#1B2F1C]">Patient non trouvé</h2>
        <button
          onClick={() => navigate('/patients')}
          className="text-[#3A683D] font-semibold flex items-center gap-2 mx-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux fiches patients
        </button>
      </div>
    );
  }

  const appointments = allAppointments.filter((a) => a.patientId === patient.id);
  const vaccinations = allVaccinations.filter((v) => v.animalId === patient.id);

  const openEditModal = () => {
    setEditForm({
      name: patient.name,
      species: patient.species,
      breed: patient.breed,
      gender: patient.gender,
      weight: patient.weight,
      age: patient.age,
      color: patient.color,
      microchip: patient.microchip,
      veterinarian: patient.veterinarian,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteOrArchive = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await archivePatient(patient.id);
      setIsDeleteConfirmOpen(false);
      if (res.action === 'deleted') {
        navigate('/patients');
      } else {
        setNoticeMsg(
          res.reason ||
            `Le dossier de ${patient.name} a été archivé (historique clinique conservé pour traçabilité).`
        );
      }
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Action impossible sur ce dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  const todayDisplay = new Date().toLocaleDateString('fr-FR');

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/api/medical-records', {
        animalId: patient.id,
        recordType: 'consultation',
        recordedAt: todayDisplay,
        author: consultationForm.veterinarian,
        title: consultationForm.type,
        payload: {
          date: todayDisplay,
          veterinarian: consultationForm.veterinarian,
          type: consultationForm.type,
          diagnosis: consultationForm.diagnosis,
          treatment: consultationForm.treatment,
          notes: consultationForm.notes,
        },
      });
      setNewActionType(null);
      setConsultationForm({
        type: 'Consultation générale',
        diagnosis: '',
        treatment: '',
        notes: '',
        veterinarian: session.user?.fullName || 'Dr. Martin',
      });
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de la création de la consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/api/medical-records', {
        animalId: patient.id,
        recordType: 'vital',
        recordedAt: todayDisplay,
        author: session.user?.fullName || 'Dr. Vétérinaire',
        title: 'Constantes vitales',
        payload: {
          date: todayDisplay,
          weight: vitalForm.weight,
          temperature: vitalForm.temperature,
          heartRate: vitalForm.heartRate,
        },
      });
      setNewActionType(null);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’ajout des constantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/api/medical-records', {
        animalId: patient.id,
        recordType: 'note',
        recordedAt: todayDisplay,
        author: session.user?.fullName || 'Dr. Vétérinaire',
        title: 'Note clinique',
        payload: {
          date: todayDisplay,
          author: session.user?.fullName || 'Dr. Vétérinaire',
          content: noteForm.trim(),
        },
      });
      setNoteForm('');
      setNewActionType(null);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’ajout de la note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/api/medical-records', {
        animalId: patient.id,
        recordType: 'document',
        recordedAt: todayDisplay,
        author: session.user?.fullName || 'Dr. Vétérinaire',
        title: docForm.name.trim(),
        payload: {
          name: docForm.name.trim(),
          type: docForm.type,
          uploadDate: todayDisplay,
          size: docForm.size || '1.2 MB',
        },
      });
      setDocForm({ name: '', type: 'PDF', size: '1.2 MB' });
      setNewActionType(null);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’enregistrement du document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.delete(`/api/medical-records/${encodeURIComponent(docId)}`);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderForm.title.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/api/medical-records', {
        animalId: patient.id,
        recordType: 'reminder',
        recordedAt: reminderForm.date,
        author: session.user?.fullName || 'Dr. Vétérinaire',
        title: reminderForm.title.trim(),
        payload: {
          title: reminderForm.title.trim(),
          date: reminderForm.date,
          completed: false,
        },
      });
      setReminderForm({ title: '', date: '2026-08-20' });
      setNewActionType(null);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de la création du rappel.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReminder = async (remId: string) => {
    try {
      await api.patch(`/api/medical-records/${encodeURIComponent(remId)}/toggle`);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Impossible de mettre à jour le rappel.');
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/api/medical-records', {
        animalId: patient.id,
        recordType: 'treatment',
        recordedAt: treatmentForm.startDate,
        author: session.user?.fullName || 'Dr. Vétérinaire',
        title: treatmentForm.name,
        payload: {
          ...treatmentForm,
          status: 'En cours',
        },
      });
      setNewActionType(null);
      await loadMedicalRecords();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’ajout du traitement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res: any = await createVaccination({
        animalId: patient.id,
        ownerId: patient.ownerId,
        vaccineName: vaccineForm.vaccineName,
        administeredDate: vaccineForm.administeredDate,
        nextDueDate: vaccineForm.nextDueDate,
        lotNumber: vaccineForm.lotNumber,
        veterinarian: vaccineForm.veterinarian,
        status: 'Effectué',
      });
      setNewActionType(null);
      setNoticeMsg(
        `Vaccin enregistré. ${res?.scheduledReminders ?? 3} rappel(s) SMS automatiques programmés (J-7, J-3, J-1).`
      );
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de l’enregistrement du vaccin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updatePatient(patient.id, editForm);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour du patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    const cleanPhone = patient.ownerPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Bonjour ${patient.ownerName}, concernant votre animal ${patient.name} au Cabinet Vétérinaire My Vet : `
    );
    window.open(
      `https://wa.me/213${cleanPhone.replace(/^(213|0)/, '')}?text=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const phoneMeta = formatAlgerianPhone(patient.ownerPhone);

  return (
    <div className="p-6 lg:p-8 w-full max-w-[1240px] mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#C7D2BA] text-[#1B2F1C] text-[13px] font-semibold rounded-lg hover:bg-[#F8F8F1] transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#52604C]" />
          <span>Retour à la liste</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {noticeMsg && (
        <div className="p-3.5 bg-[#E7ECD9] border border-[#859766] rounded-xl text-[13px] text-[#1B2F1C] flex items-center justify-between gap-2">
          <span>{noticeMsg}</span>
          <button onClick={() => setNoticeMsg(null)} className="text-xs font-bold text-[#3A683D] cursor-pointer">
            OK
          </button>
        </div>
      )}

      {/* Main Patient Profile Information Card */}
      <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Zone A */}
          <div className="flex flex-col items-center shrink-0 w-full lg:w-auto">
            <div className="w-32 h-32 rounded-2xl bg-[#E7ECD9]/60 border border-[#C7D2BA] flex items-center justify-center text-5xl shadow-2xs select-none">
              <span role="img" aria-label={patient.species}>
                {patient.avatarEmoji || (patient.species === 'Chien' ? '🐶' : '🐱')}
              </span>
            </div>

            <div className="flex items-center flex-wrap justify-center gap-2 mt-4">
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#C7D2BA] text-[#1B2F1C] text-[12.5px] font-medium rounded-xl hover:bg-[#F8F8F1] transition-colors shadow-2xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#52604C]" />
                <span>Modifier</span>
              </button>

              <button
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E7ECD9] border border-[#C7D2BA] text-[#1B2F1C] text-[12.5px] font-semibold rounded-xl hover:bg-[#DCE3CB] transition-colors shadow-2xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#3A683D]" />
                <span>Ordonnance</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#C7D2BA] text-[#1B2F1C] text-[12.5px] font-medium rounded-xl hover:bg-[#F8F8F1] transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#52604C]" />
                <span>Imprimer</span>
              </button>

              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#FECDD3] text-[#DC2626] text-[12.5px] font-medium rounded-xl hover:bg-[#FEF2F2] transition-colors shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Archiver</span>
              </button>
            </div>
          </div>

          {/* Zone B */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="flex items-center flex-wrap gap-2.5">
              <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">{patient.name}</h1>
              <span className="px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#E7ECD9] text-[#3A683D] border border-[#C7D2BA]">
                {patient.status}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#E7ECD9]/50 text-[#5A7E32]">
                {patient.species}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-3 text-[13px] text-[#52604C]">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#859766]" />
                <span className="font-medium text-[#1B2F1C]">{patient.ownerName}</span>
              </div>
              <span className="text-[#C7D2BA]">·</span>
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#859766]" />
                <span className="font-medium text-[#1B2F1C]">{phoneMeta.national}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    phoneMeta.carrier === 'Ooredoo'
                      ? 'bg-[#ED1C24]/10 text-[#ED1C24]'
                      : phoneMeta.carrier === 'Mobilis'
                      ? 'bg-[#008542]/10 text-[#008542]'
                      : phoneMeta.carrier === 'Djezzy'
                      ? 'bg-[#E30613]/10 text-[#E30613]'
                      : 'bg-[#E7ECD9] text-[#52604C]'
                  }`}
                >
                  {phoneMeta.carrier}
                </span>
              </div>

              <button
                onClick={openWhatsApp}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[11.5px] font-semibold rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 pt-2">
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">RACE</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.breed || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">COULEUR</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.color || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">SEXE</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.gender || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">ÂGE</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.age || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">NÉ LE</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.birthDate || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">POIDS</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.weight || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">PUCE</span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.microchip || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">
                  PROCHAINE VISITE
                </span>
                <span
                  className="text-[13.5px] font-bold text-[#1B2F1C] truncate block max-w-[170px]"
                  title={patient.nextVisit}
                >
                  {patient.nextVisit || 'Aucune visite planifiée'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#859766] tracking-wider uppercase">
                  VÉTÉRINAIRE RÉFÉRENT
                </span>
                <span className="text-[13.5px] font-bold text-[#1B2F1C]">{patient.veterinarian || '—'}</span>
              </div>
            </div>
          </div>

          {/* Zone C */}
          <div className="w-full lg:w-[280px] shrink-0 lg:border-l lg:border-[#C7D2BA] lg:pl-6 space-y-2.5">
            <span className="block text-[11.5px] font-bold text-[#52604C] tracking-wider uppercase">
              ALERTES MÉDICALES
            </span>

            {patient.medicalAlerts && patient.medicalAlerts.length > 0 ? (
              patient.medicalAlerts.map((al) => (
                <div key={al.id} className="bg-[#E7ECD9]/70 border border-[#C7D2BA] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#3A683D] shrink-0" />
                    <span className="text-[13px] font-bold text-[#1B2F1C]">{al.type}</span>
                    <span className="px-1.5 py-0.2 bg-[#3A683D] text-white text-[10px] font-bold rounded">
                      {al.badge}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#3A683D] pl-5">{al.description}</p>
                </div>
              ))
            ) : (
              <div className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl p-3.5 text-[12.5px] text-[#52604C]">
                Aucune alerte critique signalée.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Medical History */}
      <div className="bg-white rounded-2xl border border-[#C7D2BA] shadow-2xs overflow-hidden">
        <div className="flex items-center border-b border-[#C7D2BA] px-4 overflow-x-auto select-none bg-white">
          <button
            onClick={() => setActiveTab('historique')}
            className={`flex items-center gap-2 px-4 py-3.5 text-[13.5px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'historique'
                ? 'text-[#3A683D] border-[#3A683D] bg-[#E7ECD9]/40'
                : 'text-[#52604C] border-transparent hover:text-[#1B2F1C]'
            }`}
          >
            <Stethoscope className={`w-4 h-4 ${activeTab === 'historique' ? 'text-[#3A683D]' : 'text-[#859766]'}`} />
            <span>Historique</span>
          </button>

          <button
            onClick={() => setActiveTab('rdv')}
            className={`flex items-center gap-2 px-4 py-3.5 text-[13.5px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'rdv'
                ? 'text-[#3A683D] border-[#3A683D] bg-[#E7ECD9]/40'
                : 'text-[#52604C] border-transparent hover:text-[#1B2F1C]'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'rdv' ? 'text-[#3A683D]' : 'text-[#859766]'}`} />
            <span>Rendez-vous</span>
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-[#E7ECD9] text-[#1B2F1C] rounded-full">
              {appointments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-3.5 text-[13.5px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'text-[#3A683D] border-[#3A683D] bg-[#E7ECD9]/40'
                : 'text-[#52604C] border-transparent hover:text-[#1B2F1C]'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'documents' ? 'text-[#3A683D]' : 'text-[#859766]'}`} />
            <span>Documents</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-3.5 text-[13.5px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'notes'
                ? 'text-[#3A683D] border-[#3A683D] bg-[#E7ECD9]/40'
                : 'text-[#52604C] border-transparent hover:text-[#1B2F1C]'
            }`}
          >
            <StickyNote className={`w-4 h-4 ${activeTab === 'notes' ? 'text-[#3A683D]' : 'text-[#859766]'}`} />
            <span>Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('rappels')}
            className={`flex items-center gap-2 px-4 py-3.5 text-[13.5px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'rappels'
                ? 'text-[#3A683D] border-[#3A683D] bg-[#E7ECD9]/40'
                : 'text-[#52604C] border-transparent hover:text-[#1B2F1C]'
            }`}
          >
            <Bell className={`w-4 h-4 ${activeTab === 'rappels' ? 'text-[#3A683D]' : 'text-[#859766]'}`} />
            <span>Rappels</span>
          </button>

          <button
            onClick={() => setActiveTab('traitements')}
            className={`flex items-center gap-2 px-4 py-3.5 text-[13.5px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'traitements'
                ? 'text-[#3A683D] border-[#3A683D] bg-[#E7ECD9]/40'
                : 'text-[#52604C] border-transparent hover:text-[#1B2F1C]'
            }`}
          >
            <Pill className={`w-4 h-4 ${activeTab === 'traitements' ? 'text-[#3A683D]' : 'text-[#859766]'}`} />
            <span>Traitements</span>
          </button>
        </div>

        {/* Tab 1: Historique */}
        {activeTab === 'historique' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold text-[#1B2F1C]">Historique médical</h2>

              <div className="flex items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#C7D2BA] rounded-xl text-[13px] font-semibold text-[#1B2F1C]">
                  <Filter className="w-3.5 h-3.5 text-[#52604C]" />
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    className="bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tout afficher</option>
                    <option value="consultation">Consultations</option>
                    <option value="vital">Signes vitaux</option>
                  </select>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#3A683D] hover:bg-[#2F5933] text-white text-[13px] font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  {isAddMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#C7D2BA] rounded-xl shadow-xl z-20 py-1">
                      <button
                        onClick={() => { setIsAddMenuOpen(false); setNewActionType('consultation'); }}
                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F8F1] text-[#1B2F1C] flex items-center gap-2 cursor-pointer"
                      >
                        <Stethoscope className="w-4 h-4 text-[#3A683D]" />
                        <span>Nouvelle consultation</span>
                      </button>
                      <button
                        onClick={() => { setIsAddMenuOpen(false); setIsPrescriptionModalOpen(true); }}
                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F8F1] text-[#1B2F1C] flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <FileText className="w-4 h-4 text-[#3A683D]" />
                        <span>Ordonnance officielle</span>
                      </button>
                      <button
                        onClick={() => { setIsAddMenuOpen(false); setNewActionType('vitals'); }}
                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F8F1] text-[#1B2F1C] flex items-center gap-2 cursor-pointer"
                      >
                        <Activity className="w-4 h-4 text-[#3A683D]" />
                        <span>Signes vitaux</span>
                      </button>
                      <button
                        onClick={() => { setIsAddMenuOpen(false); setNewActionType('note'); }}
                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F8F1] text-[#1B2F1C] flex items-center gap-2 cursor-pointer"
                      >
                        <StickyNote className="w-4 h-4 text-[#3A683D]" />
                        <span>Ajouter une note</span>
                      </button>
                      <button
                        onClick={() => { setIsAddMenuOpen(false); setNewActionType('reminder'); }}
                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F8F1] text-[#1B2F1C] flex items-center gap-2 cursor-pointer"
                      >
                        <Bell className="w-4 h-4 text-[#3A683D]" />
                        <span>Créer un rappel</span>
                      </button>
                      <button
                        onClick={() => { setIsAddMenuOpen(false); setNewActionType('treatment'); }}
                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F8F1] text-[#1B2F1C] flex items-center gap-2 cursor-pointer"
                      >
                        <Pill className="w-4 h-4 text-[#3A683D]" />
                        <span>Ajouter un traitement</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-[#C7D2BA] rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#3A683D]" />
                  <span className="text-[14px] font-bold text-[#1B2F1C]">Signes vitaux</span>
                </div>
                {vitals.length > 0 ? (
                  <div className="space-y-1 text-[13px]">
                    <div className="text-[#1B2F1C] font-medium">Poids : {vitals[0].weight}</div>
                    <div className="text-[#1B2F1C] font-medium">Température : {vitals[0].temperature}</div>
                    <div className="text-[11px] text-[#859766]">{vitals[0].date}</div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#52604C]">Aucune mesure enregistrée</p>
                )}
              </div>

              <div className="bg-white border border-[#C7D2BA] rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#3A683D]" />
                  <span className="text-[14px] font-bold text-[#1B2F1C]">Historique de visite</span>
                </div>
                {consultations.length > 0 ? (
                  <div className="space-y-1 text-[13px]">
                    <div className="font-semibold text-[#1B2F1C]">{consultations[0].type}</div>
                    <div className="text-[12px] text-[#52604C]">{consultations[0].diagnosis}</div>
                    <div className="text-[11px] text-[#859766]">{consultations[0].date}</div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#52604C]">Aucune consultation enregistrée</p>
                )}
              </div>

              <div className="bg-white border border-[#C7D2BA] rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#3A683D]" />
                  <span className="text-[14px] font-bold text-[#1B2F1C]">Communications</span>
                </div>
                {communications.length > 0 ? (
                  <div className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#3A683D]">{communications[0].channel}</span>
                      <span className="text-[11px] text-[#859766]">{communications[0].date}</span>
                    </div>
                    <p className="text-[12px] text-[#52604C] leading-relaxed line-clamp-3">
                      {communications[0].message}
                    </p>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#52604C]">Aucun échange consigné</p>
                )}
              </div>
            </div>

            {historyFilter === 'vital' ? (
              <div className="space-y-3">
                {vitals.map((v) => (
                  <div key={v.id} className="p-4 border border-[#C7D2BA] rounded-xl flex justify-between text-[13px]">
                    <span className="font-bold text-[#1B2F1C]">
                      Poids : {v.weight} · Temp : {v.temperature} · Pouls : {v.heartRate}
                    </span>
                    <span className="text-[#859766]">{v.date}</span>
                  </div>
                ))}
                {vitals.length === 0 && (
                  <p className="text-center text-[13px] text-[#52604C] py-6">Aucune constante vitale enregistrée.</p>
                )}
              </div>
            ) : consultations.length === 0 ? (
              <div className="border border-[#C7D2BA] rounded-2xl p-12 text-center bg-white space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#E7ECD9] text-[#3A683D] flex items-center justify-center mx-auto">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <h3 className="text-[16px] font-bold text-[#1B2F1C]">Aucune consultation enregistrée</h3>
                <p className="text-[13.5px] text-[#52604C] max-w-md mx-auto">
                  Créez la première consultation pour commencer l'historique médical.
                </p>
                <button
                  onClick={() => setNewActionType('consultation')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#3A683D] hover:bg-[#2F5933] text-white text-[13px] font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer une consultation</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {consultations.map((c) => (
                  <div key={c.id} className="p-4 border border-[#C7D2BA] rounded-xl space-y-1.5 hover:bg-[#F8F8F1] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[14px] text-[#1B2F1C]">{c.type}</span>
                      <span className="text-[12px] text-[#859766]">{c.date} · {c.veterinarian}</span>
                    </div>
                    <p className="text-[13px] text-[#52604C]"><strong>Diagnostic :</strong> {c.diagnosis}</p>
                    {c.treatment && <p className="text-[13px] text-[#52604C]"><strong>Traitement :</strong> {c.treatment}</p>}
                    {c.notes && <p className="text-[12px] text-[#859766] italic">{c.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Rendez-vous */}
        {activeTab === 'rdv' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#1B2F1C]">Rendez-vous programmés</h2>
              <button
                onClick={() => navigate('/agenda')}
                className="text-[13px] font-semibold text-[#3A683D] hover:underline cursor-pointer"
              >
                Voir dans l'agenda →
              </button>
            </div>

            {appointments.length === 0 ? (
              <p className="text-[13px] text-[#52604C] py-6 text-center">Aucun rendez-vous programmé pour {patient.name}.</p>
            ) : (
              <div className="divide-y divide-[#E7ECD9] border border-[#C7D2BA] rounded-xl overflow-hidden">
                {appointments.map((a) => (
                  <div key={a.id} className="p-4 flex items-center justify-between hover:bg-[#F8F8F1]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#E7ECD9] text-[#3A683D] flex items-center justify-center font-bold">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-[#1B2F1C]">{a.reason}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E7ECD9] text-[#3A683D]">{a.type}</span>
                        </div>
                        <span className="text-[12.5px] text-[#52604C]">
                          {a.date} à {a.startTime} ({a.endTime}) · {a.veterinarian}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#E7ECD9] text-[#3A683D]">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Documents */}
        {activeTab === 'documents' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#1B2F1C]">Documents médicaux</h2>
              <button
                onClick={() => setNewActionType('document')}
                className="px-3.5 py-1.5 bg-[#3A683D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2F5933] cursor-pointer"
              >
                + Ajouter un document
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="border border-[#C7D2BA] rounded-2xl p-8 text-center bg-white space-y-2">
                <FileText className="w-10 h-10 text-[#859766] mx-auto" />
                <h3 className="text-[15px] font-bold text-[#1B2F1C]">Aucun document enregistré</h3>
                <p className="text-[13px] text-[#52604C]">Consignez les radiographies, analyses de sang ou ordonnances.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="p-3 border border-[#C7D2BA] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#3A683D]" />
                      <div>
                        <h4 className="text-[13.5px] font-bold text-[#1B2F1C]">{d.name}</h4>
                        <span className="text-[11.5px] text-[#859766]">{d.type} · {d.uploadDate} · {d.size}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(d.id)}
                      className="text-xs text-[#DC2626] hover:underline cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notes */}
        {activeTab === 'notes' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#1B2F1C]">Notes d'observation</h2>
              <button
                onClick={() => setNewActionType('note')}
                className="px-3.5 py-1.5 bg-[#3A683D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2F5933] cursor-pointer"
              >
                + Ajouter une note
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="border border-[#C7D2BA] rounded-2xl p-8 text-center bg-white space-y-2">
                <StickyNote className="w-10 h-10 text-[#859766] mx-auto" />
                <h3 className="text-[15px] font-bold text-[#1B2F1C]">Aucune note enregistrée</h3>
                <p className="text-[13px] text-[#52604C]">Ajoutez des notes internes concernant le comportement de l'animal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="p-3.5 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11.5px] text-[#859766]">
                      <span>{n.author}</span>
                      <span>{n.date}</span>
                    </div>
                    <p className="text-[13px] text-[#1B2F1C]">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Rappels */}
        {activeTab === 'rappels' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-[18px] font-bold text-[#1B2F1C]">Rappels & alertes</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewActionType('vaccine')}
                  className="px-3.5 py-1.5 bg-[#E7ECD9] hover:bg-[#D5DFC1] text-[#3A683D] text-[13px] font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  + Enregistrer un vaccin
                </button>
                <button
                  onClick={() => setNewActionType('reminder')}
                  className="px-3.5 py-1.5 bg-[#3A683D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2F5933] cursor-pointer"
                >
                  + Créer un rappel
                </button>
              </div>
            </div>

            {vaccinations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[12px] font-bold text-[#3A683D] uppercase tracking-wider">
                    Protocole Vaccinal & Rappels SMS Automatiques
                  </span>
                  <span className="text-[11px] font-semibold text-[#52604C]">
                    Alertes programmées : J-7, J-3, J-1
                  </span>
                </div>
                {vaccinations.map((v) => (
                  <div key={v.id} className="p-3.5 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px] text-[#1B2F1C]">{v.vaccineName}</span>
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#E7ECD9] text-[#3A683D]">
                          Prochaine échéance : {v.nextDueDate}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#52604C]">
                        Praticien : {v.veterinarian} · Lot : {v.lotNumber || 'BIO-2026'}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#3A683D]/10 text-[#3A683D] flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3A683D]"></span>
                      Rappels SMS Actifs
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <span className="text-[12px] font-bold text-[#52604C] uppercase tracking-wider block mb-2">
                Alertes & Tâches Cliniques
              </span>
              {reminders.length === 0 ? (
                <div className="border border-[#C7D2BA] rounded-2xl p-6 text-center bg-white space-y-2">
                  <Bell className="w-8 h-8 text-[#859766] mx-auto" />
                  <h3 className="text-[14px] font-bold text-[#1B2F1C]">Aucune tâche clinique en attente</h3>
                  <p className="text-[12.5px] text-[#52604C]">Planifiez les vermifuges, soins locaux ou bilans de contrôle.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reminders.map((r) => (
                    <div key={r.id} className="p-3 border border-[#C7D2BA] rounded-xl flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={r.completed}
                          onChange={() => handleToggleReminder(r.id)}
                          className="w-4 h-4 accent-[#3A683D] rounded border-[#C7D2BA] cursor-pointer"
                        />
                        <span className={`text-[13.5px] font-medium ${r.completed ? 'line-through text-[#859766]' : 'text-[#1B2F1C]'}`}>
                          {r.title}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#52604C] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {r.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Traitements */}
        {activeTab === 'traitements' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#1B2F1C]">Traitements & prescriptions</h2>
              <button
                onClick={() => setNewActionType('treatment')}
                className="px-3.5 py-1.5 bg-[#3A683D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2F5933] cursor-pointer"
              >
                + Ajouter un traitement
              </button>
            </div>

            {treatments.length === 0 ? (
              <div className="border border-[#C7D2BA] rounded-2xl p-8 text-center bg-white space-y-2">
                <Pill className="w-10 h-10 text-[#859766] mx-auto" />
                <h3 className="text-[15px] font-bold text-[#1B2F1C]">Aucun traitement en cours</h3>
                <p className="text-[13px] text-[#52604C]">Enregistrez les posologies, dates et consignes médicamenteuses.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {treatments.map((t) => (
                  <div key={t.id} className="p-4 border border-[#C7D2BA] rounded-xl space-y-2 bg-[#F8F8F1]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-[#1B2F1C]">{t.name} ({t.medication})</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E7ECD9] text-[#3A683D]">
                          {t.status}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#52604C]">Du {t.startDate} au {t.endDate}</span>
                    </div>
                    <p className="text-[13px] text-[#52604C]">Posologie : {t.dosage} · {t.frequency}</p>
                    <p className="text-[12px] text-[#859766] italic">Consignes : {t.instructions}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        patient={patient}
      />

      {/* Archive / Delete Confirm Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={`Archiver ou supprimer ${patient.name}`}
      >
        <div className="space-y-4">
          <p className="text-[13.5px] text-[#52604C]">
            Si l'animal dispose de rendez-vous, vaccins ou consultations associées, son dossier sera{' '}
            <strong className="text-[#1B2F1C]">archivé</strong> afin de préserver la traçabilité médicale. Sinon, il sera supprimé.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteOrArchive}
              disabled={submitting}
              className="px-4 py-2 bg-[#DC2626] text-white rounded-xl text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>{submitting ? 'Traitement...' : 'Confirmer'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier la fiche patient">
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom</label>
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Espèce</label>
              <select
                value={editForm.species || 'Chat'}
                onChange={(e) => setEditForm({ ...editForm, species: e.target.value as Patient['species'] })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              >
                <option value="Chat">Chat</option>
                <option value="Chien">Chien</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Race</label>
              <input
                type="text"
                value={editForm.breed || ''}
                onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Sexe</label>
              <select
                value={editForm.gender || 'Femelle'}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as Patient['gender'] })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              >
                <option value="Femelle">Femelle</option>
                <option value="Mâle">Mâle</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Poids</label>
              <input
                type="text"
                value={editForm.weight || ''}
                onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Âge</label>
              <input
                type="text"
                value={editForm.age || ''}
                onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Numéro de puce</label>
              <input
                type="text"
                value={editForm.microchip || ''}
                onChange={(e) => setEditForm({ ...editForm, microchip: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Vétérinaire référent</label>
              <input
                type="text"
                value={editForm.veterinarian || ''}
                onChange={(e) => setEditForm({ ...editForm, veterinarian: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] font-medium text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Consultation Modal */}
      <Modal isOpen={newActionType === 'consultation'} onClose={() => setNewActionType(null)} title="Nouvelle consultation médicale">
        <form onSubmit={handleAddConsultation} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Type de consultation</label>
            <input
              type="text"
              value={consultationForm.type}
              onChange={(e) => setConsultationForm({ ...consultationForm, type: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Diagnostic clinique</label>
            <textarea
              value={consultationForm.diagnosis}
              onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Traitement prescrit</label>
            <textarea
              value={consultationForm.treatment}
              onChange={(e) => setConsultationForm({ ...consultationForm, treatment: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Créer la consultation
            </button>
          </div>
        </form>
      </Modal>

      {/* Vitals Modal */}
      <Modal isOpen={newActionType === 'vitals'} onClose={() => setNewActionType(null)} title="Ajouter des signes vitaux">
        <form onSubmit={handleAddVitals} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Poids</label>
              <input
                type="text"
                value={vitalForm.weight}
                onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Température</label>
              <input
                type="text"
                value={vitalForm.temperature}
                onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Pouls</label>
              <input
                type="text"
                value={vitalForm.heartRate}
                onChange={(e) => setVitalForm({ ...vitalForm, heartRate: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Enregistrer les mesures
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Modal */}
      <Modal isOpen={newActionType === 'document'} onClose={() => setNewActionType(null)} title="Ajouter un document médical">
        <form onSubmit={handleAddDocument} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom du document *</label>
            <input
              type="text"
              value={docForm.name}
              onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
              placeholder="Ex : Radio pulmonaire, Bilan sanguin"
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Catégorie</label>
              <select
                value={docForm.type}
                onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="PDF">PDF</option>
                <option value="Radiographie">Radiographie</option>
                <option value="Analyse biologique">Analyse biologique</option>
                <option value="Ordonnance">Ordonnance</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Taille estimée</label>
              <input
                type="text"
                value={docForm.size}
                onChange={(e) => setDocForm({ ...docForm, size: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Note Modal */}
      <Modal isOpen={newActionType === 'note'} onClose={() => setNewActionType(null)} title="Ajouter une note">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Observation</label>
            <textarea
              value={noteForm}
              onChange={(e) => setNoteForm(e.target.value)}
              rows={4}
              placeholder="Saisissez vos observations cliniques ou comportementales..."
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Enregistrer la note
            </button>
          </div>
        </form>
      </Modal>

      {/* Reminder Modal */}
      <Modal isOpen={newActionType === 'reminder'} onClose={() => setNewActionType(null)} title="Créer un rappel">
        <form onSubmit={handleAddReminder} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Titre du rappel</label>
            <input
              type="text"
              value={reminderForm.title}
              onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
              placeholder="Ex : Rappel vaccin leucose"
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Date d'échéance</label>
            <input
              type="date"
              value={reminderForm.date}
              onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Créer le rappel
            </button>
          </div>
        </form>
      </Modal>

      {/* Treatment Modal */}
      <Modal isOpen={newActionType === 'treatment'} onClose={() => setNewActionType(null)} title="Ajouter un traitement">
        <form onSubmit={handleAddTreatment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom du traitement</label>
              <input
                type="text"
                value={treatmentForm.name}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Médicament</label>
              <input
                type="text"
                value={treatmentForm.medication}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, medication: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Posologie / Dosage</label>
              <input
                type="text"
                value={treatmentForm.dosage}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, dosage: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Fréquence</label>
              <input
                type="text"
                value={treatmentForm.frequency}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, frequency: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Instructions</label>
            <input
              type="text"
              value={treatmentForm.instructions}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, instructions: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Ajouter le traitement
            </button>
          </div>
        </form>
      </Modal>

      {/* Vaccine Modal */}
      <Modal
        isOpen={newActionType === 'vaccine'}
        onClose={() => setNewActionType(null)}
        title="Enregistrer un vaccin & programmer les rappels SMS"
      >
        <form onSubmit={handleAddVaccine} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Désignation du vaccin *</label>
            <input
              type="text"
              value={vaccineForm.vaccineName}
              onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Date d'injection</label>
              <input
                type="date"
                value={vaccineForm.administeredDate}
                onChange={(e) => setVaccineForm({ ...vaccineForm, administeredDate: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Prochain rappel dû *</label>
              <input
                type="date"
                value={vaccineForm.nextDueDate}
                onChange={(e) => setVaccineForm({ ...vaccineForm, nextDueDate: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Numéro de lot</label>
              <input
                type="text"
                value={vaccineForm.lotNumber}
                onChange={(e) => setVaccineForm({ ...vaccineForm, lotNumber: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Vétérinaire</label>
              <select
                value={vaccineForm.veterinarian}
                onChange={(e) => setVaccineForm({ ...vaccineForm, veterinarian: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="Dr. Martin">Dr. Martin</option>
                <option value="Dr. Leroy">Dr. Leroy</option>
                <option value="Dr. Bernard">Dr. Bernard</option>
                <option value="Dr. Vétérinaire">Dr. Vétérinaire</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[#E7ECD9]/70 border border-[#C7D2BA] rounded-xl text-xs text-[#1B2F1C] space-y-1">
            <div className="font-bold text-[#3A683D]">Programmation automatique des alertes SMS :</div>
            <p className="text-[#52604C]">
              L'enregistrement de ce vaccin crée automatiquement 3 rappels SMS idempotents (J-7, J-3, J-1) en base de données, routés vers {patient.ownerName} ({patient.ownerPhone}).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setNewActionType(null)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              Valider et programmer les rappels
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

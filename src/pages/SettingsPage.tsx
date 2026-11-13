import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Building,
  Users,
  Check,
  Database,
  Radio,
  Clock,
  Send,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Palette,
  Sun,
  Moon,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useClinicData } from '../context/DataContext';
import { api, ApiError } from '../services/apiClient';
import {
  inspectLegacyLocalStorage,
  downloadLegacyLocalStorageBackup,
  type LegacyLocalStorageSnapshot,
} from '../services/storage';
import { calculateClientSmsSegments } from '../utils/smsCalc';
import type { MigrationReport, SmsConfig } from '../types';

export const SettingsPage: React.FC = () => {
  const { setTheme, isDark } = useTheme();
  const { session, refreshSession } = useAuth();
  const { refreshAll } = useClinicData();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'database' | 'sms'>('general');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // General clinic info initialized from authenticated activeClinic
  const [clinicName, setClinicName] = useState(session.activeClinic?.name || 'My Vet — Cabinet Vétérinaire');
  const [slogan, setSlogan] = useState(
    session.activeClinic?.slogan || 'Le bien-être de vos compagnons, notre priorité'
  );
  const [address, setAddress] = useState(
    session.activeClinic?.address || 'Coopérative El Moustakbel n° CC3, Ouled Fayet, Alger'
  );
  const [phone, setPhone] = useState(session.activeClinic?.phone || '0797 63 87 04');
  const [email, setEmail] = useState(session.activeClinic?.email || 'contact@myvet.dz');

  useEffect(() => {
    if (session.activeClinic) {
      setClinicName(session.activeClinic.name);
      setSlogan(session.activeClinic.slogan);
      setAddress(session.activeClinic.address);
      setPhone(session.activeClinic.phone);
      setEmail(session.activeClinic.email || '');
    }
  }, [session.activeClinic]);

  // Backend & Database status + Legacy LocalStorage inspector
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [legacySnapshot, setLegacySnapshot] = useState<LegacyLocalStorageSnapshot>(() =>
    inspectLegacyLocalStorage()
  );
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationReport | null>(null);

  // SMS Gateway Config
  const [smsConfig, setSmsConfig] = useState<SmsConfig>({
    provider_mode: 'TEST',
    active_provider: 'Ooredoo_Business_Algeria',
    api_key_configured: false,
    enable_vaccination_reminders: true,
    vaccination_intervals: '7,3,1',
    enable_appointment_reminders: true,
    appointment_interval_hours: 24,
    sending_start_hour: 8,
    sending_end_hour: 20,
    timezone: 'Africa/Algiers',
  });
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  const [testMessage, setTestMessage] = useState(
    'Cabinet My Vet: Rappel vaccin pour Rocky prévu le 20/08/2026. Coopérative El Moustakbel, Ouled Fayet. Tel: 0797 63 87 04.'
  );
  const testCalc = calculateClientSmsSegments(testMessage);

  const loadBackendStatus = useCallback(async () => {
    try {
      const [status, cfg] = await Promise.all([
        api.get<any>('/api/system/status'),
        api.get<SmsConfig>('/api/sms/config'),
      ]);
      setDbStatus(status);
      if (cfg) setSmsConfig(cfg);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors du chargement des paramètres.');
    }
  }, []);

  useEffect(() => {
    loadBackendStatus();
    setLegacySnapshot(inspectLegacyLocalStorage());
  }, [loadBackendStatus]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.patch('/api/clinic', {
        name: clinicName,
        slogan,
        address,
        phone,
        email,
      });
      await refreshSession();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Impossible d'enregistrer les coordonnées.");
    }
  };

  const handleSaveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const updated = await api.put<SmsConfig>('/api/sms/config', {
        provider_mode: smsConfig.provider_mode,
        active_provider: smsConfig.active_provider,
        enable_vaccination_reminders: smsConfig.enable_vaccination_reminders,
        vaccination_intervals: smsConfig.vaccination_intervals,
        enable_appointment_reminders: smsConfig.enable_appointment_reminders,
        appointment_interval_hours: smsConfig.appointment_interval_hours,
        sending_start_hour: smsConfig.sending_start_hour,
        sending_end_hour: smsConfig.sending_end_hour,
        timezone: smsConfig.timezone,
      });
      setSmsConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Impossible d'enregistrer la configuration SMS.");
    }
  };

  const handleRunMigration = async (dryRun: boolean) => {
    setIsMigrating(true);
    setMigrationResult(null);
    setErrorMsg(null);
    try {
      const snap = inspectLegacyLocalStorage();
      setLegacySnapshot(snap);
      const res = await api.post<MigrationReport>('/api/system/migrate', {
        dryRun,
        sourceFormat: 'vetosuite-localstorage',
        clients: snap.clients,
        patients: snap.patients,
        appointments: snap.appointments,
        tasks: snap.tasks,
        stocks: snap.stocks,
        vaccinations: snap.vaccinations,
        consultations: snap.consultations,
        vitals: snap.vitals,
        notes: snap.notes,
        documents: snap.documents,
        treatments: snap.treatments,
        reminders: snap.reminders,
        communications: snap.communications,
        legacyV1Blob: snap.legacyV1Blob,
      });
      setMigrationResult(res);
      if (!dryRun) {
        await Promise.all([loadBackendStatus(), refreshAll()]);
      }
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de la migration.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleTriggerCron = async () => {
    setIsTriggeringCron(true);
    setCronResult(null);
    setErrorMsg(null);
    try {
      const res = await api.post('/api/cron/process-reminders', { bypassWindow: true });
      setCronResult(res);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Erreur d'exécution du cron.");
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const isPgConnected = Boolean(dbStatus?.database?.connected);

  return (
    <div className="p-6 lg:p-8 max-w-[1240px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Paramètres du cabinet
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Architecture Supabase PostgreSQL, passerelle SMS Algérie, Vercel Cron & coordonnées officielles
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F8F8F1] border border-[#C7D2BA] px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1B2F1C]">
          <span className={`w-2.5 h-2.5 rounded-full ${isPgConnected ? 'bg-[#3A683D]' : 'bg-amber-500'}`}></span>
          <span>{isPgConnected ? 'Supabase PostgreSQL Connecté' : 'Sandbox Dev (Sans DATABASE_URL)'}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#C7D2BA] pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white border-t-2 border-x border-t-[#3A683D] border-x-[#C7D2BA] text-[#3A683D] -mb-px'
              : 'text-[#52604C] hover:text-[#1B2F1C]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Établissement & Équipe</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-white border-t-2 border-x border-t-[#3A683D] border-x-[#C7D2BA] text-[#3A683D] -mb-px'
              : 'text-[#52604C] hover:text-[#1B2F1C]'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Apparence & Thème</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#E7ECD9] text-[#3A683D] uppercase">
            {isDark ? 'Sombre' : 'Clair'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'database'
              ? 'bg-white border-t-2 border-x border-t-[#3A683D] border-x-[#C7D2BA] text-[#3A683D] -mb-px'
              : 'text-[#52604C] hover:text-[#1B2F1C]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base PostgreSQL & Migration</span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'sms'
              ? 'bg-white border-t-2 border-x border-t-[#3A683D] border-x-[#C7D2BA] text-[#3A683D] -mb-px'
              : 'text-[#52604C] hover:text-[#1B2F1C]'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Passerelle SMS & Vercel Cron</span>
        </button>
      </div>

      {/* Tab 1: General */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-6">
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E7ECD9] pb-3">
              <Building className="w-5 h-5 text-[#3A683D]" />
              <h3 className="text-[16px] font-bold text-[#1B2F1C]">
                Coordonnées de l'établissement (Devise : DZD)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Raison sociale</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Slogan officiel</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Adresse postale</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Téléphone cabinet</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none font-medium text-[#3A683D]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-[#E7ECD9] pb-3 pt-4">
              <Users className="w-5 h-5 text-[#3A683D]" />
              <h3 className="text-[16px] font-bold text-[#1B2F1C]">
                Session & Équipe habilitée
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {session.user && (
                <div className="p-3 bg-[#E7ECD9]/60 border border-[#3A683D] rounded-xl flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#3A683D] text-white font-bold text-xs flex items-center justify-center">
                    {session.user.avatarInitials}
                  </span>
                  <div>
                    <div className="font-bold text-[13.5px] text-[#1B2F1C]">
                      {session.user.fullName} (Connecté)
                    </div>
                    <div className="text-[12px] text-[#52604C]">
                      Rôle : {session.activeRole} · {session.user.email}
                    </div>
                  </div>
                </div>
              )}
              {[
                { name: 'Dr. Martin', role: 'Vétérinaire associé', initials: 'DM' },
                { name: 'Dr. Leroy', role: 'Vétérinaire chirurgien', initials: 'DL' },
                { name: 'Secrétariat Accueil', role: 'Réception & Caisse DZD', initials: 'AC' },
              ].map((m) => (
                <div key={m.name} className="p-3 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#E7ECD9] text-[#3A683D] font-bold text-xs flex items-center justify-center">
                    {m.initials}
                  </span>
                  <div>
                    <div className="font-bold text-[13.5px] text-[#1B2F1C]">{m.name}</div>
                    <div className="text-[12px] text-[#52604C]">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E7ECD9]">
              <button
                type="submit"
                className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {saved && <Check className="w-4 h-4" />}
                <span>{saved ? 'Enregistré avec succès !' : 'Enregistrer les coordonnées'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Appearance */}
      {activeTab === 'appearance' && (
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7ECD9] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#1B2F1C] flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#3A683D]" />
                <span>Apparence & Thème d'interface</span>
              </h2>
              <p className="text-[13px] text-[#52604C] mt-1">
                Basculez entre le thème clair officiel et le thème sombre avec ré-étalonnage automatique de la charte botanique My Vet.
              </p>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-[#F8F8F1] border border-[#C7D2BA] rounded-2xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isDark ? 'bg-[#3A683D] text-white shadow-2xs' : 'text-[#52604C] hover:text-[#1B2F1C]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Clair</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDark ? 'bg-[#3A683D] text-white shadow-2xs' : 'text-[#52604C] hover:text-[#1B2F1C]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Sombre</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                !isDark
                  ? 'border-[#3A683D] bg-white ring-4 ring-[#3A683D]/10 shadow-md'
                  : 'border-[#C7D2BA] bg-[#F8F8F1] hover:border-[#859766] opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF9E6] border border-[#FFE29A] text-amber-600 flex items-center justify-center shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-[#1B2F1C]">Thème Clair Botanique</h3>
                    <p className="text-xs text-[#52604C]">Ambiance diurne & consultations régulières</p>
                  </div>
                </div>
                {!isDark && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E7ECD9] text-[#3A683D] border border-[#859766]/50">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Actif</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52604C] leading-relaxed">
                Repose sur les teintes originelles du cabinet : fond ivoire (<code>#F8F8F1</code>), sauge pâle (
                <code>#E7ECD9</code>) et vert forêt (<code>#3A683D</code>).
              </p>
            </div>

            <div
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                isDark
                  ? 'border-[#4E8252] bg-[#18261A] ring-4 ring-[#4E8252]/20 shadow-md'
                  : 'border-[#C7D2BA] bg-[#F8F8F1] hover:border-[#859766] opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#223724] border border-[#2D4530] text-[#9FB282] flex items-center justify-center shrink-0">
                    <Moon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-[#1B2F1C]">Thème Sombre Organique</h3>
                    <p className="text-xs text-[#52604C]">Gardes de nuit, bloc chirurgical & faible luminosité</p>
                  </div>
                </div>
                {isDark && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#223724] text-[#E2ECD4] border border-[#4E8252]/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Actif</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52604C] leading-relaxed">
                Mappe les teintes de marque vers des fonds sauge nuit (<code>#111A12</code>, <code>#18261A</code>) avec texte haute lisibilité.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Non-destructive LocalStorage Migration */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#1B2F1C] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#3A683D]" />
              <span>Base de Données Supabase PostgreSQL & Migration Sûre</span>
            </h2>
            <p className="text-[13px] text-[#52604C] mt-1">
              Persistance relationnelle multi-cliniques via <code className="bg-[#E7ECD9] px-1.5 py-0.5 rounded font-mono text-xs">DATABASE_URL</code> (Supabase Postgres avec SSL & montants DZD en centimes).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-[#52604C] uppercase tracking-wider">Moteur de Stockage</span>
              <div className="text-[15px] font-bold text-[#1B2F1C] flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPgConnected ? 'bg-[#3A683D]' : 'bg-amber-500'}`}></span>
                {dbStatus?.database?.provider || 'Chargement...'}
              </div>
              <p className="text-xs text-[#52604C]">
                {isPgConnected
                  ? `Latence : ${dbStatus?.database?.latencyMs ?? 0} ms`
                  : 'En production, DATABASE_URL est strictement requis'}
              </p>
            </div>

            <div className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-[#52604C] uppercase tracking-wider">Isolation & Devise</span>
              <div className="text-[15px] font-bold text-[#3A683D] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Multi-Cabinet & DZD
              </div>
              <p className="text-xs text-[#52604C]">
                Cabinet actif : {dbStatus?.clinic || session.activeClinic?.name || '—'}
              </p>
            </div>

            <div className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-[#52604C] uppercase tracking-wider">Volume de données</span>
              <div className="text-[15px] font-bold text-[#1B2F1C]">
                {dbStatus?.database?.tables
                  ? Object.values(dbStatus.database.tables as Record<string, number>).reduce((a, b) => a + b, 0)
                  : '—'}{' '}
                enregistrements
              </div>
              <p className="text-xs text-[#52604C]">Propriétaires, animaux, factures, vaccins, SMS</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { table: 'owners', desc: 'Clients & E.164', count: dbStatus?.database?.tables?.owners },
              { table: 'animals', desc: 'Patients & fiches', count: dbStatus?.database?.tables?.animals },
              { table: 'vaccinations', desc: 'Vaccins & rappels', count: dbStatus?.database?.tables?.vaccinations },
              { table: 'appointments', desc: 'Agenda & RDV', count: dbStatus?.database?.tables?.appointments },
              { table: 'invoices', desc: 'Factures (DZD)', count: dbStatus?.database?.tables?.invoices },
              { table: 'inventory_items', desc: 'Pharmacie & stock', count: dbStatus?.database?.tables?.stocks },
              { table: 'sms_reminders', desc: 'File idempotente', count: dbStatus?.database?.tables?.smsReminders },
              { table: 'sms_logs', desc: 'Audit des envois', count: dbStatus?.database?.tables?.smsLogs },
            ].map((t) => (
              <div key={t.table} className="p-2.5 bg-white border border-[#C7D2BA] rounded-lg space-y-0.5">
                <div className="font-mono font-bold text-[#3A683D]">{t.table}</div>
                <div className="text-[#52604C]">{t.desc}</div>
                <div className="font-semibold text-[#1B2F1C] pt-1">{t.count ?? 0} enregistrements</div>
              </div>
            ))}
          </div>

          {/* Non-destructive LocalStorage Migration Inspector */}
          <div className="bg-[#E7ECD9]/60 border border-[#C7D2BA] rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <RefreshCw className={`w-5 h-5 text-[#3A683D] shrink-0 mt-0.5 ${isMigrating ? 'animate-spin' : ''}`} />
              <div className="space-y-1">
                <h4 className="font-bold text-[14px] text-[#1B2F1C]">
                  Import non destructif des anciennes données navigateur (localStorage)
                </h4>
                <p className="text-[13px] text-[#52604C]">
                  Inspecte les clés <code>vetosuite:data:v1</code> et <code>vetosuite_*</code> présentes dans votre navigateur. Vos données locales ne sont jamais effacées automatiquement.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#C7D2BA] text-xs text-[#52604C] space-y-1">
              <div>
                <strong>Données détectées dans ce navigateur :</strong>{' '}
                {legacySnapshot.hasAnyLegacyData
                  ? `${legacySnapshot.clients.length} client(s), ${legacySnapshot.patients.length} patient(s), ${legacySnapshot.appointments.length} RDV, ${legacySnapshot.tasks.length} tâche(s), ${legacySnapshot.stocks.length} article(s).`
                  : 'Aucune donnée héritée détectée dans le localStorage actuel.'}
              </div>
              {legacySnapshot.foundKeys.length > 0 && (
                <div className="font-mono text-[11px] text-[#859766]">
                  Clés trouvées : {legacySnapshot.foundKeys.join(', ')}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={downloadLegacyLocalStorageBackup}
                className="bg-white border border-[#C7D2BA] hover:bg-[#F8F8F1] text-[#1B2F1C] px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#3A683D]" />
                <span>Télécharger une sauvegarde JSON</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunMigration(true)}
                disabled={isMigrating}
                className="bg-white border border-[#3A683D] text-[#3A683D] hover:bg-[#E7ECD9] disabled:opacity-50 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Aperçu (Dry Run)
              </button>

              <button
                type="button"
                onClick={() => handleRunMigration(false)}
                disabled={isMigrating}
                className="bg-[#3A683D] hover:bg-[#2F5933] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>{isMigrating ? 'Migration en cours...' : 'Migrer vers PostgreSQL'}</span>
              </button>
            </div>

            {migrationResult && (
              <div className="p-3.5 bg-white border border-[#C7D2BA] rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-[#3A683D] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>
                    {migrationResult.dryRun
                      ? 'Simulation (Dry Run) — aucune écriture effectuée'
                      : migrationResult.alreadyImported
                      ? 'Lot déjà importé précédemment (idempotent)'
                      : 'Migration terminée avec succès'}
                  </span>
                </div>
                <div className="text-[#52604C]">
                  Propriétaires : +{migrationResult.summary.importedOwners} ({migrationResult.summary.skippedOwners} ignorés) |
                  Animaux : +{migrationResult.summary.importedAnimals} |
                  RDV : +{migrationResult.summary.importedAppointments} |
                  Stocks : +{migrationResult.summary.importedStocks} |
                  Factures : +{migrationResult.summary.importedInvoices}
                </div>
                {migrationResult.warnings.length > 0 && (
                  <div className="text-amber-700 pt-1">
                    Avertissements : {migrationResult.warnings.join(' · ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: SMS Gateway & Vercel Cron */}
      {activeTab === 'sms' && (
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-6">
          <form onSubmit={handleSaveSms} className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E7ECD9] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#3A683D]" />
                <h3 className="text-[16px] font-bold text-[#1B2F1C]">
                  Configuration Passerelle SMS & Télécoms Algérie
                </h3>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  smsConfig.provider_mode === 'TEST'
                    ? 'bg-[#E7ECD9] text-[#3A683D] border border-[#C7D2BA]'
                    : 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                }`}
              >
                {smsConfig.provider_mode === 'TEST' ? 'MODE TEST SIMULÉ (Sans surcoût)' : 'PRODUCTION RÉELLE'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                  Opérateur / Passerelle SMS
                </label>
                <select
                  value={smsConfig.active_provider}
                  onChange={(e) => setSmsConfig({ ...smsConfig, active_provider: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
                >
                  <option value="Ooredoo_Business_Algeria">Ooredoo Business Algérie (SMS Pro 05)</option>
                  <option value="Mobilis_Entreprise">Mobilis Entreprise (ATM Mobilis 06)</option>
                  <option value="Djezzy_Enterprise">Djezzy Enterprise (OTA 07)</option>
                  <option value="Direct_Gateway_Algeria">Passerelle Agrégateur National Algérie</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Mode Opératoire</label>
                <select
                  value={smsConfig.provider_mode}
                  onChange={(e) => setSmsConfig({ ...smsConfig, provider_mode: e.target.value as 'TEST' | 'PRODUCTION' })}
                  className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
                >
                  <option value="TEST">Mode Test Sécurisé (Journalisation intégrale, pas de facturation)</option>
                  <option value="PRODUCTION">Mode Production (Envoi réel par API opérateur avec contrat)</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                  Plage horaire d'envoi légale (Algérie UTC+1)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={smsConfig.sending_start_hour}
                    onChange={(e) => setSmsConfig({ ...smsConfig, sending_start_hour: parseInt(e.target.value, 10) || 8 })}
                    className="w-20 px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl text-center"
                  />
                  <span className="text-sm text-[#52604C]">h00 à</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={smsConfig.sending_end_hour}
                    onChange={(e) => setSmsConfig({ ...smsConfig, sending_end_hour: parseInt(e.target.value, 10) || 20 })}
                    className="w-20 px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl text-center"
                  />
                  <span className="text-sm text-[#52604C]">h00</span>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                  Échéances des rappels vaccinaux
                </label>
                <input
                  type="text"
                  value={smsConfig.vaccination_intervals}
                  onChange={(e) => setSmsConfig({ ...smsConfig, vaccination_intervals: e.target.value })}
                  placeholder="7,3,1"
                  className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#3A683D]" />
                  <h4 className="font-bold text-[14.5px] text-[#1B2F1C]">
                    Ordonnancement Serverless Vercel Cron & Verrouillage PostgreSQL
                  </h4>
                </div>
                <span className="text-xs font-mono bg-[#E7ECD9] text-[#1B2F1C] px-2.5 py-1 rounded-md font-semibold">
                  POST /api/cron/process-reminders
                </span>
              </div>

              <p className="text-[13px] text-[#52604C]">
                Architecture serverless compatible Vercel Cron (<code className="text-xs font-mono">vercel.json</code>) avec authentification par{' '}
                <code className="text-xs font-mono">CRON_SECRET</code> et verrouillage atomique PostgreSQL{' '}
                <code className="text-xs font-mono">FOR UPDATE SKIP LOCKED</code> pour éviter tout doublon d'envoi.
              </p>

              <button
                type="button"
                onClick={handleTriggerCron}
                disabled={isTriggeringCron}
                className="bg-[#3A683D] hover:bg-[#2F5933] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Send className="w-4 h-4" />
                <span>{isTriggeringCron ? 'Traitement de la file...' : 'Tester manuellement le Cron des rappels'}</span>
              </button>

              {cronResult && (
                <div className="p-3 bg-white border border-[#C7D2BA] rounded-lg text-xs font-mono space-y-1">
                  <div className="font-bold text-[#3A683D]">Rapport d'exécution Cron :</div>
                  <div>
                    Réclamés: {cronResult.results?.claimed || 0} | Traités: {cronResult.results?.processed || 0} |
                    Envoyés: {cronResult.results?.sent || 0} | Différés: {cronResult.results?.deferred || 0}
                  </div>
                  {cronResult.message && <div className="text-[#52604C]">{cronResult.message}</div>}
                </div>
              )}
            </div>

            <div className="border border-[#C7D2BA] rounded-xl p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-[14px] text-[#1B2F1C] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#3A683D]" />
                  Simulateur & Analyseur de Segmentation GSM-7
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      testCalc.encoding === 'GSM-7' ? 'bg-[#E7ECD9] text-[#3A683D]' : 'bg-[#DC2626]/10 text-[#DC2626]'
                    }`}
                  >
                    {testCalc.encoding}
                  </span>
                  <span className="font-semibold text-[#1B2F1C]">
                    {testCalc.segments} SMS ({testCalc.charCount} caractères)
                  </span>
                </div>
              </div>

              <textarea
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full p-3 text-[13.5px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none font-mono"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#52604C]">
                <div>Encodage : <b className="text-[#1B2F1C]">{testCalc.encoding}</b></div>
                <div>Segments : <b className="text-[#1B2F1C]">{testCalc.segments}</b></div>
                <div>Caractères restants : <b className="text-[#1B2F1C]">{testCalc.remainingInSegment}</b></div>
                <div>Max par segment : <b className="text-[#1B2F1C]">{testCalc.maxPerSegment}</b></div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E7ECD9]">
              <button
                type="submit"
                className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {saved && <Check className="w-4 h-4" />}
                <span>{saved ? 'Configuration enregistrée !' : 'Enregistrer la configuration SMS'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

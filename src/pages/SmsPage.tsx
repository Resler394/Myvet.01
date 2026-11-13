import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Clock,
  History,
  FileText,
  Settings,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Smartphone,
  Calendar,
  X,
  Sparkles,
  Info,
  CheckCheck,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { calculateClientSmsSegments } from '../utils/smsCalc';
import { formatAlgerianPhone } from '../utils/phoneUtils';
import { Modal } from '../components/common/Modal';
import { api, ApiError } from '../services/apiClient';
import { useClinicData } from '../context/DataContext';
import type { SmsConfig, SmsLog, SmsReminder, SmsTemplate } from '../types';

type TabType = 'overview' | 'scheduled' | 'history' | 'templates' | 'settings';

function safeParseJson(raw?: string | null): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export const SmsPage: React.FC = () => {
  const { clients } = useClinicData();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration
  const [config, setConfig] = useState<SmsConfig>({
    id: 'default',
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

  // Scheduled Queue
  const [reminders, setReminders] = useState<SmsReminder[]>([]);
  const [reminderFilter, setReminderFilter] = useState<'ALL' | 'Scheduled' | 'Sent' | 'Failed'>('ALL');

  // Real Logs from Backend
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'Delivered' | 'Sent' | 'Failed'>('ALL');
  const [selectedLogPayload, setSelectedLogPayload] = useState<SmsLog | null>(null);

  // Templates
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'VACCINATION' | 'APPOINTMENT' | 'POST_OP' | 'URGENCE'>('VACCINATION');

  // Manual Compose Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRecipient, setManualRecipient] = useState('0555555555');
  const [manualName, setManualName] = useState('Fatima Fatima');
  const [manualAnimal, setManualAnimal] = useState('Nina');
  const [manualMessage, setManualMessage] = useState(
    "Cabinet My Vet: Rappel pour la visite de Nina au cabinet d'Ouled Fayet. Tel: 0797 63 87 04."
  );
  const [isSendingManual, setIsSendingManual] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [cfgData, queueData, logsData, tplData] = await Promise.all([
        api.get<SmsConfig>('/api/sms/config'),
        api.get<SmsReminder[]>('/api/sms/reminders'),
        api.get<SmsLog[]>('/api/sms/history'),
        api.get<SmsTemplate[]>('/api/sms/templates'),
      ]);

      if (cfgData && cfgData.active_provider) {
        setConfig(cfgData);
      }
      if (Array.isArray(queueData)) {
        setReminders(queueData);
      }
      if (Array.isArray(logsData)) {
        setLogs(logsData);
      }
      if (Array.isArray(tplData) && tplData.length > 0) {
        setTemplates(tplData);
        setSelectedTemplate((prev) => {
          if (prev) {
            const match = tplData.find((t) => t.id === prev.id);
            if (match) return match;
          }
          setTemplateTitle(tplData[0].title);
          setTemplateContent(tplData[0].content);
          setTemplateCategory(tplData[0].category);
          return tplData[0];
        });
      }
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur de chargement du module SMS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger Cron reminder processor
  const handleTriggerScheduler = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.post<{ results?: { sent?: number; claimed?: number; deferred?: number; failed?: number } }>(
        '/api/cron/process-reminders',
        { bypassWindow: true }
      );
      setStatusMessage(
        `Planificateur exécuté : ${data.results?.sent || 0} envoyé(s), ${data.results?.deferred || 0} différé(s), ${data.results?.failed || 0} échec(s).`
      );
      await fetchData();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : "Erreur d'exécution du planificateur.");
    } finally {
      setLoading(false);
    }
  };

  // Real instant dispatch of a scheduled reminder
  const handleSendReminderNow = async (reminder: SmsReminder) => {
    setErrorMessage(null);
    try {
      const res = await api.post<{ isSimulated?: boolean }>(`/api/sms/send-now/${encodeURIComponent(reminder.id)}`);
      setStatusMessage(
        res.isSimulated
          ? `Rappel envoyé à ${reminder.owner_name} (Mode Test simulé sans coût).`
          : `Rappel transmis via passerelle opérateur à ${reminder.owner_name}.`
      );
      await fetchData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : "Impossible d'envoyer ce rappel.");
    }
  };

  // Real cancellation of a scheduled reminder
  const handleCancelReminder = async (id: string) => {
    setErrorMessage(null);
    try {
      await api.post(`/api/sms/cancel/${encodeURIComponent(id)}`);
      setStatusMessage('Rappel annulé avec succès.');
      await fetchData();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : "Impossible d'annuler le rappel.");
    }
  };

  // Retry failed reminder
  const handleRetryReminder = async (id: string) => {
    setErrorMessage(null);
    try {
      await api.post(`/api/sms/retry/${encodeURIComponent(id)}`);
      setStatusMessage('Rappel replanifié pour un nouvel envoi.');
      await fetchData();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Impossible de relancer ce rappel.');
    }
  };

  // Manual SMS send via real POST /api/sms/test
  const handleSendManualSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingManual(true);
    setErrorMessage(null);
    try {
      const res = await api.post<{ phone?: { e164?: string }; isSimulated?: boolean }>('/api/sms/test', {
        phone: manualRecipient,
        recipientName: manualName,
        animalName: manualAnimal,
        category: 'MANUAL',
        message: manualMessage,
      });
      setIsManualModalOpen(false);
      setStatusMessage(
        `SMS envoyé à ${manualName} (${res.phone?.e164 || manualRecipient})${
          res.isSimulated ? ' — Mode Test simulé' : ''
        }`
      );
      await fetchData();
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de l’envoi du SMS.');
    } finally {
      setIsSendingManual(false);
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateTitle.trim() || !templateContent.trim()) return;
    setErrorMessage(null);
    try {
      await api.post('/api/sms/templates', {
        id: selectedTemplate?.id,
        category: templateCategory,
        title: templateTitle.trim(),
        content: templateContent.trim(),
        language: 'fr',
      });
      setStatusMessage('Modèle de message enregistré en base de données.');
      await fetchData();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de l’enregistrement du modèle.');
    }
  };

  // Save config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const updated = await api.put<SmsConfig>('/api/sms/config', {
        provider_mode: config.provider_mode,
        active_provider: config.active_provider,
        enable_vaccination_reminders: config.enable_vaccination_reminders,
        vaccination_intervals: config.vaccination_intervals,
        enable_appointment_reminders: config.enable_appointment_reminders,
        appointment_interval_hours: config.appointment_interval_hours,
        sending_start_hour: config.sending_start_hour,
        sending_end_hour: config.sending_end_hour,
        timezone: config.timezone,
      });
      setConfig(updated);
      setStatusMessage('Configuration de la passerelle SMS enregistrée.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Impossible d’enregistrer la configuration SMS.');
    }
  };

  const handleInsertTag = (tag: string) => {
    setTemplateContent((prev) => prev + ` ${tag}`);
  };

  const templateCalc = calculateClientSmsSegments(templateContent);
  const manualCalc = calculateClientSmsSegments(manualMessage);

  const filteredReminders = reminders.filter((r) => {
    if (reminderFilter === 'Scheduled') return r.status === 'Scheduled';
    if (reminderFilter === 'Sent') return r.status === 'Sent' || r.status === 'Delivered';
    if (reminderFilter === 'Failed') return r.status === 'Failed';
    return true;
  });

  const getLogStatusCategory = (status: string): 'Delivered' | 'Sent' | 'Failed' => {
    const s = (status || '').toLowerCase();
    if (s.includes('fail') || s.includes('echec') || s.includes('échec') || s.includes('err') || s.includes('cancel')) {
      return 'Failed';
    }
    if (s.includes('deliver') || s.includes('livr') || s.includes('délivr')) {
      return 'Delivered';
    }
    return 'Sent';
  };

  const countDelivered = logs.filter((l) => getLogStatusCategory(l.status) === 'Delivered').length;
  const countSent = logs.filter((l) => getLogStatusCategory(l.status) === 'Sent').length;
  const countFailed = logs.filter((l) => getLogStatusCategory(l.status) === 'Failed').length;

  const deliverabilityRate =
    logs.length === 0 ? null : Math.round(((countDelivered + countSent) / logs.length) * 100);

  // Real Algerian mobile carrier distribution from registered clinic clients
  const carrierCounts = { Ooredoo: 0, Mobilis: 0, Djezzy: 0 };
  for (const c of clients) {
    const { carrier } = formatAlgerianPhone(c.phone);
    if (carrier === 'Ooredoo') carrierCounts.Ooredoo += 1;
    else if (carrier === 'Mobilis') carrierCounts.Mobilis += 1;
    else if (carrier === 'Djezzy') carrierCounts.Djezzy += 1;
  }
  const carrierTotal = carrierCounts.Ooredoo + carrierCounts.Mobilis + carrierCounts.Djezzy;
  const carrierPct = {
    Ooredoo: carrierTotal ? Math.round((carrierCounts.Ooredoo / carrierTotal) * 100) : 0,
    Mobilis: carrierTotal ? Math.round((carrierCounts.Mobilis / carrierTotal) * 100) : 0,
    Djezzy: carrierTotal ? Math.round((carrierCounts.Djezzy / carrierTotal) * 100) : 0,
  };

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.recipient_name.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.recipient_phone.includes(logSearch) ||
      l.message_content.toLowerCase().includes(logSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (logStatusFilter === 'ALL') return true;
    return getLogStatusCategory(l.status) === logStatusFilter;
  });

  const renderLogStatusBadge = (status: string, compact = false) => {
    const category = getLogStatusCategory(status);

    if (category === 'Delivered') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all shadow-2xs ${
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
          } bg-[#E7ECD9] text-[#1B2F1C] border border-[#859766]/50`}
          title="SMS accusé réceptionné par le destinataire (Delivered)"
        >
          <CheckCheck className="w-3.5 h-3.5 text-[#3A683D] shrink-0" />
          <span>Délivré</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3A683D] shrink-0" />
        </span>
      );
    }

    if (category === 'Failed') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all shadow-2xs ${
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
          } bg-[#FDF2F0] text-[#7A1E1F] border border-[#E8B4B8]`}
          title="Échec de transmission ou numéro injoignable (Failed)"
        >
          <XCircle className="w-3.5 h-3.5 text-[#9E2A2B] shrink-0" />
          <span>Échec</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#9E2A2B] shrink-0" />
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all shadow-2xs ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        } bg-[#F8F8F1] text-[#1B2F1C] border border-[#C7D2BA]`}
        title="SMS transmis à la passerelle opérateur télécom (Sent)"
      >
        <Send className="w-3.5 h-3.5 text-[#3A683D] shrink-0" />
        <span>Envoyé</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#859766] shrink-0" />
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[24px] sm:text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              SMS & Notifications Automatisées
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Passerelle de rappels vétérinaires, conformité E.164 Algérie et suivi de livraison en temps réel
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleTriggerScheduler}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-[#C7D2BA] bg-white hover:bg-[#F8F8F1] text-[#1B2F1C] font-semibold text-[13px] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Exécute la vérification automatique des rappels dus"
          >
            <RefreshCw className={`w-4 h-4 text-[#3A683D] ${loading ? 'animate-spin' : ''}`} />
            <span>Exécuter planificateur</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Rédiger un SMS</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#E8B4B8] text-[#7A1E1F] text-[13.5px] font-medium flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-[#E7ECD9] border border-[#859766] text-[#1B2F1C] text-[13.5px] font-medium flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#3A683D] shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[#52604C] hover:text-[#1B2F1C] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode Badge Banner */}
      <div className="p-4 rounded-2xl bg-white border border-[#C7D2BA] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#E7ECD9] text-[#3A683D] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[14px] text-[#1B2F1C]">Mode Passerelle :</span>
              {config.provider_mode === 'PRODUCTION' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#3A683D] text-white">
                  MODE PRODUCTION ACTIF
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7ECD9] text-[#3A683D] border border-[#859766]">
                  MODE TEST SIMULÉ (Sans surcoût télécom)
                </span>
              )}
              <span className="text-xs text-[#52604C]">
                Opérateur cible : <strong className="text-[#1B2F1C]">{config.active_provider.replace(/_/g, ' ')}</strong>
              </span>
            </div>
            <p className="text-xs text-[#52604C] mt-0.5">
              {config.provider_mode === 'PRODUCTION'
                ? config.api_key_configured
                  ? 'Passerelle API configurée et prête pour l’envoi réel (+213).'
                  : 'Mode Production sélectionné — veuillez configurer SMS_API_URL et SMS_API_KEY côté serveur.'
                : 'Les messages sont validés selon les normes GSM-7 / E.164 Algérie (+213) et simulés sans facturation réelle.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#52604C] shrink-0 bg-[#F8F8F1] px-3 py-2 rounded-xl border border-[#C7D2BA]">
          <Clock className="w-4 h-4 text-[#859766]" />
          <span>
            Horaires autorisés : <strong className="text-[#1B2F1C]">{config.sending_start_hour}h00 – {config.sending_end_hour}h00</strong> (Alger, UTC+1)
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#C7D2BA] overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#3A683D] text-white shadow-xs'
              : 'text-[#52604C] hover:bg-[#E7ECD9] hover:text-[#1B2F1C]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Vue d'ensemble</span>
        </button>

        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'scheduled'
              ? 'bg-[#3A683D] text-white shadow-xs'
              : 'text-[#52604C] hover:bg-[#E7ECD9] hover:text-[#1B2F1C]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. Rappels planifiés</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-[#E7ECD9] text-[#1B2F1C]'}`}>
            {reminders.filter((r) => r.status === 'Scheduled').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#3A683D] text-white shadow-xs'
              : 'text-[#52604C] hover:bg-[#E7ECD9] hover:text-[#1B2F1C]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>3. Historique SMS</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-[#E7ECD9] text-[#1B2F1C]'}`}>
            {logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-[#3A683D] text-white shadow-xs'
              : 'text-[#52604C] hover:bg-[#E7ECD9] hover:text-[#1B2F1C]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Modèles de messages</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#3A683D] text-white shadow-xs'
              : 'text-[#52604C] hover:bg-[#E7ECD9] hover:text-[#1B2F1C]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>5. Paramètres & Abonnement</span>
        </button>
      </div>

      {/* 1. VUE D'ENSEMBLE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#C7D2BA] shadow-2xs">
              <span className="text-[13px] font-medium text-[#52604C]">SMS traités / journalisés</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-[#1B2F1C]">{logs.length}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E7ECD9] text-[#3A683D]">
                  Total à ce jour
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#C7D2BA] shadow-2xs">
              <span className="text-[13px] font-medium text-[#52604C]">Rappels en attente</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-[#3A683D]">
                  {reminders.filter((r) => r.status === 'Scheduled').length}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F8F8F1] text-[#859766] border border-[#C7D2BA]">
                  File idempotente
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#C7D2BA] shadow-2xs">
              <span className="text-[13px] font-medium text-[#52604C]">Taux de succès</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-[#1B2F1C]">
                  {deliverabilityRate === null ? '—' : `${deliverabilityRate}%`}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E7ECD9] text-[#3A683D]">
                  {countFailed} échec{countFailed > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#C7D2BA] shadow-2xs">
              <span className="text-[13px] font-medium text-[#52604C]">Passerelle active</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold text-[#1B2F1C] truncate">
                  {config.provider_mode === 'PRODUCTION' ? 'API Réelle' : 'Simulateur'}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E7ECD9] text-[#3A683D]">
                  {config.provider_mode === 'PRODUCTION' ? 'Production' : 'Mode Test'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
              <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#3A683D]" />
                <span>Opérateurs Mobiles Clients</span>
              </h2>
              <p className="text-xs text-[#52604C]">
                Répartition calculée en direct depuis la base propriétaires (+213) :
              </p>

              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1B2F1C] mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ED1C24]" />
                      Ooredoo (05xx) — {carrierCounts.Ooredoo}
                    </span>
                    <span>{carrierPct.Ooredoo}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#F8F8F1] rounded-full overflow-hidden border border-[#C7D2BA]">
                    <div className="h-full bg-[#ED1C24] rounded-full" style={{ width: `${carrierPct.Ooredoo}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1B2F1C] mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#008A3B]" />
                      Mobilis (06xx) — {carrierCounts.Mobilis}
                    </span>
                    <span>{carrierPct.Mobilis}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#F8F8F1] rounded-full overflow-hidden border border-[#C7D2BA]">
                    <div className="h-full bg-[#008A3B] rounded-full" style={{ width: `${carrierPct.Mobilis}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1B2F1C] mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F58220]" />
                      Djezzy (07xx) — {carrierCounts.Djezzy}
                    </span>
                    <span>{carrierPct.Djezzy}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#F8F8F1] rounded-full overflow-hidden border border-[#C7D2BA]">
                    <div className="h-full bg-[#F58220] rounded-full" style={{ width: `${carrierPct.Djezzy}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E7ECD9] text-[11px] text-[#52604C] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#859766] shrink-0" />
                <span>Formatage automatique E.164 (+213) avant toute transmission.</span>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#3A683D]" />
                  <span>Prochains rappels automatiques programmés</span>
                </h2>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className="text-xs font-bold text-[#3A683D] hover:underline cursor-pointer"
                >
                  Voir toute la file &rarr;
                </button>
              </div>

              <div className="divide-y divide-[#E7ECD9]">
                {reminders.slice(0, 4).map((rem) => (
                  <div key={rem.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#1B2F1C]">{rem.owner_name}</span>
                        <span className="text-xs text-[#52604C]">({rem.animal_name})</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[#E7ECD9] text-[#3A683D] font-medium">
                          {rem.reminder_type}
                        </span>
                      </div>
                      <p className="text-xs text-[#52604C]">
                        Numéro : <strong className="text-[#1B2F1C]">{rem.owner_phone}</strong> &bull; Programmé :{' '}
                        {new Date(rem.scheduled_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          rem.status === 'Sent' || rem.status === 'Delivered'
                            ? 'bg-[#E7ECD9] text-[#3A683D]'
                            : rem.status === 'Failed'
                            ? 'bg-[#FDF2F0] text-[#9E2A2B]'
                            : 'bg-[#F8F8F1] text-[#859766] border border-[#C7D2BA]'
                        }`}
                      >
                        {rem.status}
                      </span>
                      {rem.status === 'Scheduled' && (
                        <button
                          onClick={() => handleSendReminderNow(rem)}
                          className="px-3 py-1 bg-[#3A683D] hover:bg-[#2F5933] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                        >
                          Envoyer
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {reminders.length === 0 && (
                  <p className="py-6 text-center text-xs text-[#52604C]">
                    Aucun rappel dans la file d'attente actuellement.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RAPPELS PLANIFIÉS */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#C7D2BA] shadow-2xs flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#52604C]">Filtrer par statut :</span>
              {(['ALL', 'Scheduled', 'Sent', 'Failed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReminderFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    reminderFilter === f
                      ? 'bg-[#3A683D] text-white'
                      : 'bg-[#F8F8F1] text-[#52604C] hover:bg-[#E7ECD9]'
                  }`}
                >
                  {f === 'ALL'
                    ? `Tous (${reminders.length})`
                    : f === 'Scheduled'
                    ? `En attente (${reminders.filter((r) => r.status === 'Scheduled').length})`
                    : f === 'Sent'
                    ? `Envoyés (${reminders.filter((r) => r.status === 'Sent' || r.status === 'Delivered').length})`
                    : `Échecs (${reminders.filter((r) => r.status === 'Failed').length})`}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Envoyer un SMS manuel</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#C7D2BA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F8F1] border-b border-[#C7D2BA] text-[12px] font-bold text-[#52604C] uppercase tracking-wider">
                    <th className="py-3 px-4">Destinataire</th>
                    <th className="py-3 px-4">Animal</th>
                    <th className="py-3 px-4">Type de rappel</th>
                    <th className="py-3 px-4">Date programmée</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECD9] text-[13px]">
                  {filteredReminders.map((r) => {
                    const phoneData = formatAlgerianPhone(r.owner_phone || r.phone_normalized || '');
                    return (
                      <tr key={r.id} className="hover:bg-[#F8F8F1]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1B2F1C]">{r.owner_name}</div>
                          <div className="text-xs text-[#52604C] flex items-center gap-1.5 mt-0.5">
                            <span>{r.owner_phone}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#E7ECD9] text-[#3A683D]">
                              {phoneData.carrier}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1B2F1C] flex items-center gap-1.5">
                            <span>{r.species === 'Chien' ? '🐶' : '🐱'}</span>
                            <span>{r.animal_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#E7ECD9] text-[#3A683D] border border-[#859766]/30">
                            {r.reminder_type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[#52604C]">
                          {new Date(r.scheduled_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              r.status === 'Sent' || r.status === 'Delivered'
                                ? 'bg-[#E7ECD9] text-[#3A683D]'
                                : r.status === 'Scheduled'
                                ? 'bg-[#FFF8E7] text-[#B7791F]'
                                : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {(r.status === 'Sent' || r.status === 'Delivered') && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {r.status === 'Scheduled' && <Clock className="w-3.5 h-3.5" />}
                            {r.status}
                          </span>
                          {r.last_error && <div className="text-[11px] text-red-600 mt-0.5">{r.last_error}</div>}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {r.status === 'Scheduled' && (
                              <>
                                <button
                                  onClick={() => handleSendReminderNow(r)}
                                  className="px-2.5 py-1 bg-[#3A683D] hover:bg-[#2F5933] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                                >
                                  Envoyer maintenant
                                </button>
                                <button
                                  onClick={() => handleCancelReminder(r.id)}
                                  className="px-2 py-1 bg-[#F8F8F1] hover:bg-red-50 text-red-600 border border-[#C7D2BA] rounded-lg text-xs font-medium cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </>
                            )}
                            {r.status === 'Failed' && (
                              <button
                                onClick={() => handleRetryReminder(r.id)}
                                className="px-2.5 py-1 bg-[#E7ECD9] hover:bg-[#D5DFC1] text-[#3A683D] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Relancer</span>
                              </button>
                            )}
                            {(r.status === 'Sent' || r.status === 'Delivered') && (
                              <span className="text-xs text-[#859766] italic">
                                {r.is_simulated ? 'Livré (Simulé)' : 'Transmis'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredReminders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#52604C] text-xs">
                        Aucun rappel ne correspond au filtre sélectionné.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. HISTORIQUE SMS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setLogStatusFilter('ALL')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                logStatusFilter === 'ALL'
                  ? 'bg-white border-[#3A683D] shadow-xs ring-2 ring-[#3A683D]/20'
                  : 'bg-white/80 border-[#C7D2BA] hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#52604C]">Total archivés</span>
                <History className="w-4 h-4 text-[#859766]" />
              </div>
              <div className="mt-1 text-2xl font-bold text-[#1B2F1C]">{logs.length}</div>
              <div className="text-[11px] text-[#52604C] mt-0.5">Tous les flux SMS</div>
            </button>

            <button
              type="button"
              onClick={() => setLogStatusFilter('Delivered')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                logStatusFilter === 'Delivered'
                  ? 'bg-[#E7ECD9] border-[#3A683D] shadow-xs ring-2 ring-[#3A683D]/20'
                  : 'bg-white/80 border-[#C7D2BA] hover:bg-[#E7ECD9]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B2F1C]">Délivrés</span>
                <CheckCheck className="w-4 h-4 text-[#3A683D]" />
              </div>
              <div className="mt-1 text-2xl font-bold text-[#3A683D]">{countDelivered}</div>
              <div className="text-[11px] text-[#3A683D] font-medium mt-0.5">Accusés reçus</div>
            </button>

            <button
              type="button"
              onClick={() => setLogStatusFilter('Sent')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                logStatusFilter === 'Sent'
                  ? 'bg-[#F8F8F1] border-[#3A683D] shadow-xs ring-2 ring-[#3A683D]/20'
                  : 'bg-white/80 border-[#C7D2BA] hover:bg-[#F8F8F1]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B2F1C]">Envoyés</span>
                <Send className="w-4 h-4 text-[#3A683D]" />
              </div>
              <div className="mt-1 text-2xl font-bold text-[#1B2F1C]">{countSent}</div>
              <div className="text-[11px] text-[#52604C] mt-0.5">En acheminement</div>
            </button>

            <button
              type="button"
              onClick={() => setLogStatusFilter('Failed')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                logStatusFilter === 'Failed'
                  ? 'bg-[#FDF2F0] border-[#9E2A2B] shadow-xs ring-2 ring-[#9E2A2B]/20'
                  : 'bg-white/80 border-[#C7D2BA] hover:bg-[#FDF2F0]/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7A1E1F]">Échecs</span>
                <XCircle className="w-4 h-4 text-[#9E2A2B]" />
              </div>
              <div className="mt-1 text-2xl font-bold text-[#9E2A2B]">{countFailed}</div>
              <div className="text-[11px] text-[#7A1E1F] mt-0.5">Non distribués</div>
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#C7D2BA] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Rechercher par destinataire, téléphone (+213), mot-clé..."
                className="w-full px-4 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-sm focus:outline-none focus:border-[#3A683D] focus:bg-white text-[#1B2F1C]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setLogStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logStatusFilter === 'ALL'
                    ? 'bg-[#3A683D] text-[#F8F8F1] shadow-2xs'
                    : 'bg-[#F8F8F1] text-[#52604C] hover:bg-[#E7ECD9] border border-[#C7D2BA]'
                }`}
              >
                Tous ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogStatusFilter('Delivered')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logStatusFilter === 'Delivered'
                    ? 'bg-[#E7ECD9] text-[#1B2F1C] border border-[#3A683D] ring-2 ring-[#3A683D]/20 shadow-2xs'
                    : 'bg-[#F8F8F1] text-[#1B2F1C] hover:bg-[#E7ECD9] border border-[#C7D2BA]'
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#3A683D]" />
                <span>Délivrés ({countDelivered})</span>
              </button>
              <button
                type="button"
                onClick={() => setLogStatusFilter('Sent')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logStatusFilter === 'Sent'
                    ? 'bg-[#F8F8F1] text-[#1B2F1C] border border-[#3A683D] ring-2 ring-[#3A683D]/20 shadow-2xs'
                    : 'bg-[#F8F8F1] text-[#52604C] hover:bg-[#E7ECD9] border border-[#C7D2BA]'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-[#3A683D]" />
                <span>Envoyés ({countSent})</span>
              </button>
              <button
                type="button"
                onClick={() => setLogStatusFilter('Failed')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logStatusFilter === 'Failed'
                    ? 'bg-[#FDF2F0] text-[#7A1E1F] border border-[#9E2A2B] ring-2 ring-[#9E2A2B]/20 shadow-2xs'
                    : 'bg-[#F8F8F1] text-[#52604C] hover:bg-[#FDF2F0] border border-[#C7D2BA]'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-[#9E2A2B]" />
                <span>Échecs ({countFailed})</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#C7D2BA] shadow-2xs overflow-hidden divide-y divide-[#E7ECD9]">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-[#F8F8F1]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[14px] text-[#1B2F1C]">{log.recipient_name}</span>
                    <span className="text-xs font-mono text-[#52604C] bg-[#F8F8F1] px-2 py-0.5 rounded border border-[#C7D2BA]">
                      {log.recipient_phone}
                    </span>
                    {log.animal_name && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#E7ECD9] text-[#3A683D] font-medium">
                        Patient : {log.animal_name}
                      </span>
                    )}
                    <span className="text-[11px] text-[#859766]">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <p className="text-[13px] text-[#1B2F1C] bg-[#F8F8F1] p-2.5 rounded-xl border border-[#E7ECD9] font-mono leading-relaxed">
                    {log.message_content}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-[#52604C] flex-wrap">
                    <span>Format : <strong className="text-[#1B2F1C]">{log.encoding}</strong></span>
                    <span>&bull;</span>
                    <span>Segments : <strong className="text-[#3A683D]">{log.segment_count} SMS</strong></span>
                    {log.category && (
                      <>
                        <span>&bull;</span>
                        <span className="text-[11px] px-2 py-0.2 rounded bg-[#E7ECD9] text-[#3A683D] font-medium">
                          {log.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0">
                  {renderLogStatusBadge(log.status)}
                  {log.provider_response && (
                    <button
                      onClick={() => setSelectedLogPayload(log)}
                      className="text-xs text-[#3A683D] hover:underline cursor-pointer font-medium"
                    >
                      Détails payload &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-[#52604C] text-xs">
                Aucun log ne correspond à votre recherche ou au statut sélectionné.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODÈLES DE MESSAGES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
            <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#3A683D]" />
              <span>Modèles enregistrés</span>
            </h2>

            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t);
                    setTemplateTitle(t.title);
                    setTemplateContent(t.content);
                    setTemplateCategory(t.category);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedTemplate?.id === t.id
                      ? 'bg-[#E7ECD9] border-[#3A683D] shadow-2xs'
                      : 'border-[#C7D2BA] hover:bg-[#F8F8F1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1B2F1C] truncate">{t.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-[#3A683D] border border-[#C7D2BA]">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#52604C] line-clamp-2 mt-1">{t.content}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setSelectedTemplate(null);
                setTemplateTitle('Nouveau modèle');
                setTemplateContent('Cabinet My Vet: Bonjour {proprietaire}, rappel pour {animal}...');
                setTemplateCategory('VACCINATION');
              }}
              className="w-full py-2 border border-dashed border-[#859766] hover:bg-[#F8F8F1] text-[#3A683D] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un autre modèle</span>
            </button>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3A683D]" />
                <span>Éditeur de Modèle SMS</span>
              </h2>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52604C]">Catégorie :</span>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#F8F8F1] border border-[#C7D2BA] rounded-lg text-xs font-bold text-[#1B2F1C]"
                >
                  <option value="VACCINATION">Vaccination</option>
                  <option value="APPOINTMENT">Rendez-vous</option>
                  <option value="POST_OP">Post-Opératoire</option>
                  <option value="URGENCE">Urgence</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#52604C] mb-1">Titre du modèle</label>
              <input
                type="text"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-sm font-semibold text-[#1B2F1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#52604C] mb-1.5">
                Balises dynamiques disponibles (Cliquez pour insérer) :
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['{proprietaire}', '{animal}', '{date}', '{heure}', '{vaccin}', '{cabinet}', '{telephone_cabinet}'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2.5 py-1 rounded-lg bg-[#E7ECD9] hover:bg-[#859766] hover:text-white text-[#1B2F1C] text-xs font-mono font-semibold transition-colors cursor-pointer border border-[#C7D2BA]"
                    >
                      + {tag}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#52604C]">Texte du SMS</label>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${templateCalc.containsUnicode ? 'text-amber-600' : 'text-[#3A683D]'}`}>
                    {templateCalc.encoding}
                  </span>
                  <span>&bull;</span>
                  <span>{templateCalc.characterCount} caractères</span>
                  <span>&bull;</span>
                  <span className="font-bold text-[#1B2F1C]">{templateCalc.segmentCount} SMS</span>
                </div>
              </div>

              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={4}
                className="w-full p-3 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-sm font-mono focus:outline-none focus:border-[#3A683D] focus:bg-white text-[#1B2F1C]"
              />

              <div className="flex items-center justify-between mt-1 text-xs text-[#52604C]">
                <span>
                  Caractères restants dans le segment actuel : <strong>{templateCalc.remainingInCurrentSegment}</strong>
                </span>
                {templateCalc.containsUnicode && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Caractère non-GSM détecté (limite 70 car./SMS)
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#F8F8F1] p-4 rounded-xl border border-[#C7D2BA] space-y-2">
              <span className="text-xs font-bold text-[#52604C] uppercase tracking-wider">
                Aperçu avec variables de démonstration (Nina & Fatima) :
              </span>
              <p className="text-xs text-[#1B2F1C] font-mono leading-relaxed bg-white p-3 rounded-lg border border-[#C7D2BA]">
                {templateContent
                  .replace(/{proprietaire}/gi, 'Fatima Fatima')
                  .replace(/{animal}/gi, 'Nina')
                  .replace(/{date}/gi, '14/08/2026')
                  .replace(/{heure}/gi, '09:00')
                  .replace(/{vaccin}/gi, 'Vaccination annuelle')
                  .replace(/{cabinet}/gi, 'Cabinet My Vet')
                  .replace(/{telephone_cabinet}/gi, '0797 63 87 04')}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Enregistrer le modèle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PARAMÈTRES & ABONNEMENT */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="space-y-6 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
            <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#3A683D]" />
              <span>Passerelle Télécom Opérateur Algérie</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'Ooredoo_Business_Algeria',
                  name: 'Ooredoo Business Algérie',
                  tag: 'Recommandé',
                  desc: 'Passerelle API bulk SMS certifiée pour le territoire algérien',
                },
                {
                  id: 'Mobilis_Entreprise',
                  name: 'Mobilis Entreprise',
                  tag: 'Opérateur Public',
                  desc: 'Connexion directe API SMS Gateway ATM Mobilis Corporate',
                },
                {
                  id: 'Djezzy_Enterprise',
                  name: 'Djezzy Enterprise API',
                  tag: 'Compatible',
                  desc: 'Liaison HTTP SMS Gateway & Webhook Djezzy',
                },
                {
                  id: 'Simulateur_MyVet',
                  name: 'Simulateur Test Intégré',
                  tag: 'Mode Développeur',
                  desc: 'Simulation 100% sans frais pour tests internes et validation',
                },
              ].map((prov) => (
                <label
                  key={prov.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    config.active_provider === prov.id
                      ? 'bg-[#E7ECD9] border-[#3A683D] shadow-2xs'
                      : 'border-[#C7D2BA] hover:bg-[#F8F8F1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1B2F1C]">{prov.name}</span>
                    <input
                      type="radio"
                      name="active_provider"
                      checked={config.active_provider === prov.id}
                      onChange={() => setConfig({ ...config, active_provider: prov.id })}
                      className="accent-[#3A683D]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#3A683D] mt-1">{prov.tag}</span>
                  <p className="text-xs text-[#52604C] mt-2">{prov.desc}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
            <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3A683D]" />
              <span>Mode d'exécution et Environnement</span>
            </h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1B2F1C] cursor-pointer">
                <input
                  type="radio"
                  name="provider_mode"
                  value="TEST"
                  checked={config.provider_mode === 'TEST'}
                  onChange={() => setConfig({ ...config, provider_mode: 'TEST' })}
                  className="accent-[#3A683D]"
                />
                <span>Mode Test (Simulation locale sans frais télécom)</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#52604C] cursor-pointer">
                <input
                  type="radio"
                  name="provider_mode"
                  value="PRODUCTION"
                  checked={config.provider_mode === 'PRODUCTION'}
                  onChange={() => setConfig({ ...config, provider_mode: 'PRODUCTION' })}
                  className="accent-[#3A683D]"
                />
                <span>Mode Production (Nécessite SMS_API_URL + SMS_API_KEY)</span>
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
            <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3A683D]" />
              <span>Plage horaire autorisée d'envoi (Africa/Algiers)</span>
            </h2>
            <p className="text-xs text-[#52604C]">
              Pour respecter la tranquillité des propriétaires, les rappels automatiques ne sont transmis que pendant cette fenêtre horaire locale.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#52604C] mb-1">Heure de début (Matin)</label>
                <input
                  type="number"
                  min={6}
                  max={12}
                  value={config.sending_start_hour}
                  onChange={(e) => setConfig({ ...config, sending_start_hour: parseInt(e.target.value, 10) || 8 })}
                  className="w-full px-3 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-sm font-bold text-[#1B2F1C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52604C] mb-1">Heure de fin (Soir)</label>
                <input
                  type="number"
                  min={18}
                  max={23}
                  value={config.sending_end_hour}
                  onChange={(e) => setConfig({ ...config, sending_end_hour: parseInt(e.target.value, 10) || 20 })}
                  className="w-full px-3 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-sm font-bold text-[#1B2F1C]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#C7D2BA] shadow-2xs space-y-4">
            <h2 className="font-bold text-[16px] text-[#1B2F1C] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#3A683D]" />
              <span>Règles de génération automatique des rappels</span>
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enable_vaccination_reminders}
                  onChange={(e) => setConfig({ ...config, enable_vaccination_reminders: e.target.checked })}
                  className="w-4 h-4 accent-[#3A683D] rounded"
                />
                <span className="text-sm font-semibold text-[#1B2F1C]">
                  Activer les alertes vaccins multi-paliers ({config.vaccination_intervals || '7,3,1'} jours avant l'échéance)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enable_appointment_reminders}
                  onChange={(e) => setConfig({ ...config, enable_appointment_reminders: e.target.checked })}
                  className="w-4 h-4 accent-[#3A683D] rounded"
                />
                <span className="text-sm font-semibold text-[#1B2F1C]">
                  Activer le rappel de consultation {config.appointment_interval_hours || 24} heures à l'avance
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-xs"
            >
              Enregistrer les paramètres
            </button>
          </div>
        </form>
      )}

      {/* Manual Compose Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Rédiger un SMS direct aux propriétaires"
      >
        <form onSubmit={handleSendManualSms} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#52604C] mb-1">Nom du propriétaire</label>
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-xs font-semibold text-[#1B2F1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#52604C] mb-1">
                Numéro mobile (+213 / 05 / 06 / 07)
              </label>
              <input
                type="text"
                required
                value={manualRecipient}
                onChange={(e) => setManualRecipient(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-xs font-semibold text-[#1B2F1C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#52604C] mb-1">Nom du patient (Animal)</label>
            <input
              type="text"
              value={manualAnimal}
              onChange={(e) => setManualAnimal(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-xs font-semibold text-[#1B2F1C]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#52604C]">Message SMS</label>
              <span className="text-xs font-semibold text-[#3A683D]">
                {manualCalc.encoding} &bull; {manualCalc.characterCount} car. ({manualCalc.segmentCount} SMS)
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              className="w-full p-3 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-xs font-mono text-[#1B2F1C]"
            />
          </div>

          <div className="p-3 bg-[#E7ECD9] rounded-xl text-xs text-[#1B2F1C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3A683D] shrink-0" />
            <span>
              {config.provider_mode === 'PRODUCTION'
                ? 'Mode Production : ce SMS sera transmis via la passerelle opérateur configurée.'
                : 'Mode Test : ce message sera validé, audité dans l’historique et simulé sans coût télécom réel.'}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-xs font-semibold text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSendingManual}
              className="px-5 py-2 bg-[#3A683D] hover:bg-[#2F5933] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isSendingManual ? 'Envoi...' : 'Envoyer le message'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payload Inspection Modal */}
      <Modal
        isOpen={!!selectedLogPayload}
        onClose={() => setSelectedLogPayload(null)}
        title="Détails techniques de transmission"
      >
        {selectedLogPayload && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#F8F8F1] rounded-xl border border-[#C7D2BA] space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#C7D2BA]/70">
                <span className="font-bold text-[#52604C]">Statut d'acheminement :</span>
                {renderLogStatusBadge(selectedLogPayload.status)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                <div>
                  <strong className="text-[#52604C]">ID Enregistrement :</strong>{' '}
                  <span className="font-mono text-[#1B2F1C]">{selectedLogPayload.id}</span>
                </div>
                <div>
                  <strong className="text-[#52604C]">Date d'envoi :</strong>{' '}
                  <span className="text-[#1B2F1C]">{new Date(selectedLogPayload.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
              <div>
                <strong className="text-[#52604C]">Destinataire :</strong>{' '}
                <span className="text-[#1B2F1C]">{selectedLogPayload.recipient_name}</span> (
                <span className="font-mono text-[#1B2F1C]">{selectedLogPayload.recipient_phone}</span>)
              </div>
              <div>
                <strong className="text-[#52604C]">Encodage & Volume :</strong>{' '}
                <span className="text-[#1B2F1C]">
                  {selectedLogPayload.encoding} &bull; {selectedLogPayload.segment_count} segment(s)
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-[#52604C] block mb-1">Réponse brute de la passerelle opérateur :</span>
              <pre className="p-3 bg-[#1B2F1C] text-[#E7ECD9] rounded-xl overflow-x-auto text-[11px] font-mono">
                {JSON.stringify(safeParseJson(selectedLogPayload.provider_response), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

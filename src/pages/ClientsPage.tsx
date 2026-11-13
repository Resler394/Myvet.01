import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Archive,
  Pencil
} from 'lucide-react';
import { useClinicData } from '../context/DataContext';
import { api, ApiError } from '../services/apiClient';
import { Client } from '../types';
import { Modal } from '../components/common/Modal';
import { formatAlgerianPhone } from '../utils/phoneUtils';
import { calculateClientSmsSegments } from '../utils/smsCalc';

export const ClientsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { clients, createClient, updateClient, archiveClient } = useClinicData();

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredLanguage: 'fr' as 'fr' | 'ar',
    smsConsent: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingClient, setSubmittingClient] = useState(false);

  // SMS Dispatch Modal
  const [selectedClientForSms, setSelectedClientForSms] = useState<Client | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) setSearchTerm(q);
  }, [searchParams]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      preferredLanguage: 'fr',
      smsConsent: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      preferredLanguage: client.preferredLanguage || 'fr',
      smsConsent: client.smsConsent !== false,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmittingClient(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientForm);
        setStatusNotice(`Fiche client de ${clientForm.name} mise à jour.`);
      } else {
        await createClient(clientForm);
        setStatusNotice(`Client ${clientForm.name} enregistré avec succès.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleArchiveClient = async (client: Client) => {
    if (!window.confirm(`Archiver ou supprimer le dossier client de ${client.name} ?`)) return;
    try {
      const res = await archiveClient(client.id);
      setStatusNotice(res.reason || `Dossier ${client.name} mis à jour.`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setStatusNotice(err?.message || "Impossible d'archiver le client.");
    }
  };

  const openSmsModal = (client: Client) => {
    setSelectedClientForSms(client);
    setSmsMessage(
      `Cabinet My Vet: Bonjour ${client.name}, rappel pour la visite de votre compagnon au cabinet d'Ouled Fayet. Tel: 0797 63 87 04.`
    );
    setSmsFeedback(null);
  };

  const handleSendManualSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForSms) return;
    setIsSendingSms(true);
    setSmsFeedback(null);

    try {
      const res = await api.post<{
        success: boolean;
        isSimulated: boolean;
        status: string;
        phone: { e164: string };
      }>('/api/sms/test', {
        phone: selectedClientForSms.phone,
        recipientName: selectedClientForSms.name,
        ownerId: selectedClientForSms.id,
        category: 'MANUAL',
        message: smsMessage,
      });

      setSmsFeedback({
        ok: true,
        text: res.isSimulated
          ? `SMS enregistré pour ${selectedClientForSms.name} (${res.phone.e164}) — Mode Test Simulé sans surcoût.`
          : `SMS transmis à ${selectedClientForSms.name} (${res.phone.e164}) · Statut : ${res.status}.`,
      });
      setTimeout(() => {
        setIsSendingSms(false);
        setSelectedClientForSms(null);
      }, 1800);
    } catch (err: any) {
      setSmsFeedback({
        ok: false,
        text: err instanceof ApiError ? err.message : "Échec de l'envoi SMS.",
      });
      setIsSendingSms(false);
    }
  };

  const smsCalc = calculateClientSmsSegments(smsMessage);

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Relations Clients & Rappels SMS
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Répertoire des propriétaires d'animaux, normalisation +213 E.164 et passerelle d'alertes SMS
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center justify-center gap-1.5 shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau client</span>
        </button>
      </div>

      {statusNotice && (
        <div className="p-3.5 bg-[#E7ECD9] border border-[#859766] rounded-xl text-[13px] text-[#1B2F1C] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#3A683D] shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#C7D2BA] p-4 flex items-center gap-4 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#859766] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, téléphone (+213 / 05 / 06 / 07), e-mail..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-[14px] focus:outline-none focus:border-[#3A683D] focus:bg-white text-[#1B2F1C]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#C7D2BA] shadow-2xs overflow-hidden divide-y divide-[#E7ECD9]">
        {filtered.map((client) => {
          const phoneData = formatAlgerianPhone(client.phone);

          return (
            <div key={client.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F8F1] transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[16px] text-[#1B2F1C]">{client.name}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E7ECD9] text-[#1B2F1C]">
                    {client.animalsCount} animal(aux)
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    phoneData.carrier === 'Ooredoo' ? 'bg-[#ED1C24]/10 text-[#ED1C24] border border-[#ED1C24]/20' :
                    phoneData.carrier === 'Mobilis' ? 'bg-[#008542]/10 text-[#008542] border border-[#008542]/20' :
                    phoneData.carrier === 'Djezzy' ? 'bg-[#E30613]/10 text-[#E30613] border border-[#E30613]/20' :
                    'bg-[#E7ECD9] text-[#52604C]'
                  }`}>
                    {phoneData.carrier}
                  </span>

                  {client.smsConsent === false && (
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      SMS désactivés
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-[#859766] hidden sm:inline">
                    {phoneData.e164}
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-4 text-[13px] text-[#52604C]">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#859766]" />
                    {phoneData.national}
                  </span>
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#859766]" />
                      {client.email}
                    </span>
                  )}
                  {client.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#859766]" />
                      {client.address}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                <button
                  onClick={() => openSmsModal(client)}
                  className="px-3.5 py-1.5 bg-[#3A683D] hover:bg-[#2F5933] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Rappel SMS</span>
                </button>

                <button
                  onClick={() => {
                    const clean = client.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/213${clean.replace(/^0/, '')}`, '_blank');
                  }}
                  className="px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                >
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => openEditModal(client)}
                  title="Modifier ce client"
                  className="p-1.5 border border-[#C7D2BA] bg-white hover:bg-[#E7ECD9] text-[#52604C] hover:text-[#1B2F1C] rounded-lg cursor-pointer transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleArchiveClient(client)}
                  title="Archiver / supprimer"
                  className="p-1.5 border border-[#C7D2BA] bg-white hover:bg-[#FEF2F2] text-[#52604C] hover:text-[#DC2626] rounded-lg cursor-pointer transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-10 text-center text-[#52604C] text-[13.5px]">
            Aucun client trouvé.
          </div>
        )}
      </div>

      {/* Manual SMS Composer Modal */}
      {selectedClientForSms && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClientForSms(null)}
          title={`Envoyer un rappel SMS à ${selectedClientForSms.name}`}
        >
          <form onSubmit={handleSendManualSms} className="space-y-4">
            <div className="p-3 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#52604C]">Numéro destinataire :</span>
                <span className="font-mono font-bold text-[#1B2F1C]">
                  {formatAlgerianPhone(selectedClientForSms.phone).e164}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#52604C]">Opérateur Algérie :</span>
                <span className="font-bold text-[#3A683D]">
                  {formatAlgerianPhone(selectedClientForSms.phone).carrier}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[13px] font-semibold text-[#1B2F1C]">
                  Contenu du message SMS
                </label>
                <span className="text-[11px] font-bold text-[#3A683D]">
                  {smsCalc.encoding} · {smsCalc.charCount} car. ({smsCalc.segments} SMS)
                </span>
              </div>
              <textarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full p-3 text-[13.5px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none font-mono"
                required
              />
              <p className="text-[11.5px] text-[#52604C] mt-1">
                Reste {smsCalc.remainingInSegment} caractères dans ce segment SMS.
              </p>
            </div>

            {smsFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                smsFeedback.ok
                  ? 'bg-[#E7ECD9] border-[#C7D2BA] text-[#1B2F1C]'
                  : 'bg-[#FEF2F2] border-[#FECDD3] text-[#991B1B]'
              }`}>
                {smsFeedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-[#3A683D] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                )}
                <span>{smsFeedback.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
              <button
                type="button"
                onClick={() => setSelectedClientForSms(null)}
                className="px-4 py-2 border border-[#C7D2BA] text-[#52604C] rounded-xl text-[13px] hover:bg-[#F8F8F1] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSendingSms}
                className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingSms ? 'Envoi...' : 'Envoyer le SMS'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create / Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? `Modifier ${editingClient.name}` : 'Ajouter un propriétaire'}
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          {formError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[12.5px] text-[#991B1B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Nom complet *</label>
            <input
              type="text"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Téléphone (Algérie) *</label>
              <input
                type="text"
                placeholder="05 / 06 / 07..."
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">E-mail</label>
              <input
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Adresse</label>
            <input
              type="text"
              placeholder="ex: Ouled Fayet"
              value={clientForm.address}
              onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Langue SMS</label>
              <select
                value={clientForm.preferredLanguage}
                onChange={(e) => setClientForm({ ...clientForm, preferredLanguage: e.target.value as 'fr' | 'ar' })}
                className="w-full px-3 py-2 text-[14px] border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية (Arabe)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-[#1B2F1C] pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={clientForm.smsConsent}
                onChange={(e) => setClientForm({ ...clientForm, smsConsent: e.target.checked })}
                className="w-4 h-4 accent-[#3A683D]"
              />
              <span>Accord rappels SMS</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-[#C7D2BA] text-[#52604C] rounded-xl text-[13px] hover:bg-[#F8F8F1] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingClient}
              className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] cursor-pointer disabled:opacity-50"
            >
              {submittingClient ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

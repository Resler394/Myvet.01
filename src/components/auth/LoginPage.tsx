import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/apiClient';
import { MyVetLogo } from '../common/MyVetLogo';

export const LoginPage: React.FC = () => {
  const { login, error: sessionError, refreshSession } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setFormError(err instanceof ApiError ? err.message : 'Échec de la connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F1] dark:bg-[#111A12] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#18261A] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-2xl shadow-sm p-7 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <MyVetLogo variant="header" showSlogan={false} />
          <div className="pt-2">
            <h1 className="text-[20px] font-bold text-[#1B2F1C] dark:text-[#F1F5E8] tracking-tight">
              Accès Espace Clinique
            </h1>
            <p className="text-[13px] text-[#52604C] dark:text-[#A3B596] mt-0.5">
              Connectez-vous pour accéder aux dossiers patients, à l’agenda et à la caisse DZD.
            </p>
          </div>
        </div>

        {(formError || sessionError) && (
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-[#991B1B] text-[13px] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">{formError || sessionError}</p>
              {sessionError && !formError && (
                <button
                  type="button"
                  onClick={() => refreshSession()}
                  className="text-xs underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Réessayer
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] dark:text-[#F1F5E8] mb-1.5">
              Email ou identifiant
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#859766] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="dr.vet@myvet.dz"
                autoComplete="username"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-[14px] bg-[#F8F8F1] dark:bg-[#111A12] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-xl text-[#1B2F1C] dark:text-[#F1F5E8] focus:outline-none focus:border-[#3A683D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] dark:text-[#F1F5E8] mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#859766] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-[14px] bg-[#F8F8F1] dark:bg-[#111A12] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-xl text-[#1B2F1C] dark:text-[#F1F5E8] focus:outline-none focus:border-[#3A683D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-[#3A683D] hover:bg-[#2F5933] disabled:opacity-60 text-white font-semibold text-[14px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{submitting ? 'Connexion en cours...' : 'Se connecter au cabinet'}</span>
          </button>
        </form>

        {isDev && (
          <div className="p-3.5 rounded-xl bg-[#E7ECD9]/60 border border-[#C7D2BA] text-[12px] text-[#52604C] space-y-1.5">
            <div className="font-bold text-[#1B2F1C]">Environnement de développement</div>
            <p>
              Compte titulaire seedé : <code className="font-mono text-[#3A683D]">dr.vet@myvet.dz</code> ·{' '}
              <code className="font-mono text-[#3A683D]">MyVet2026!</code>
            </p>
            <button
              type="button"
              onClick={() => {
                setIdentifier('dr.vet@myvet.dz');
                setPassword('MyVet2026!');
              }}
              className="text-[#3A683D] font-bold underline cursor-pointer"
            >
              Pré-remplir les identifiants de test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

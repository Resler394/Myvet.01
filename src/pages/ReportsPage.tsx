import React from 'react';
import { BarChart3 } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { useClinicData } from '../context/DataContext';
import { formatDzd } from '../../shared/utils/money';

const SPECIES_COLORS = ['bg-[#3A683D]', 'bg-[#5A7E32]', 'bg-[#859766]'];
const ACT_COLORS = ['bg-[#5A7E32]', 'bg-[#3A683D]', 'bg-[#859766]', 'bg-[#DC2626]'];

export const ReportsPage: React.FC = () => {
  const { reportsOverview, loading } = useClinicData();

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-[#3A683D]" />
          <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
            Rapports & Statistiques
          </h1>
        </div>
        <p className="text-[14px] text-[#52604C] mt-0.5">
          Analyses de fréquentation, répartition des motifs de consultation et chiffre d'affaires (DZD)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Consultations ce mois"
          value={loading && !reportsOverview ? '—' : reportsOverview?.consultationsCount ?? 0}
        />
        <StatCard
          title="Patients actifs suivis"
          value={loading && !reportsOverview ? '—' : `+${reportsOverview?.newPatientsCount ?? 0}`}
          valueColor="text-[#3A683D]"
        />
        <StatCard
          title="Taux de rappel vaccin"
          value={
            loading && !reportsOverview
              ? '—'
              : `${(reportsOverview?.vaccinationCompletionRate ?? 0).toFixed(1)} %`
          }
        />
        <StatCard
          title="CA mensuel"
          value={
            loading && !reportsOverview
              ? '—'
              : formatDzd(reportsOverview?.monthlyRevenueDzd ?? 0, { decimals: 0 })
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-4">
          <h3 className="text-[16px] font-bold text-[#1B2F1C]">
            Répartition par espèce
          </h3>
          <div className="space-y-3">
            {(reportsOverview?.speciesBreakdown || []).map((item, idx) => (
              <div key={item.label}>
                <div className="flex justify-between text-[13px] font-semibold text-[#1B2F1C] mb-1">
                  <span>
                    {item.label} ({item.count})
                  </span>
                  <span>{item.percentage}%</span>
                </div>
                <div className="w-full h-3 bg-[#E7ECD9] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${SPECIES_COLORS[idx % SPECIES_COLORS.length]} rounded-full transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {(!reportsOverview || reportsOverview.speciesBreakdown.length === 0) && (
              <p className="text-[13px] text-[#859766]">Aucune donnée de patient disponible.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-4">
          <h3 className="text-[16px] font-bold text-[#1B2F1C]">
            Types d'actes vétérinaires
          </h3>
          <div className="space-y-3">
            {(reportsOverview?.actTypeBreakdown || []).map((item, idx) => (
              <div key={item.label}>
                <div className="flex justify-between text-[13px] font-semibold text-[#1B2F1C] mb-1">
                  <span>
                    {item.label} ({item.count})
                  </span>
                  <span>{item.percentage}%</span>
                </div>
                <div className="w-full h-3 bg-[#E7ECD9] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ACT_COLORS[idx % ACT_COLORS.length]} rounded-full transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {(!reportsOverview || reportsOverview.actTypeBreakdown.length === 0) && (
              <p className="text-[13px] text-[#859766]">Aucun acte enregistré.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

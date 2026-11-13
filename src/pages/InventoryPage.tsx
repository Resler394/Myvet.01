import React, { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, Plus, Search, History } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { useClinicData } from '../context/DataContext';
import { api, ApiError } from '../services/apiClient';
import { formatDzd } from '../../shared/utils/money';
import type { InventoryMovement, StockItem } from '../types';

export const InventoryPage: React.FC = () => {
  const { stocks, createStock, adjustStock } = useClinicData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [showMovements, setShowMovements] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Vaccin' as StockItem['category'],
    supplier: 'BioVet Distribution',
    quantity: 10,
    minThreshold: 5,
    unit: 'boîtes',
    unitPriceDzd: 1500,
  });

  const loadMovements = useCallback(async () => {
    try {
      const list = await api.get<InventoryMovement[]>('/api/inventory/movements');
      setMovements(list);
    } catch {
      // Non-blocking audit trail load
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements, stocks.length]);

  const filtered = stocks.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = stocks.filter((i) => i.quantity <= i.minThreshold);
  const criticalCount = lowStockItems.length;
  const activeSuppliersCount = new Set(stocks.map((s) => s.supplier).filter(Boolean)).size;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createStock({
        name: newItem.name,
        category: newItem.category,
        supplier: newItem.supplier,
        quantity: Number(newItem.quantity),
        minThreshold: Number(newItem.minThreshold),
        unit: newItem.unit,
        unitPriceDzd: Number(newItem.unitPriceDzd) || 0,
      });
      setIsModalOpen(false);
      setNewItem({
        name: '',
        category: 'Vaccin',
        supplier: 'BioVet Distribution',
        quantity: 10,
        minThreshold: 5,
        unit: 'boîtes',
        unitPriceDzd: 1500,
      });
      await loadMovements();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erreur lors de la création de l’article.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustQuantity = async (id: string, delta: number) => {
    setErrorMsg(null);
    try {
      await adjustStock(id, delta, delta > 0 ? 'Réapprovisionnement rapide' : 'Sortie clinique');
      await loadMovements();
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Impossible d’ajuster le stock.');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Package className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Gestion des Stocks
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Pharmacie clinique, consommables chirurgicaux et réassorts (tarifs DZD)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowMovements(!showMovements)}
            className="bg-white border border-[#C7D2BA] hover:bg-[#F8F8F1] text-[#1B2F1C] px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <History className="w-4 h-4 text-[#3A683D]" />
            <span>{showMovements ? 'Masquer mouvements' : `Mouvements (${movements.length})`}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel article</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard title="Total références" value={stocks.length} />
        <StatCard
          title="Alertes stock critique"
          value={criticalCount}
          valueColor={criticalCount > 0 ? 'text-[#DC2626]' : 'text-[#3A683D]'}
        />
        <StatCard title="Fournisseurs actifs" value={activeSuppliersCount} />
      </div>

      {criticalCount > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FECDD3] rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0" />
          <div className="flex-1 text-[13px] text-[#991B1B]">
            <strong>Alerte réassort impératif :</strong>{' '}
            {lowStockItems.map((i) => `${i.name} (${i.quantity} ${i.unit} restants)`).join(' · ')}.
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#C7D2BA] p-4 flex items-center gap-4 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#859766] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par désignation, molécule, catégorie, fournisseur..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-[14px] focus:outline-none focus:border-[#3A683D] focus:bg-white text-[#1B2F1C]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#C7D2BA] shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-[#F8F8F1] border-b border-[#C7D2BA] text-[12px] font-bold text-[#52604C] uppercase">
            <tr>
              <th className="py-3 px-5">Désignation</th>
              <th className="py-3 px-5">Catégorie</th>
              <th className="py-3 px-5">Fournisseur</th>
              <th className="py-3 px-5">Prix unitaire</th>
              <th className="py-3 px-5">Stock actuel</th>
              <th className="py-3 px-5">Statut</th>
              <th className="py-3 px-5 text-right">Ajuster</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECD9]">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-[#F8F8F1] transition-colors">
                <td className="py-4 px-5 font-bold text-[#1B2F1C]">{item.name}</td>
                <td className="py-4 px-5 text-[#52604C]">{item.category}</td>
                <td className="py-4 px-5 text-[#52604C]">{item.supplier}</td>
                <td className="py-4 px-5 font-semibold text-[#1B2F1C]">
                  {formatDzd(item.unitPriceDzd || 0)}
                </td>
                <td className="py-4 px-5">
                  <span
                    className={`font-bold text-[14px] ${
                      item.quantity <= item.minThreshold ? 'text-[#DC2626]' : 'text-[#1B2F1C]'
                    }`}
                  >
                    {item.quantity} {item.unit}
                  </span>
                  <span className="text-[11.5px] text-[#859766] block">
                    Seuil min : {item.minThreshold}
                  </span>
                </td>
                <td className="py-4 px-5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold ${
                      item.quantity <= item.minThreshold
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-[#E7ECD9] text-[#3A683D]'
                    }`}
                  >
                    {item.quantity <= item.minThreshold ? 'Critique' : 'Conforme'}
                  </span>
                </td>
                <td className="py-4 px-5 text-right space-x-1 whitespace-nowrap">
                  <button
                    onClick={() => handleAdjustQuantity(item.id, -1)}
                    disabled={item.quantity <= 0}
                    className="w-7 h-7 bg-white border border-[#C7D2BA] rounded-lg text-sm font-bold text-[#52604C] hover:text-[#1B2F1C] hover:bg-[#E7ECD9] disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleAdjustQuantity(item.id, 1)}
                    className="w-7 h-7 bg-white border border-[#C7D2BA] rounded-lg text-sm font-bold text-[#52604C] hover:text-[#1B2F1C] hover:bg-[#E7ECD9] cursor-pointer"
                  >
                    +
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showMovements && (
        <div className="bg-white rounded-2xl border border-[#C7D2BA] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E7ECD9] pb-3">
            <History className="w-5 h-5 text-[#3A683D]" />
            <h3 className="text-[16px] font-bold text-[#1B2F1C]">Journal des mouvements de stock</h3>
          </div>
          {movements.length === 0 ? (
            <p className="text-[13px] text-[#859766]">Aucun mouvement récent enregistré.</p>
          ) : (
            <div className="divide-y divide-[#E7ECD9]">
              {movements.slice(0, 20).map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-[13px]">
                  <div>
                    <span className="font-bold text-[#1B2F1C]">{m.itemName || m.itemId}</span>
                    <span className="text-[#52604C] ml-2">({m.reason})</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className={m.delta >= 0 ? 'font-bold text-[#3A683D]' : 'font-bold text-[#DC2626]'}>
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span className="text-[#52604C]">
                      {m.quantityBefore} → {m.quantityAfter}
                    </span>
                    <span className="text-[#859766]">{m.performedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajouter un article en stock">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Désignation de l'article *</label>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Catégorie</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value as StockItem['category'] })}
                className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none bg-white"
              >
                <option value="Vaccin">Vaccin</option>
                <option value="Antibiotique">Antibiotique</option>
                <option value="Anti-inflammatoire">Anti-inflammatoire</option>
                <option value="Matériel">Matériel chirurgical</option>
                <option value="Alimentation">Alimentation</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Fournisseur</label>
              <input
                type="text"
                value={newItem.supplier}
                onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Quantité</label>
              <input
                type="number"
                min="0"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Seuil min</label>
              <input
                type="number"
                min="0"
                value={newItem.minThreshold}
                onChange={(e) => setNewItem({ ...newItem, minThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Unité</label>
              <input
                type="text"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">Prix (DZD)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={newItem.unitPriceDzd}
                onChange={(e) => setNewItem({ ...newItem, unitPriceDzd: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[#C7D2BA] rounded-xl text-[13px] text-[#52604C] hover:bg-[#F8F8F1] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2F5933] disabled:opacity-50 cursor-pointer">
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

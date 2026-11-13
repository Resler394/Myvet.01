import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  User,
  ChevronRight,
  Phone,
  Sparkles,
} from 'lucide-react';
import { useClinicData } from '../../context/DataContext';
import { Patient, Client } from '../../types';

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  className = '',
  placeholder = 'Rechercher un client ou patient par nom ou ID...'
}) => {
  const navigate = useNavigate();
  const { patients, clients } = useClinicData();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'patients' | 'clients'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanQuery = query.trim().toLowerCase();

  // Search logic
  const matchedPatients = cleanQuery === '' ? [] : patients.filter(p => {
    return (
      p.name.toLowerCase().includes(cleanQuery) ||
      p.id.toLowerCase().includes(cleanQuery) ||
      p.ownerName.toLowerCase().includes(cleanQuery) ||
      p.ownerPhone.includes(cleanQuery) ||
      p.breed.toLowerCase().includes(cleanQuery) ||
      p.species.toLowerCase().includes(cleanQuery) ||
      p.microchip.toLowerCase().includes(cleanQuery)
    );
  });

  const matchedClients = cleanQuery === '' ? [] : clients.filter(c => {
    return (
      c.name.toLowerCase().includes(cleanQuery) ||
      c.id.toLowerCase().includes(cleanQuery) ||
      c.phone.includes(cleanQuery) ||
      c.email.toLowerCase().includes(cleanQuery) ||
      c.address.toLowerCase().includes(cleanQuery)
    );
  });

  const showPatients = filterType === 'all' || filterType === 'patients';
  const showClients = filterType === 'all' || filterType === 'clients';

  const displayedPatients = showPatients ? matchedPatients : [];
  const displayedClients = showClients ? matchedClients : [];

  const totalResultsCount = displayedPatients.length + displayedClients.length;

  const handleSelectPatient = (patient: Patient) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/patients/${patient.id}`);
  };

  const handleSelectClient = (client: Client) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/clients?search=${encodeURIComponent(client.name)}`);
  };

  const highlightMatch = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-[#E7ECD9] dark:bg-[#3A683D] text-[#1B2F1C] dark:text-white font-bold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-xl ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#859766] absolute left-3.5 pointer-events-none shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2 sm:py-2.5 bg-white dark:bg-[#18261A] text-[#1B2F1C] dark:text-[#F1F5E8] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-xl text-xs sm:text-sm font-medium placeholder-[#52604C]/60 dark:placeholder-[#A3B596]/50 shadow-2xs focus:outline-none focus:border-[#3A683D] dark:focus:border-[#4E8252] focus:ring-2 focus:ring-[#3A683D]/15 transition-all"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[#52604C] hover:text-[#1B2F1C] hover:bg-[#F8F8F1] dark:hover:bg-[#223724] transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-[#859766] bg-[#F8F8F1] dark:bg-[#223724] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-md shadow-2xs">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results Overlay */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#18261A] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
          {/* Filter Pills Header */}
          <div className="p-3 bg-[#F8F8F1] dark:bg-[#152217] border-b border-[#C7D2BA] dark:border-[#2A3F2C] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#3A683D] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1E2E20] text-[#52604C] dark:text-[#A3B596] hover:bg-[#E7ECD9] dark:hover:bg-[#2A422D] border border-[#C7D2BA] dark:border-[#2A3F2C]'
                }`}
              >
                Tous ({matchedPatients.length + matchedClients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('patients')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'patients'
                    ? 'bg-[#3A683D] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1E2E20] text-[#52604C] dark:text-[#A3B596] hover:bg-[#E7ECD9] dark:hover:bg-[#2A422D] border border-[#C7D2BA] dark:border-[#2A3F2C]'
                }`}
              >
                <span>🐾 Patients</span>
                <span>({matchedPatients.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('clients')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'clients'
                    ? 'bg-[#3A683D] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1E2E20] text-[#52604C] dark:text-[#A3B596] hover:bg-[#E7ECD9] dark:hover:bg-[#2A422D] border border-[#C7D2BA] dark:border-[#2A3F2C]'
                }`}
              >
                <span>👤 Clients</span>
                <span>({matchedClients.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-[#52604C] dark:text-[#A3B596] font-medium hidden sm:inline">
              ESC pour fermer
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E7ECD9] dark:divide-[#233425]">
            {cleanQuery === '' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#52604C] dark:text-[#A3B596]">
                  <Sparkles className="w-3.5 h-3.5 text-[#3A683D]" />
                  <span>Suggestions de recherche rapide :</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patients.slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F8F1] dark:bg-[#223724] hover:bg-[#E7ECD9] dark:hover:bg-[#2A422D] border border-[#C7D2BA] dark:border-[#2A3F2C] text-xs font-semibold text-[#1B2F1C] dark:text-[#F1F5E8] transition-colors cursor-pointer"
                    >
                      <span>{p.avatarEmoji || '🐾'}</span>
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] text-[#859766]">#{p.id}</span>
                    </button>
                  ))}
                  {clients.slice(0, 3).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F8F1] dark:bg-[#223724] hover:bg-[#E7ECD9] dark:hover:bg-[#2A422D] border border-[#C7D2BA] dark:border-[#2A3F2C] text-xs font-semibold text-[#1B2F1C] dark:text-[#F1F5E8] transition-colors cursor-pointer"
                    >
                      <User className="w-3 h-3 text-[#3A683D]" />
                      <span>{c.name}</span>
                      <span className="font-mono text-[10px] text-[#859766]">#{c.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cleanQuery !== '' && totalResultsCount > 0 && (
              <div className="p-2 space-y-3">
                {displayedPatients.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#3A683D] dark:text-[#859766] flex items-center justify-between">
                      <span>Patients ({displayedPatients.length})</span>
                      <span className="text-[10px] lowercase font-normal">Dossier médical direct</span>
                    </div>

                    <div className="space-y-1">
                      {displayedPatients.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="p-2.5 rounded-xl hover:bg-[#F8F8F1] dark:hover:bg-[#223724] transition-colors cursor-pointer flex items-center justify-between gap-3 group border border-transparent hover:border-[#C7D2BA] dark:hover:border-[#2A3F2C]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#E7ECD9] dark:bg-[#2A422D] text-lg flex items-center justify-center shrink-0 border border-[#C7D2BA] dark:border-[#38563C]">
                              {patient.avatarEmoji || (patient.species === 'Chien' ? '🐶' : '🐱')}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#1B2F1C] dark:text-[#F1F5E8]">
                                  {highlightMatch(patient.name, cleanQuery)}
                                </span>
                                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#E7ECD9] dark:bg-[#1B2F1C] text-[#3A683D] dark:text-[#859766] font-semibold border border-[#C7D2BA]/60 dark:border-[#3A683D]/60">
                                  #{patient.id}
                                </span>
                                <span className="text-[11px] px-2 py-0.2 rounded-full font-medium bg-[#F8F8F1] dark:bg-[#1B2F1C] text-[#52604C] dark:text-[#A3B596] border border-[#C7D2BA] dark:border-[#2A3F2C]">
                                  {patient.species} &bull; {patient.breed}
                                </span>
                              </div>

                              <div className="text-xs text-[#52604C] dark:text-[#A3B596] mt-0.5 truncate flex items-center gap-2">
                                <span>
                                  Propriétaire : <strong className="text-[#1B2F1C] dark:text-[#E7ECD9]">{highlightMatch(patient.ownerName, cleanQuery)}</strong>
                                </span>
                                {patient.ownerPhone && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{highlightMatch(patient.ownerPhone, cleanQuery)}</span>
                                  </>
                                )}
                                {patient.microchip && patient.microchip !== '—' && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="font-mono text-[10px]">Puce: {highlightMatch(patient.microchip, cleanQuery)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-[#3A683D] group-hover:translate-x-0.5 transition-transform flex items-center">
                              Voir fiche <ChevronRight className="w-4 h-4 ml-0.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {displayedClients.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#3A683D] dark:text-[#859766] flex items-center justify-between">
                      <span>Clients & Propriétaires ({displayedClients.length})</span>
                      <span className="text-[10px] lowercase font-normal">Fiche client</span>
                    </div>

                    <div className="space-y-1">
                      {displayedClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="p-2.5 rounded-xl hover:bg-[#F8F8F1] dark:hover:bg-[#223724] transition-colors cursor-pointer flex items-center justify-between gap-3 group border border-transparent hover:border-[#C7D2BA] dark:hover:border-[#2A3F2C]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#F8F8F1] dark:bg-[#223724] text-[#3A683D] flex items-center justify-center shrink-0 border border-[#C7D2BA] dark:border-[#38563C]">
                              <User className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#1B2F1C] dark:text-[#F1F5E8]">
                                  {highlightMatch(client.name, cleanQuery)}
                                </span>
                                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#E7ECD9] dark:bg-[#1B2F1C] text-[#3A683D] dark:text-[#859766] font-semibold border border-[#C7D2BA]/60 dark:border-[#3A683D]/60">
                                  #{client.id}
                                </span>
                                <span className="text-[11px] px-2 py-0.2 rounded-full font-medium bg-[#E7ECD9] dark:bg-[#1B2F1C] text-[#3A683D] dark:text-[#859766]">
                                  {client.animalsCount} animal(aux)
                                </span>
                              </div>

                              <div className="text-xs text-[#52604C] dark:text-[#A3B596] mt-0.5 truncate flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#859766]" />
                                  <span>{highlightMatch(client.phone, cleanQuery)}</span>
                                </span>
                                {client.email && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{highlightMatch(client.email, cleanQuery)}</span>
                                  </>
                                )}
                                {client.address && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate max-w-[200px]">{client.address}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-[#3A683D] group-hover:translate-x-0.5 transition-transform flex items-center">
                              Voir client <ChevronRight className="w-4 h-4 ml-0.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {cleanQuery !== '' && totalResultsCount === 0 && (
              <div className="p-8 text-center space-y-2">
                <Search className="w-8 h-8 text-[#859766] mx-auto opacity-60" />
                <p className="text-sm font-bold text-[#1B2F1C] dark:text-[#F1F5E8]">
                  Aucun patient ou client trouvé
                </p>
                <p className="text-xs text-[#52604C] dark:text-[#A3B596] max-w-sm mx-auto">
                  Aucun résultat ne correspond à « <strong className="text-[#3A683D]">{query}</strong> ». Essayez avec un nom d'animal, un nom de propriétaire, ou un identifiant.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

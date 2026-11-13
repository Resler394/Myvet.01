import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClinicDataProvider } from './context/DataContext';
import { LoginPage } from './components/auth/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { AtAGlanceDashboard } from './pages/AtAGlanceDashboard';
import { AgendaPage } from './pages/AgendaPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailsPage } from './pages/PatientDetailsPage';
import { TeamTasksPage } from './pages/TeamTasksPage';
import { ClientsPage } from './pages/ClientsPage';
import { SmsPage } from './pages/SmsPage';
import { InvoicingPage } from './pages/InvoicingPage';
import { CashClosingPage } from './pages/CashClosingPage';
import { HospitalizationPage } from './pages/HospitalizationPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const AuthGate: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F1] dark:bg-[#111A12] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#18261A] border border-[#C7D2BA] dark:border-[#2A3F2C] rounded-2xl px-8 py-6 shadow-xs flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-[#E7ECD9] border-t-[#3A683D] animate-spin" />
          <span className="text-[13.5px] font-semibold text-[#1B2F1C] dark:text-[#F1F5E8]">
            Chargement de l'espace clinique My Vet...
          </span>
        </div>
      </div>
    );
  }

  if (!session.authenticated) {
    return <LoginPage />;
  }

  return (
    <ClinicDataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<AtAGlanceDashboard />} />
          <Route path="/dashboard" element={<AtAGlanceDashboard />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/sms" element={<SmsPage />} />
          <Route path="/facturation" element={<InvoicingPage />} />
          <Route path="/cloture-caisse" element={<CashClosingPage />} />
          <Route path="/hospitalisation" element={<HospitalizationPage />} />
          <Route path="/taches" element={<TeamTasksPage />} />
          <Route path="/stocks" element={<InventoryPage />} />
          <Route path="/rapports" element={<ReportsPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ClinicDataProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

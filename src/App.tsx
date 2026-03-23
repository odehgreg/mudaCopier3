import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { AccountsPage } from "./pages/AccountsPage";
import { CopierPage } from "./pages/CopierPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { TradesPage } from "./pages/TradesPage";
import { SettingsPage } from "./pages/SettingsPage";

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "accounts":
        return <AccountsPage />;
      case "copier":
        return <CopierPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "trades":
        return <TradesPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

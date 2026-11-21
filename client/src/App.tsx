import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, AppView } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PublicInvitationPage } from './pages/PublicInvitationPage';
import { WeddingWizard } from './components/WeddingWizard/WeddingWizard';
import { WeddingEditor } from './components/WeddingEditor/WeddingEditor';

const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);

  // URL synchronization for direct links (e.g. /invitation/:slug)
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/invitation/')) {
        const slug = pathname.replace('/invitation/', '').split('/')[0].trim();
        if (slug) {
          setPublicSlug(slug);
          setCurrentView('public');
          return;
        }
      }

      if (pathname === '/login') {
        setCurrentView('login');
      } else if (pathname === '/register') {
        setCurrentView('register');
      } else if (pathname === '/dashboard') {
        setCurrentView('dashboard');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    if (view === 'landing') {
      window.history.pushState({}, '', '/');
    } else if (view === 'login') {
      window.history.pushState({}, '', '/login');
    } else if (view === 'register') {
      window.history.pushState({}, '', '/register');
    } else if (view === 'dashboard') {
      window.history.pushState({}, '', '/dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEditor = (invitationId: string) => {
    setSelectedInvitationId(invitationId);
    setCurrentView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWizardSuccess = (newInvitationId: string) => {
    setSelectedInvitationId(newInvitationId);
    setCurrentView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewPublic = (slug: string) => {
    setPublicSlug(slug);
    window.history.pushState({}, '', `/invitation/${slug}`);
    setCurrentView('public');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnFromPublic = () => {
    if (isAuthenticated) {
      handleNavigate('dashboard');
    } else {
      handleNavigate('landing');
    }
  };

  // Dedicated, uncluttered public website experience (no dashboard navbar / footer)
  if (currentView === 'public' && publicSlug) {
    return (
      <PublicInvitationPage
        slug={publicSlug}
        onNavigateHome={handleReturnFromPublic}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ivory text-charcoal">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentView === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {currentView === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentView === 'register' && <RegisterPage onNavigate={handleNavigate} />}
        {currentView === 'dashboard' && (
          <DashboardPage
            onNavigate={handleNavigate}
            onCreateNew={() => setCurrentView('wizard')}
            onOpenEditor={handleOpenEditor}
            onViewPublic={handleViewPublic}
          />
        )}
        {currentView === 'wizard' && (
          <WeddingWizard
            onCancel={() => setCurrentView('dashboard')}
            onSuccess={handleWizardSuccess}
          />
        )}
        {currentView === 'editor' && selectedInvitationId && (
          <WeddingEditor
            invitationId={selectedInvitationId}
            onBack={() => setCurrentView('dashboard')}
            onViewPublic={handleViewPublic}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, User } from 'lucide-react';

export type AppView = 'landing' | 'login' | 'register' | 'dashboard' | 'wizard' | 'editor' | 'public';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-ivory/90 backdrop-blur-md border-b border-sand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Brand Logo & Editorial Wordmark */}
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center space-x-3 text-left group transition-all"
          >
            <div className="w-10 h-10 rounded-sm bg-forest flex items-center justify-center text-ivory font-serif text-xl border border-sand">
              വി
            </div>
            <div>
              <span className="block font-serif text-xl tracking-tight text-forest group-hover:text-forest-light transition-colors">
                Kalyanam
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-charcoal-muted">
                Swiss Editorial Wedding Suite
              </span>
            </div>
          </button>

          {/* Navigation Controls */}
          <nav className="flex items-center space-x-3 sm:space-x-5">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`inline-flex items-center space-x-2 px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-sm transition-all ${
                    currentView === 'dashboard'
                      ? 'bg-forest text-ivory'
                      : 'text-charcoal hover:bg-sand/40'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-sand/30 rounded-sm border border-sand/60 text-xs text-charcoal">
                  <User className="w-3.5 h-3.5 text-forest" />
                  <span className="font-medium">{user?.fullName.split(' ')[0]}</span>
                </div>

                <button
                  onClick={async () => {
                    await logout();
                    onNavigate('landing');
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs uppercase tracking-wider text-charcoal-muted hover:text-forest transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className={`px-4 py-2 text-xs uppercase tracking-widest font-medium rounded-sm transition-all ${
                    currentView === 'login'
                      ? 'text-forest font-semibold border-b-2 border-forest'
                      : 'text-charcoal hover:text-forest'
                  }`}
                >
                  Sign In
                </button>

                <button
                  onClick={() => onNavigate('register')}
                  className="px-5 py-2.5 text-xs uppercase tracking-widest font-semibold bg-forest text-ivory hover:bg-forest-light rounded-sm transition-all shadow-sm border border-forest-dark"
                >
                  Owner Register
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

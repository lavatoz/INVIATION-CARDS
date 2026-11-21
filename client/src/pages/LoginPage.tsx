import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.login({ email, password });
      if (response.success && response.data) {
        login(response.data.token, response.data.user);
        onNavigate('dashboard');
      } else {
        setError(response.message || 'Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-ivory-surface p-8 sm:p-10 rounded-sm border border-sand-border shadow-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-sm bg-forest flex items-center justify-center text-ivory font-serif text-2xl mb-4 border border-sand">
            വി
          </div>
          <h2 className="text-2xl font-serif text-forest">Owner Sign In</h2>
          <p className="text-xs text-charcoal-muted mt-1 uppercase tracking-wider">
            Access Your Wedding Suite
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-sm flex items-start space-x-2 text-red-800 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center justify-center space-x-2 border border-forest-dark disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Switch to Register */}
        <div className="mt-8 pt-6 border-t border-sand-border/60 text-center">
          <p className="text-xs text-charcoal-muted">
            New wedding host?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-forest font-semibold hover:underline"
            >
              Register as Wedding Owner
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

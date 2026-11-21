import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ivory border-t border-sand-border mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pb-8 border-b border-sand-border/60">
          <div>
            <span className="font-serif text-lg tracking-tight text-forest">
              Kalyanam Editorial Platform
            </span>
            <p className="text-xs text-charcoal-muted mt-1 max-w-sm leading-relaxed">
              Crafted for distinguished Indian celebrations and heritage Kerala weddings with Swiss typographical precision.
            </p>
          </div>

          <div className="flex md:justify-center space-x-6 text-xs text-charcoal-muted uppercase tracking-wider">
            <span>#183D32 Forest</span>
            <span>#E8DDC8 Sand</span>
            <span>#F8F5ED Ivory</span>
          </div>

          <div className="md:text-right text-xs text-charcoal-muted">
            <span className="inline-block px-2.5 py-1 bg-sand/40 border border-sand-border rounded text-[11px] font-mono">
              Phase 1 · Foundation Build
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-charcoal-muted">
          <p>© {new Date().getFullYear()} Wedding Invitation Platform. Strictly Owner Controlled.</p>
          <p className="mt-2 sm:mt-0 font-serif italic text-forest">
            ശുഭവിവാഹം · Sacred Union
          </p>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';
import { ArrowRight, ShieldCheck, Languages, Calendar, HeartHandshake } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-24 py-12">
      {/* Editorial Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sand/50 border border-sand-border mb-8">
          <span className="w-2 h-2 rounded-full bg-forest"></span>
          <span className="text-xs uppercase tracking-widest text-charcoal font-medium">
            Swiss Editorial · Kerala Heritage
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif text-forest tracking-tight leading-[1.1] mb-6">
          The art of sacred invitations, <br />
          <span className="italic font-normal text-charcoal">composed with grace.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-charcoal-muted leading-relaxed font-sans mb-10">
          A bespoke digital invitation platform engineered for authentic Indian celebrations and traditional Kerala weddings. Designed with Swiss typographical discipline and cultural reverence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all shadow-md flex items-center justify-center space-x-2 border border-forest-dark"
          >
            <span>Begin as Wedding Owner</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-sand-light text-forest text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-sand transition-all border border-sand-border flex items-center justify-center"
          >
            Owner Portal Login
          </button>
        </div>
      </section>

      {/* Swiss Editorial Spec Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-b border-sand-border py-12">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-editorial text-forest font-semibold block mb-2">
              Architectural Foundations
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-charcoal">
              Distinction in Every Dimension
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-ivory-surface rounded-sm border border-sand-border/70 hover:border-forest/40 transition-colors">
              <div className="w-10 h-10 rounded-sm bg-forest/10 flex items-center justify-center text-forest mb-4">
                <Languages className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-forest mb-2">Bilingual Architecture</h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Native Malayalam and English typography rendered alongside each other to honor family traditions with zero compromise.
              </p>
            </div>

            <div className="p-6 bg-ivory-surface rounded-sm border border-sand-border/70 hover:border-forest/40 transition-colors">
              <div className="w-10 h-10 rounded-sm bg-forest/10 flex items-center justify-center text-forest mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-forest mb-2">Private Guest Records</h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Guest lists, phone numbers, and RSVP records remain completely isolated and strictly protected under owner encryption.
              </p>
            </div>

            <div className="p-6 bg-ivory-surface rounded-sm border border-sand-border/70 hover:border-forest/40 transition-colors">
              <div className="w-10 h-10 rounded-sm bg-forest/10 flex items-center justify-center text-forest mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-forest mb-2">Ceremonial Protocols</h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Structured schemas for Muhurtham, Madhuramveppu, Haldi, Nikah, and Reception timings with precision venue routing.
              </p>
            </div>

            <div className="p-6 bg-ivory-surface rounded-sm border border-sand-border/70 hover:border-forest/40 transition-colors">
              <div className="w-10 h-10 rounded-sm bg-forest/10 flex items-center justify-center text-forest mb-4">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-forest mb-2">Decimal Ledger</h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Audited financial tracking for gift contributions and payments powered by exact database Decimal schemas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Quotation / Malayalam Homage */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pb-8">
        <blockquote className="border-l-2 border-forest pl-6 sm:pl-10 text-left my-8">
          <p className="font-serif text-xl sm:text-2xl text-forest leading-relaxed italic">
            "രണ്ട് മനസ്സുകളുടെ പവിത്രമായ സംഗമം, പാരമ്പര്യത്തിന്റെ തനിമയോടെ."
          </p>
          <footer className="mt-3 text-xs uppercase tracking-widest text-charcoal-muted">
            Sacred Union in Timeless Elegance
          </footer>
        </blockquote>
      </section>
    </div>
  );
};

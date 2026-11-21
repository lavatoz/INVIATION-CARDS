import React from 'react';

interface BilingualInputProps {
  label: string;
  englishValue: string;
  malayalamValue: string;
  onEnglishChange: (val: string) => void;
  onMalayalamChange: (val: string) => void;
  englishPlaceholder?: string;
  malayalamPlaceholder?: string;
  required?: boolean;
  isTextarea?: boolean;
  rows?: number;
  description?: string;
  className?: string;
}

export const BilingualInput: React.FC<BilingualInputProps> = ({
  label,
  englishValue,
  malayalamValue,
  onEnglishChange,
  onMalayalamChange,
  englishPlaceholder = 'Type in English...',
  malayalamPlaceholder = 'മലയാളത്തിൽ ടൈപ്പ് ചെയ്യുക...',
  required = false,
  isTextarea = false,
  rows = 3,
  description,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-baseline">
        <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
          {label} {required && <span className="text-forest">*</span>}
        </label>
        {description && (
          <span className="text-[11px] text-charcoal-muted">{description}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* English Input */}
        <div className="relative">
          <div className="absolute top-2.5 right-3 flex items-center space-x-1 pointer-events-none">
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-sand/40 text-charcoal-muted rounded border border-sand-border">
              EN
            </span>
          </div>
          {isTextarea ? (
            <textarea
              rows={rows}
              value={englishValue}
              onChange={(e) => onEnglishChange(e.target.value)}
              placeholder={englishPlaceholder}
              required={required}
              className="w-full pl-3.5 pr-12 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal placeholder-charcoal-muted/50 focus:outline-none focus:border-forest font-sans transition-colors resize-y leading-relaxed"
            />
          ) : (
            <input
              type="text"
              value={englishValue}
              onChange={(e) => onEnglishChange(e.target.value)}
              placeholder={englishPlaceholder}
              required={required}
              className="w-full pl-3.5 pr-12 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal placeholder-charcoal-muted/50 focus:outline-none focus:border-forest font-sans transition-colors"
            />
          )}
        </div>

        {/* Malayalam Input */}
        <div className="relative">
          <div className="absolute top-2.5 right-3 flex items-center space-x-1 pointer-events-none">
            <span className="px-1.5 py-0.5 text-[9px] font-malayalam font-bold tracking-wider bg-forest/10 text-forest rounded border border-forest/20">
              മലയാളം
            </span>
          </div>
          {isTextarea ? (
            <textarea
              rows={rows}
              value={malayalamValue}
              onChange={(e) => onMalayalamChange(e.target.value)}
              placeholder={malayalamPlaceholder}
              className="w-full pl-3.5 pr-16 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal placeholder-charcoal-muted/50 focus:outline-none focus:border-forest font-malayalam transition-colors resize-y leading-relaxed"
            />
          ) : (
            <input
              type="text"
              value={malayalamValue}
              onChange={(e) => onMalayalamChange(e.target.value)}
              placeholder={malayalamPlaceholder}
              className="w-full pl-3.5 pr-16 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal placeholder-charcoal-muted/50 focus:outline-none focus:border-forest font-malayalam transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  );
};

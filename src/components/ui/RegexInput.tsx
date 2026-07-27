import { useState, useCallback } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RegexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  testString?: string;
}

export function RegexInput({
  value,
  onChange,
  placeholder = 'Ej: championes?',
  disabled = false,
  className,
  label,
  helperText,
  testString,
}: RegexInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [testMatch, setTestMatch] = useState<boolean | null>(null);

  const validate = useCallback((pattern: string) => {
    if (!pattern) {
      setIsValid(null);
      setTestMatch(null);
      return;
    }
    try {
      new RegExp(pattern, 'gi');
      setIsValid(true);

      if (testString) {
        try {
          setTestMatch(new RegExp(pattern, 'gi').test(testString));
        } catch {
          setTestMatch(null);
        }
      }
    } catch {
      setIsValid(false);
      setTestMatch(null);
    }
  }, [testString]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    validate(newValue);
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-corporate-700">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 pr-10 text-sm border rounded-lg font-mono transition-colors',
            disabled
              ? 'bg-corporate-50 border-corporate-200 cursor-not-allowed'
              : 'bg-white outline-none',
            isValid === true && 'border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500',
            isValid === false && 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500',
            isValid === null && 'border-corporate-200 focus:ring-2 focus:ring-accent focus:border-accent',
          )}
        />
        {isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>

      {isValid === false && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Patrón regex inválido
        </p>
      )}

      {isValid === true && testString && testMatch !== null && (
        <p className={cn(
          'text-xs flex items-center gap-1',
          testMatch ? 'text-green-600' : 'text-corporate-400',
        )}>
          {testMatch ? (
            <><Check className="w-3 h-3" /> Coincide con "{testString}"</>
          ) : (
            <><Info className="w-3 h-3" /> No coincide con "{testString}"</>
          )}
        </p>
      )}

      {helperText && isValid !== false && (
        <p className="text-xs text-corporate-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {helperText}
        </p>
      )}
    </div>
  );
}

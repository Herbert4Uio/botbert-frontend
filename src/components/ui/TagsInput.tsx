import { useState, useRef, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  suggestions?: string[];
}

export function TagsInput({
  value = [],
  onChange,
  placeholder = 'Agregar y presionar Enter',
  disabled = false,
  className,
  suggestions = [],
}: TagsInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(s) &&
      input.length > 0,
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0 && input.length > 0) {
        addTag(filteredSuggestions[0]);
      } else {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-1.5 p-2 min-h-[42px] bg-white border rounded-lg transition-colors',
          disabled
            ? 'bg-corporate-50 border-corporate-200 cursor-not-allowed'
            : 'border-corporate-200 focus-within:ring-2 focus-within:ring-accent focus-within:border-accent',
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-sm font-medium rounded-md"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:bg-accent/20 rounded p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={handleKeyDown}
              placeholder={value.length === 0 ? placeholder : ''}
              className="w-full text-sm outline-none bg-transparent text-corporate-900 placeholder:text-corporate-400"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-corporate-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                {filteredSuggestions.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(s);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 text-corporate-700 flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3 text-corporate-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

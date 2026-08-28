import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MultiSelectProps {
  label: string;
  options: { label: string; value: string | number }[];
  selected: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  columns?: number;
}

export default function MultiSelect({ label, options, selected, onChange, columns = 1 }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string | number) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getGridClass = () => {
    if (columns === 3) return 'grid grid-cols-1 sm:grid-cols-3 sm:min-w-[450px] w-full sm:w-max p-2 gap-1';
    if (columns === 2) return 'grid grid-cols-1 sm:grid-cols-2 sm:min-w-[300px] w-full sm:w-max p-2 gap-1';
    return 'flex flex-col min-w-[180px] w-full sm:w-max';
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between min-w-[140px] h-[42px] bg-[#151F2E] border border-gray-700 hover:border-primary/50 transition-colors text-[#EDF1F5] text-sm rounded-md px-3 focus:outline-none focus:border-primary"
      >
        <span className="truncate pr-2">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 mt-1 bg-[#151F2E] border border-primary/20 rounded-lg shadow-xl z-50 ${getGridClass()}`}
          >
            {options.map((option) => {
              const isSelected = selected.includes(option.value);
              if (columns > 1) {
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors text-center truncate ${isSelected ? 'bg-primary text-[#0B0C0F]' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                  >
                    {option.label}
                  </button>
                );
              }

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#EDF1F5] hover:bg-white/5 border-b border-gray-800 last:border-0 transition-colors text-left"
                >
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-gray-500 bg-transparent'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

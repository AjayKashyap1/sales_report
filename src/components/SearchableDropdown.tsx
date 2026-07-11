import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, RotateCcw } from 'lucide-react';

interface SearchableDropdownProps {
  id: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (updated: string[]) => void;
  placeholder?: string;
}

export default function SearchableDropdown({
  id,
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Select options..."
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(val => val !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = () => {
    // Select all currently visible filtered options
    const newSelection = Array.from(new Set([...selectedValues, ...filteredOptions]));
    onChange(newSelection);
  };

  const handleClear = () => {
    // Clear only currently visible filtered options, or clear all if search is empty
    if (searchQuery) {
      onChange(selectedValues.filter(val => !filteredOptions.includes(val)));
    } else {
      onChange([]);
    }
  };

  // Button display text
  const buttonText = useMemo(() => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === options.length) {
      return `All (${options.length})`;
    }
    if (selectedValues.length <= 2) {
      return selectedValues.join(', ');
    }
    return `${selectedValues.length} Selected`;
  }, [selectedValues, options, placeholder]);

  return (
    <div 
      id={`searchable-dropdown-${id}`} 
      ref={containerRef} 
      className={`relative flex flex-col space-y-1.5 w-full ${isOpen ? 'z-50' : 'z-20'}`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 block font-mono">
        {label}
      </span>
      
      {/* Selector Button */}
      <button
        id={`btn-dropdown-${id}`}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery(''); // Reset search on open
        }}
        className={`flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold text-left transition-all duration-200 cursor-pointer shadow-2xs ${
          isOpen 
            ? 'border-blue-500 ring-2 ring-blue-500/15 text-slate-800 dark:text-slate-100 dark:ring-blue-500/20' 
            : 'border-slate-250 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
        }`}
      >
        <span className="truncate pr-2">
          {buttonText}
        </span>
        <ChevronDown 
          size={14} 
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
        />
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div 
          id={`dropdown-popover-${id}`}
          className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ minWidth: '220px' }}
        >
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={12} />
            </span>
            <input
              id={`dropdown-search-input-${id}`}
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()} // Prevent closing dropdown
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = selectedValues.includes(option);
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(option)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:bg-slate-800 focus:ring-blue-500/10 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="truncate">{option}</span>
                    {isSelected && (
                      <Check size={12} className="ml-auto text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </label>
                );
              })
            ) : (
              <div className="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500 italic">
                No matching options
              </div>
            )}
          </div>

          {/* Bottom Quick Actions (Select All / Clear) */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
            <button
              id={`btn-dropdown-select-all-${id}`}
              type="button"
              onClick={handleSelectAll}
              disabled={filteredOptions.length === 0}
              className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Select All
            </button>
            <button
              id={`btn-dropdown-clear-${id}`}
              type="button"
              onClick={handleClear}
              className="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer flex items-center gap-0.5 transition-colors"
            >
              <RotateCcw size={9} />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

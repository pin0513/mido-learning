'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  allowCustom?: boolean;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '輸入後按 Enter 新增',
  label,
  allowCustom = true,
  maxTags,
  className = '',
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already selected
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !value.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    if (maxTags && value.length >= maxTags) return;

    onChange([...value, trimmed]);
    setInput('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (allowCustom && input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      )}

      <div
        className="flex min-h-[42px] flex-wrap gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected tags */}
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="ml-1 rounded-full p-0.5 hover:bg-blue-200 focus:outline-none"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {/* Input */}
        {(!maxTags || value.length < maxTags) && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (input || filteredSuggestions.length > 0) && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Show filtered suggestions */}
          {filteredSuggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500">建議</div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className="mr-2 h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Show option to create new tag */}
          {allowCustom && input.trim() && !suggestions.some(s => s.toLowerCase() === input.trim().toLowerCase()) && (
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onClick={() => addTag(input)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg
                  className="mr-2 h-4 w-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增「{input.trim()}」
              </button>
            </div>
          )}

          {/* Empty state */}
          {filteredSuggestions.length === 0 && !input.trim() && (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              輸入文字開始搜尋
            </div>
          )}
        </div>
      )}

      {/* Quick suggestions (unselected popular tags) */}
      {suggestions.length > 0 && value.length === 0 && !showSuggestions && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">快速選擇：</span>
          {suggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

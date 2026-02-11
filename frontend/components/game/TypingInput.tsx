'use client';

import { useEffect, useRef } from 'react';

interface TypingInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TypingInput({
  value,
  onChange,
  disabled = false,
  placeholder = 'Start typing here...',
}: TypingInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus input when component mounts
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border-2 border-gray-300 bg-white p-4 font-mono text-lg text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
        rows={3}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <div className="mt-2 text-sm text-gray-500">
        <kbd className="rounded bg-gray-200 px-2 py-1 font-mono">Ctrl</kbd> +{' '}
        <kbd className="rounded bg-gray-200 px-2 py-1 font-mono">Enter</kbd> to
        submit (when complete)
      </div>
    </div>
  );
}

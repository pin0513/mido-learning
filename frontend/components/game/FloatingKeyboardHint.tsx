'use client';

import { useState } from 'react';

interface FloatingKeyboardHintProps {
  nextChar: string;
  currentInput: string;
  isVisible?: boolean;
}

const KEYBOARD_LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const HOME_ROW_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];

export function FloatingKeyboardHint({
  nextChar,
  currentInput,
  isVisible = true,
}: FloatingKeyboardHintProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  const nextKey = nextChar?.toLowerCase() || '';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`bg-white rounded-lg shadow-2xl border-2 border-blue-300 transition-all ${
          isMinimized ? 'w-12 h-12' : 'p-4'
        }`}
      >
        {isMinimized ? (
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center text-xl hover:bg-blue-50 rounded-lg"
          >
            ⌨️
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                ⌨️ 鍵盤提示
              </h3>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {KEYBOARD_LAYOUT.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1">
                  {row.map((key) => {
                    const isHomeRow = HOME_ROW_KEYS.includes(key);
                    const isNextKey = key === nextKey;
                    const wasRecentlyPressed =
                      currentInput.length > 0 &&
                      currentInput[currentInput.length - 1]?.toLowerCase() === key;

                    return (
                      <div
                        key={key}
                        className={`
                          w-8 h-8 flex items-center justify-center rounded text-sm font-medium
                          transition-all duration-200
                          ${
                            isNextKey
                              ? 'bg-blue-500 text-white scale-110 shadow-lg animate-pulse'
                              : wasRecentlyPressed
                              ? 'bg-green-400 text-white'
                              : isHomeRow
                              ? 'bg-yellow-100 text-gray-700 border border-yellow-300'
                              : 'bg-gray-200 text-gray-700'
                          }
                        `}
                      >
                        {key.toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-center text-gray-500">
              <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-1" />
              主鍵位 (Home Row)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

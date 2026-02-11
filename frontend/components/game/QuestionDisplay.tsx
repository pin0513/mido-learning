'use client';

interface QuestionDisplayProps {
  text: string;
  currentInput: string;
  isCorrectChar: (index: number) => boolean | null;
}

export function QuestionDisplay({
  text,
  currentInput,
  isCorrectChar,
}: QuestionDisplayProps) {
  return (
    <div className="rounded-lg bg-gray-50 p-8 text-center">
      <div className="inline-block text-left font-mono text-3xl leading-relaxed">
        {text.split('').map((char, index) => {
          const isTyped = index < currentInput.length;
          const isCorrect = isCorrectChar(index);

          let className = 'transition-colors duration-150';

          if (isTyped) {
            if (isCorrect) {
              className += ' text-green-600 font-semibold';
            } else {
              className += ' text-red-600 font-semibold bg-red-100 rounded';
            }
          } else if (index === currentInput.length) {
            // Current character to type
            className += ' text-gray-900 bg-blue-200 rounded animate-pulse';
          } else {
            // Not yet typed
            className += ' text-gray-400';
          }

          return (
            <span key={index} className={className}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    </div>
  );
}

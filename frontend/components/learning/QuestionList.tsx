'use client';

import { useState } from 'react';
import { Question, Category, getCategoryConfig } from '@/types/component';

interface QuestionListProps {
  questions: Question[];
  category?: Category | string;
}

interface QuestionItemProps {
  question: Question;
  category: Category | string;
  isOpen: boolean;
  onToggle: () => void;
}

function QuestionItem({ question, category, isOpen, onToggle }: QuestionItemProps) {
  const config = getCategoryConfig(category);

  return (
    <div className={`border rounded-lg overflow-hidden ${config.borderClass}`}>
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between p-4 text-left transition-colors ${
          isOpen ? config.bgClass : 'bg-white hover:bg-gray-50'
        }`}
      >
        <span className="font-medium text-gray-900 pr-4">{question.question}</span>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="border-t bg-white p-4">
          <p className="text-gray-700 whitespace-pre-wrap">{question.answer}</p>
        </div>
      )}
    </div>
  );
}

export function QuestionList({ questions, category = 'adult' }: QuestionListProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggleQuestion = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenIds(new Set(questions.map((q) => q.id)));
  };

  const collapseAll = () => {
    setOpenIds(new Set());
  };

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          問與答 ({questions.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            全部展開
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            全部收合
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {questions.map((question) => (
          <QuestionItem
            key={question.id}
            question={question}
            category={category}
            isOpen={openIds.has(question.id)}
            onToggle={() => toggleQuestion(question.id)}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, FormEvent, ChangeEvent } from 'react';

interface WishResponse {
  success: boolean;
  wishId: string;
}

// Submit wish to backend API
const submitWish = async (content: string, email?: string): Promise<WishResponse> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const response = await fetch(`${apiUrl}/api/wishes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, email: email || null }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to submit wish');
  }
  return { success: true, wishId: data.data?.wishId || 'unknown' };
};

const MaxContentLength = 500;

export function WishChatBot() {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MaxContentLength) {
      setContent(value);
      setError('');
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
  };

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Please tell us what you want to learn!');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await submitWish(content.trim(), email.trim() || undefined);
      if (result.success) {
        setIsSubmitted(true);
      }
    } catch {
      setError('Something went wrong. Please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setEmail('');
    setIsSubmitted(false);
    setError('');
  };

  if (isSubmitted) {
    return (
      <div className="mx-auto w-full max-w-[600px] px-4">
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 p-6 shadow-lg">
          <div className="flex flex-col items-center text-center">
            {/* Success Animation */}
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-10 w-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                  className="animate-[draw_0.5s_ease-out_forwards]"
                />
              </svg>
            </div>

            {/* Mascot */}
            <div className="mb-4 text-6xl">
              <span role="img" aria-label="Mido mascot celebrating">
                🎉🌱
              </span>
            </div>

            {/* Thank you message */}
            <div className="relative mb-4 rounded-2xl bg-white px-6 py-4 shadow-md">
              <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
              <p className="text-lg font-medium text-gray-800">
                Thank you for sharing your wish!
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Mido has received your message and will work hard to make it come true!
              </p>
            </div>

            <button
              onClick={handleReset}
              className="mt-4 rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              Make Another Wish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[600px] px-4">
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 p-6 shadow-lg">
        {/* Mascot and Chat Bubble */}
        <div className="mb-6 flex items-start gap-4">
          {/* Mido Mascot */}
          <div className="flex-shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
              <span className="text-3xl" role="img" aria-label="Mido mascot">
                🌱
              </span>
            </div>
            <p className="mt-1 text-center text-xs font-medium text-violet-600">Mido</p>
          </div>

          {/* Chat Bubble */}
          <div className="relative flex-1">
            <div className="rounded-2xl rounded-tl-none bg-white px-4 py-3 shadow-md">
              <p className="text-base font-medium text-gray-800">
                What do you want to learn? Tell Mido!
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Share your learning wishes and help us create better courses for you.
              </p>
            </div>
            {/* Chat bubble tail */}
            <div className="absolute -left-2 top-0 h-4 w-4 overflow-hidden">
              <div className="h-4 w-4 origin-bottom-right rotate-45 bg-white shadow-md" />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Textarea */}
          <div>
            <label htmlFor="wish-content" className="sr-only">
              Your learning wish
            </label>
            <textarea
              id="wish-content"
              value={content}
              onChange={handleContentChange}
              placeholder="I want to learn..."
              rows={4}
              className="block w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-0"
              disabled={isSubmitting}
            />
            <div className="mt-1 flex justify-end">
              <span
                className={`text-xs ${
                  content.length >= MaxContentLength ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                {content.length}/{MaxContentLength}
              </span>
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="wish-email" className="mb-1 block text-sm text-gray-600">
              Email (optional - we will notify you when your course is ready)
            </label>
            <input
              id="wish-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-0"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-base font-medium text-white shadow-md transition-all hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send Wish</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

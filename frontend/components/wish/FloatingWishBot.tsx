'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
}

interface WishResponse {
  success: boolean;
  wishId: string;
}

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

type ChatStep = 'greeting' | 'topic' | 'email' | 'complete';

export function FloatingWishBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<ChatStep>('greeting');
  const [wishContent, setWishContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("mido-open-wish", open);
    return () => window.removeEventListener("mido-open-wish", open);
  }, []);

  const addMessage = (type: 'bot' | 'user', content: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), type, content }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting
      setTimeout(() => {
        addMessage('bot', '嗨！我是 Mido 學習小精靈 🌱');
      }, 300);
      setTimeout(() => {
        addMessage('bot', '你想學什麼呢？告訴我你的學習願望，我們會努力為你創建課程！');
        setStep('topic');
      }, 800);
    }
  }, [isOpen, messages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userInput = input.trim();
    setInput('');
    addMessage('user', userInput);

    if (step === 'topic') {
      setWishContent(userInput);
      setTimeout(() => {
        addMessage('bot', '太棒了！這是很棒的學習目標 ✨');
      }, 500);
      setTimeout(() => {
        addMessage('bot', '如果你想在課程準備好時收到通知，可以留下你的 Email（直接按送出跳過）：');
        setStep('email');
      }, 1000);
    } else if (step === 'email') {
      // Submit wish
      setIsSubmitting(true);
      try {
        const email = userInput.includes('@') ? userInput : undefined;
        await submitWish(wishContent, email);
        setTimeout(() => {
          addMessage('bot', '感謝你分享學習願望！🎉');
        }, 500);
        setTimeout(() => {
          addMessage('bot', 'Mido 已經收到了，我們會努力實現它！想再許一個願望嗎？');
          setStep('complete');
        }, 1000);
      } catch {
        addMessage('bot', '抱歉，發生了一些問題。請稍後再試 🙏');
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 'complete') {
      // Start over
      setWishContent(userInput);
      setTimeout(() => {
        addMessage('bot', '收到新的願望了！要留下 Email 收到通知嗎？（直接送出跳過）');
        setStep('email');
      }, 500);
    }
  };

  const handleSkipEmail = async () => {
    if (step !== 'email' || isSubmitting) return;

    setIsSubmitting(true);
    addMessage('user', '（跳過 Email）');

    try {
      await submitWish(wishContent);
      setTimeout(() => {
        addMessage('bot', '感謝你分享學習願望！🎉');
      }, 500);
      setTimeout(() => {
        addMessage('bot', 'Mido 已經收到了，我們會努力實現它！想再許一個願望嗎？');
        setStep('complete');
      }, 1000);
    } catch {
      addMessage('bot', '抱歉，發生了一些問題。請稍後再試 🙏');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    switch (step) {
      case 'topic':
        return '例如：我想學 Python 程式設計...';
      case 'email':
        return '輸入 Email 或直接送出跳過';
      case 'complete':
        return '輸入新的學習願望...';
      default:
        return '輸入訊息...';
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-violet-600 hover:bg-violet-700 hover:scale-110'
        }`}
        aria-label={isOpen ? '關閉聊天' : '開啟學習願望聊天'}
      >
        {isOpen ? (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🌱</span>
        )}
      </button>

      {/* Badge */}
      {!isOpen && (
        <div className="fixed bottom-[88px] right-6 z-50 animate-bounce">
          <div className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white shadow-lg">
            許個學習願望吧！
          </div>
          <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-violet-600" />
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl sm:w-96">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <span className="text-xl">🌱</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Mido 學習小精靈</h3>
                <p className="text-xs text-white/80">分享你的學習願望</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto bg-gray-50 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.type === 'user'
                        ? 'rounded-br-sm bg-violet-600 text-white'
                        : 'rounded-bl-sm bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSubmitting && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getPlaceholder()}
                disabled={isSubmitting || step === 'greeting'}
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-100"
              />
              {step === 'email' ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleSkipEmail}
                    disabled={isSubmitting}
                    className="rounded-full bg-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-300 disabled:opacity-50"
                  >
                    跳過
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !input.trim()}
                    className="rounded-full bg-violet-600 p-2 text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !input.trim() || step === 'greeting'}
                  className="rounded-full bg-violet-600 p-2 text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}

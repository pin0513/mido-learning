'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { SiteMark } from '@/components/layout/SiteMark';

type UserRole = 'admin' | 'teacher' | 'member' | 'guest';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '系統管理員',
  teacher: '老師',
  member: '一般用戶',
  guest: '訪客',
};

// 深色頂列上的身分標籤：用知識地圖的學門淺色當底、墨色字（對比 9:1 以上）；訪客用比底色亮一階的灰綠。
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-d-pm text-ink',
  teacher: 'bg-d-it text-ink',
  member: 'bg-d-philosophy text-ink',
  guest: 'bg-board-3 text-chalk',
};

// 頂列和知識地圖（KpFrame）同一套：board 底、6px accent 頂邊、粉筆色字、膠囊按鈕，點擊區至少 44px。
const FOCUS = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent';
const NAV_LINK = `inline-flex min-h-11 items-center text-sm font-medium text-chalk transition-colors hover:text-accent ${FOCUS}`;
const PILL = `inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-[18px] text-sm font-bold transition-colors ${FOCUS}`;
const PILL_QUIET = `${PILL} bg-board-3 text-chalk hover:bg-board-4`;
const PILL_ACCENT = `${PILL} bg-accent text-ink hover:bg-[#ff7445]`;
const PILL_OUTLINE = `${PILL} border border-board-4 text-chalk hover:bg-board-3`;
const ROLE_BADGE = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold';
const MENU_LINK = `flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-chalk transition-colors hover:bg-board-3 ${FOCUS}`;

// 思考訓練所：外部決策練習網站（think.paulfun.net，站名「思考事件訓練所」），另開分頁。不是 Next 的路由，所以用 <a>，不用 <Link>。
const THINK_URL = 'https://think.paulfun.net';

// 和 MaterialHeader「另開分頁」同一個圖示，提示這是外部連結。
function ExternalLinkIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function Header() {
  const { user, signOut, loading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [roleLoading, setRoleLoading] = useState(false);
  const pathname = usePathname();
  // The mobile menu remembers the pathname it was opened on. Any route change
  // (link, back/forward, router.push) closes it; the reset happens during render
  // (React's "adjust state when a prop changes" pattern), not in an effect.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  if (menuOpenedAt !== null && menuOpenedAt !== pathname) {
    setMenuOpenedAt(null);
  }
  const mobileMenuOpen = menuOpenedAt !== null && menuOpenedAt === pathname;
  const setMobileMenuOpen = (open: boolean) => setMenuOpenedAt(open ? pathname : null);
  const [showKnowledgeMap, setShowKnowledgeMap] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flags loading while the external Firebase token refresh runs for the new user
      setRoleLoading(true);
      // Force refresh token to get latest custom claims
      user.getIdTokenResult(true).then((token) => {
        if (token.claims.admin) {
          setUserRole('admin');
        } else if (token.claims.teacher) {
          setUserRole('teacher');
        } else {
          setUserRole('member');
        }
        setRoleLoading(false);
      }).catch(() => {
        setUserRole('member');
        setRoleLoading(false);
      });
    } else {
      setUserRole('guest');
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kp-launch")
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => {
        if (!cancelled && data.enabled === true) setShowKnowledgeMap(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="relative z-50 border-t-[6px] border-accent bg-board font-kp text-chalk">
      <div className="flex min-h-[68px] items-center gap-8 px-[clamp(16px,2.6vw,40px)]">
        <Link href="/" className={`flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap text-[clamp(1.25rem,1.1rem+0.7vw,1.625rem)] font-black tracking-[-0.01em] text-chalk ${FOCUS}`}>
          <SiteMark className="h-[30px] w-[30px] shrink-0" />
          Mido Learning
        </Link>

        {/* Desktop Navigation: from lg (1024px). An admin has 7 items plus the user block, which
            doesn't fit on one line below that, so 768–1023 uses the menu button too. The signed-in
            role badge shows from lg (an admin's from xl: the 管理 button shows the role there); the
            email (truncated) shows from xl, and below that 登出 carries it. Below lg both are in the
            mobile menu. */}
        <nav className="ml-auto hidden items-center gap-6 whitespace-nowrap lg:flex">
          <Link href="/" className={NAV_LINK}>
            首頁
          </Link>
          {showKnowledgeMap ? (
            <Link href="/kp" className={NAV_LINK}>
              知識地圖
            </Link>
          ) : null}
          {user && (
            <>
              <Link href="/components" className={NAV_LINK}>
                教材清單
              </Link>
              <Link href="/skill-village" className={NAV_LINK}>
                技能村
              </Link>
            </>
          )}
          <a
            href={THINK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${NAV_LINK} gap-1`}
          >
            思考訓練所
            <ExternalLinkIcon />
            <span className="sr-only">（另開新分頁）</span>
          </a>
          <Link href="/experiments" className={PILL_OUTLINE}>
            🧪 試驗功能
          </Link>
          {userRole === 'admin' && (
            <Link href="/admin/components" className={PILL_QUIET}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              管理
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          {/* Desktop User Info */}
          {loading ? (
            <div className="h-11 w-20 animate-pulse rounded-full bg-board-3" />
          ) : user ? (
            <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
              {/* An admin's nav already has the 管理 button, and below xl there's no room for the badge. */}
              <div className={`${userRole === 'admin' ? 'hidden xl:flex' : 'flex'} items-center gap-2`}>
                <span className="hidden max-w-[10rem] truncate text-sm text-chalk-2 xl:inline" title={user.email ?? undefined}>{user.email}</span>
                {roleLoading ? (
                  <span className="h-5 w-16 animate-pulse rounded-full bg-board-3" />
                ) : (
                  <span className={`${ROLE_BADGE} ${ROLE_COLORS[userRole]}`}>
                    {ROLE_LABELS[userRole]}
                  </span>
                )}
              </div>
              {/* Below xl the email isn't shown, so 登出 carries it (tooltip + screen readers). */}
              <button type="button" className={PILL_QUIET} onClick={signOut} title={user.email ? `登出 ${user.email}` : undefined}>
                登出
                {user.email ? <span className="sr-only xl:hidden">（{user.email}）</span> : null}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
              <span className={`${ROLE_BADGE} ${ROLE_COLORS.guest}`}>
                {ROLE_LABELS.guest}
              </span>
              <Link href="/login" className={PILL_QUIET}>
                登入
              </Link>
              <Link href="/register" className={PILL_ACCENT}>
                註冊
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-board-3 text-chalk transition-colors hover:bg-board-4 lg:hidden ${FOCUS}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">開啟選單</span>
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-board-4 bg-board-2 lg:hidden">
          <div className="flex flex-col gap-1 px-[clamp(16px,2.6vw,40px)] py-3">
            <Link
              href="/"
              className={MENU_LINK}
              onClick={() => setMobileMenuOpen(false)}
            >
              首頁
            </Link>
            {showKnowledgeMap ? (
              <Link
                href="/kp"
                className={MENU_LINK}
                onClick={() => setMobileMenuOpen(false)}
              >
                知識地圖
              </Link>
            ) : null}
            {user && (
              <>
                <Link
                  href="/components"
                  className={MENU_LINK}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  教材清單
                </Link>
                <Link
                  href="/skill-village"
                  className={MENU_LINK}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  技能村
                </Link>
              </>
            )}
            <a
              href={THINK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${MENU_LINK} gap-1`}
              // Opening a new tab doesn't change this tab's route, so close the menu here (#84, #89).
              onClick={() => setMobileMenuOpen(false)}
            >
              思考訓練所
              <ExternalLinkIcon />
              <span className="sr-only">（另開新分頁）</span>
            </a>
            <Link
              href="/experiments"
              className={`${PILL_OUTLINE} self-start text-base`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🧪 試驗功能
            </Link>
            {userRole === 'admin' && (
              <Link
                href="/admin/components"
                className={`${PILL_QUIET} self-start text-base`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                管理
              </Link>
            )}
          </div>

          {/* Mobile User Info */}
          <div className="border-t border-board-4 px-[clamp(16px,2.6vw,40px)] py-3">
            {loading ? (
              <div className="h-11 w-full animate-pulse rounded-full bg-board-3" />
            ) : user ? (
              <div className="space-y-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm text-chalk-2">{user.email}</span>
                  {!roleLoading && (
                    <span className={`${ROLE_BADGE} ${ROLE_COLORS[userRole]}`}>
                      {ROLE_LABELS[userRole]}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Close the menu like every other menu item (#84); signing out
                    // doesn't change the route, so the pathname reset wouldn't close it.
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className={`${PILL_QUIET} w-full`}
                >
                  登出
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className={`${PILL_QUIET} w-full`} onClick={() => setMobileMenuOpen(false)}>
                  登入
                </Link>
                <Link href="/register" className={`${PILL_ACCENT} w-full`} onClick={() => setMobileMenuOpen(false)}>
                  註冊
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

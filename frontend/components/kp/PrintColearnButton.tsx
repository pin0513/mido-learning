"use client";

export function PrintColearnButton() {
  return (
    <button
      type="button"
      className="kp-no-print inline-flex min-h-11 items-center gap-2 border border-[#1a1614] bg-[#1a1614] px-4 text-sm font-semibold text-[#faf9f7] hover:bg-[#3d3830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
      onClick={() => {
        document.documentElement.classList.add("kp-print-colearn");
        const cleanup = () => {
          document.documentElement.classList.remove("kp-print-colearn");
          window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      列印共學卡
    </button>
  );
}

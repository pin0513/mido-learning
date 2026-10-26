const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden; }
  .kp-colearn-print, .kp-colearn-print * { visibility: visible; }
  .kp-colearn-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: 0 !important;
  }
  .kp-no-print { display: none !important; }
}
`;

export default function KpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#faf9f7] text-[#1a1614]">
      <style>{PRINT_CSS}</style>
      {children}
    </div>
  );
}

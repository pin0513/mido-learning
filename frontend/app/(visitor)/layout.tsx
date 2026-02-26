export default function VisitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50">
      {children}
    </div>
  );
}

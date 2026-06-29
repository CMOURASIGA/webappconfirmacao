import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import AppErrorBoundary from './components/AppErrorBoundary';
import AdminPanel from './components/AdminPanel';
import PublicConfirmationForm from './components/PublicConfirmationForm';

function resolveView(pathname: string, hash: string) {
  if (pathname === '/admin' || pathname === '/dashboard' || hash === '#/admin' || hash === '#/dashboard') {
    return 'admin';
  }

  return 'public';
}

export default function App() {
  if (import.meta.env.VITE_SITE_BLOCKED === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#09111f] text-white">
        <div className="max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
          <ShieldCheck size={44} className="mx-auto mb-4 text-[#9ad3ff]" />
          <h1 className="m-0 text-[28px] font-black">Sistema temporariamente indisponível</h1>
          <p className="mt-3 mb-0 text-white/75 text-[16px]">Voltaremos em breve.</p>
        </div>
      </div>
    );
  }

  const [view, setView] = useState(() => resolveView(window.location.pathname, window.location.hash));

  useEffect(() => {
    const updateView = () => {
      setView(resolveView(window.location.pathname, window.location.hash));
    };

    window.addEventListener('popstate', updateView);
    window.addEventListener('hashchange', updateView);

    return () => {
      window.removeEventListener('popstate', updateView);
      window.removeEventListener('hashchange', updateView);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b4f7a]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <BrandLogo size="sm" showText tone="light" />
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/75 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {view === 'admin' ? 'Área administrativa' : 'Formulário público'}
          </div>
        </div>
      </header>

      <AppErrorBoundary>
        {view === 'admin' ? <AdminPanel /> : <PublicConfirmationForm />}
      </AppErrorBoundary>
    </div>
  );
}

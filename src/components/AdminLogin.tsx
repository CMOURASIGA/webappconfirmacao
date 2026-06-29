import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import BrandLogo from './BrandLogo';

export default function AdminLogin({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (password: string) => Promise<void> | void;
}) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setLocalError('Informe a senha administrativa.');
      return;
    }
    setLocalError('');
    await onLogin(password.trim());
  };

  return (
    <section className="mx-auto max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-3">
        <BrandLogo size="sm" tone="dark" />
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Acesso restrito</div>
          <h2 className="mt-1 text-[24px] font-black text-slate-950">Login administrativo</h2>
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-6 text-slate-600">
        Use sua senha administrativa para cadastrar eventos, inativar registros e consultar confirmações.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a senha"
            className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0b4f7a]"
          />
        </div>

        {localError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{localError}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#0b4f7a] px-5 py-4 text-[15px] font-bold text-white transition hover:bg-[#0d5f92] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          Entrar
        </button>
      </form>
    </section>
  );
}

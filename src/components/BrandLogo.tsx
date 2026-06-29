const LOGO_URL = 'https://i.imgur.com/c5XQ7TW.jpg';

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
};

const sizeClassMap = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
} as const;

export default function BrandLogo({ size = 'md', showText = false, tone = 'light', className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src={LOGO_URL}
        alt="Logo EAC Porciúncula de Santana"
        className={`${sizeClassMap[size]} rounded-full object-cover ring-2 ring-white/40 shadow-lg`}
      />
      {showText ? (
        <div className="leading-tight">
          <div className={`text-[11px] uppercase tracking-[0.28em] ${tone === 'light' ? 'text-white/60' : 'text-slate-500'}`}>EAC</div>
          <div className={`text-[15px] font-semibold ${tone === 'light' ? 'text-white' : 'text-slate-950'}`}>Porciúncula de Santana</div>
        </div>
      ) : null}
    </div>
  );
}

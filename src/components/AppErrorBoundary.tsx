import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export default class AppErrorBoundary extends Component<Props, State> {
  declare props: Props;

  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado na interface.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('App error boundary:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b1220] p-6 text-white">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Erro de renderização</div>
            <h1 className="mt-3 text-[28px] font-black">A tela encontrou um problema</h1>
            <p className="mt-3 text-[15px] leading-7 text-white/75">
              O sistema não conseguiu continuar a renderização dessa tela. A mensagem abaixo ajuda a identificar o ponto exato da falha.
            </p>
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 p-4 text-[14px] text-rose-800">
              {this.state.errorMessage}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-[16px] bg-white px-4 py-3 text-[14px] font-bold text-slate-950"
              >
                Recarregar página
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="rounded-[16px] border border-white/15 bg-white/5 px-4 py-3 text-[14px] font-semibold text-white"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

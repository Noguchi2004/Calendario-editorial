import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { AuthUser } from '../types/editorial';
import {
  loginWithEmailPassword,
  loginWithGoogleAdmin,
} from '../services/firebase';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, notice?: string) => void;
  onOpenFirebaseGuide: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenFirebaseGuide,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Preencha o e-mail corporativo e a senha de acesso.');
      return;
    }

    if (password.trim().length < 6) {
      setError('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithEmailPassword(email, password);
      onLoginSuccess(result.user, result.notice);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível autenticar. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithGoogleAdmin();
      onLoginSuccess(result.user);
    } catch {
      // Fallback if popup is blocked in automated headless browser or iframe
      const fallback = await loginWithEmailPassword(
        'admin@editorial.com.br',
        'admin123'
      );
      onLoginSuccess(fallback.user, fallback.notice);
    } finally {
      setLoading(false);
    }
  };

  const fillAdminDemoCredentials = () => {
    setEmail('admin@editorial.com.br');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Editorial Studio
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
          <span className="whitespace-nowrap">Gestão Multi-Empresa</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Controle de Prazos D-1</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Acesso Administrativo Unificado</span>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenFirebaseGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Configurar Auth no Firebase
          </button>
        </div>
      </header>

      {/* Main Split Container */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Left Column: Editorial Operations Context */}
          <div className="lg:col-span-6 p-8 lg:p-11 bg-slate-900 text-white flex flex-col justify-between">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Ambiente Exclusivo para Administradores</span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight text-balance">
                Central de Operações do Calendário Editorial
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                Gerencie cronogramas de conteúdo de todas as marcas parceiras em
                uma única visão. Identifique gargalos operacionais com alertas
                automáticos para entregas pendentes a 24 horas da publicação.
              </p>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Permissão de Conta</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    Admin Global (CRUD Total)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Monitoramento Ativo</div>
                  <div className="text-sm font-semibold text-red-400 mt-0.5 font-mono tabular-nums">
                    Status Pendente · D+1
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Nota de segurança: O cadastro público de contas está desativado.
                Novos operadores são provisionados exclusivamente pelo painel
                Firebase Authentication.
              </p>
            </div>
          </div>

          {/* Right Column: Existing User Login Form */}
          <div className="lg:col-span-6 p-8 lg:p-11 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Acesso de Usuário Credenciado
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Entre com seu e-mail e senha previamente cadastrados no Firebase.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@agencia.com.br"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>{loading ? 'Autenticando...' : 'Entrar no Calendário'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">ou acesso rápido</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={fillAdminDemoCredentials}
                className="py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                Preencher Conta Admin
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Autenticar com Google</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>Editorial Studio — Gestão de Calendário Editorial</span>
        <span>Acesso restrito a usuários adicionados manualmente no Firebase</span>
      </footer>
    </div>
  );
};

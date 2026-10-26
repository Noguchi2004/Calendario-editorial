import React from 'react';
import { CheckCircle2, ExternalLink, Shield, X } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface FirebaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const projectId = firebaseConfig?.projectId || 'seu-projeto-firebase';
  const consoleAuthUrl = `https://console.firebase.google.com/project/${projectId}/authentication/providers`;
  const consoleUsersUrl = `https://console.firebase.google.com/project/${projectId}/authentication/users`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firebase-guide-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-slate-900" />
            <h2
              id="firebase-guide-title"
              className="text-base font-bold text-slate-900"
            >
              Guia de Configuração Firebase Auth (E-mail e Senha)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar guia"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-semibold text-slate-900 mb-1">
              Projeto Firebase Provisionado
            </div>
            <div className="font-mono text-slate-600">
              Project ID: <strong className="text-slate-900">{projectId}</strong>
            </div>
            <div className="font-mono text-slate-600 mt-0.5">
              Coleção Firestore: <strong className="text-slate-900">posts</strong>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Passo a passo para habilitar usuários manuais (E-mail/Senha):
            </h3>

            <ol className="space-y-3 list-decimal list-inside">
              <li>
                <strong>Habilitar o provedor E-mail/Senha:</strong> Acesse a aba{' '}
                <a
                  href={consoleAuthUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 font-semibold underline inline-flex items-center gap-1"
                >
                  Sign-in method no Console do Firebase
                  <ExternalLink className="w-3 h-3" />
                </a>
                , clique em <strong>E-mail/senha</strong>, ative a primeira
                chave (&quot;Ativar&quot;) e clique em <strong>Salvar</strong>.
              </li>
              <li>
                <strong>Adicionar usuários manualmente (Admin):</strong> Como o
                aplicativo não possui formulário público de criação de conta,
                acesse a aba{' '}
                <a
                  href={consoleUsersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 font-semibold underline inline-flex items-center gap-1"
                >
                  Users (Usuários)
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                e clique em <strong>Adicionar usuário</strong> informando o
                e-mail e a senha de cada membro da equipe.
              </li>
              <li>
                <strong>Modo de Simulação Automático:</strong> Enquanto o
                provedor E-mail/Senha não estiver ativo ou para testes rápidos,
                o aplicativo opera automaticamente com persistência simulada
                completa para que todas as funcionalidades possam ser validadas
                imediatamente.
              </li>
            </ol>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              As regras de segurança (<code className="font-mono">firestore.rules</code>)
              já estão implantadas garantindo que todos os usuários autenticados
              tenham permissão de Admin sobre a coleção <code className="font-mono">posts</code>.
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Entendi, fechar guia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

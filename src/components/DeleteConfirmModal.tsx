import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { EditorialPost } from '../types/editorial';
import { formatDisplayDateBR } from '../utils/editorialLogic';

interface DeleteConfirmModalProps {
  post: EditorialPost | null;
  onCancel: () => void;
  onConfirm: (postId: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  post,
  onCancel,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false);

  if (!post) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm(post.id);
      onCancel();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-red-50/60">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <h2
              id="delete-modal-title"
              className="text-base font-bold text-slate-900"
            >
              Confirmar Exclusão
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Tem certeza que deseja excluir permanentemente esta postagem do
            calendário editorial? Esta ação não poderá ser desfeita.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
            <div className="font-semibold text-slate-900">
              {post.empresa} · {post.formato}
            </div>
            <div className="text-slate-600 line-clamp-2">{post.conteudo}</div>
            <div className="text-slate-500 font-mono tabular-nums pt-1">
              Data: {formatDisplayDateBR(post.data)} ({post.data}) · Responsável:{' '}
              {post.responsavel}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? 'Excluindo...' : 'Sim, Excluir Postagem'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

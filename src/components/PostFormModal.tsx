import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, X } from 'lucide-react';
import {
  EditorialPost,
  POST_FORMAT_OPTIONS,
  POST_STATUS_OPTIONS,
  PostFormat,
  PostFormInput,
  PostStatus,
} from '../types/editorial';
import {
  getRelativeDateString,
  isUrgentPendingPost,
  validatePostInput,
} from '../utils/editorialLogic';

interface PostFormModalProps {
  isOpen: boolean;
  editingPost: EditorialPost | null;
  existingCompanies: string[];
  onClose: () => void;
  onSave: (input: PostFormInput) => Promise<void>;
}

export const PostFormModal: React.FC<PostFormModalProps> = ({
  isOpen,
  editingPost,
  existingCompanies,
  onClose,
  onSave,
}) => {
  const tomorrowStr = getRelativeDateString(1);
  const todayStr = getRelativeDateString(0);
  const inThreeDaysStr = getRelativeDateString(3);

  const [empresa, setEmpresa] = useState('');
  const [data, setData] = useState(tomorrowStr);
  const [formato, setFormato] = useState<PostFormat>('Reels');
  const [objetivo, setObjetivo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [status, setStatus] = useState<PostStatus>('Pendente');
  const [responsavel, setResponsavel] = useState('');
  const [briefingUrl, setBriefingUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (editingPost) {
      setEmpresa(editingPost.empresa);
      setData(editingPost.data);
      setFormato(editingPost.formato);
      setObjetivo(editingPost.objetivo);
      setConteudo(editingPost.conteudo);
      setStatus(editingPost.status);
      setResponsavel(editingPost.responsavel);
      setBriefingUrl(editingPost.briefing_url);
    } else {
      setEmpresa('');
      setData(tomorrowStr);
      setFormato('Reels');
      setObjetivo('');
      setConteudo('');
      setStatus('Pendente');
      setResponsavel('');
      setBriefingUrl('');
    }
  }, [isOpen, editingPost, tomorrowStr]);

  if (!isOpen) return null;

  const willTriggerUrgentAlert = isUrgentPendingPost({ status, data });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePostInput({
      empresa,
      data,
      formato,
      objetivo,
      conteudo,
      status,
      responsavel,
      briefing_url: briefingUrl,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSave(validation.sanitized);
      onClose();
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : 'Erro ao salvar postagem. Verifique os dados informados.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-post-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2
              id="modal-post-title"
              className="text-base font-bold text-slate-900"
            >
              {editingPost ? 'Editar Postagem Editorial' : 'Nova Postagem Editorial'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Preencha os metadados da publicação para sincronizar na coleção{' '}
              <span className="font-mono">posts</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Alert Preview Banner if Pendente + Tomorrow */}
        {willTriggerUrgentAlert ? (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2.5 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Alerta Crítico D-1 Ativo:</strong> Esta postagem está com
              status <strong>Pendente</strong> e agendada para{' '}
              <strong className="font-mono">{data}</strong> (amanhã). Ela será
              destacada em vermelho no painel.
            </span>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Prazo regular: sem alerta crítico de véspera para a combinação
              atual de data e status.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {errors.form && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
            >
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Empresa */}
            <div>
              <label
                htmlFor="post-empresa"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Empresa / Cliente *
              </label>
              <input
                id="post-empresa"
                list="empresas-sugeridas"
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: Nubank Brasil"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <datalist id="empresas-sugeridas">
                {existingCompanies.map((comp) => (
                  <option key={comp} value={comp} />
                ))}
              </datalist>
              {errors.empresa && (
                <p className="text-xs text-red-600 mt-1">{errors.empresa}</p>
              )}
            </div>

            {/* Responsável */}
            <div>
              <label
                htmlFor="post-responsavel"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Responsável *
              </label>
              <input
                id="post-responsavel"
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Ex: Mariana Costa"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.responsavel && (
                <p className="text-xs text-red-600 mt-1">{errors.responsavel}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data (YYYY-MM-DD) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="post-data"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Data (AAAA-MM-DD) *
                </label>
              </div>
              <div className="relative">
                <input
                  id="post-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setData(todayStr)}
                  className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Hoje
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setData(tomorrowStr)}
                  className="text-[11px] font-medium text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Amanhã (D+1)
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setData(inThreeDaysStr)}
                  className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  +3 dias
                </button>
              </div>
              {errors.data && (
                <p className="text-xs text-red-600 mt-1">{errors.data}</p>
              )}
            </div>

            {/* Formato */}
            <div>
              <label
                htmlFor="post-formato"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Formato *
              </label>
              <select
                id="post-formato"
                value={formato}
                onChange={(e) => setFormato(e.target.value as PostFormat)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {POST_FORMAT_OPTIONS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
              {errors.formato && (
                <p className="text-xs text-red-600 mt-1">{errors.formato}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="post-status"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Status Editorial *
              </label>
              <select
                id="post-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {POST_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="text-xs text-red-600 mt-1">{errors.status}</p>
              )}
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label
              htmlFor="post-objetivo"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Objetivo da Publicação *
            </label>
            <input
              id="post-objetivo"
              type="text"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ex: Educação Financeira, Geração de Leads, Lançamento..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {errors.objetivo && (
              <p className="text-xs text-red-600 mt-1">{errors.objetivo}</p>
            )}
          </div>

          {/* Conteúdo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="post-conteudo"
                className="block text-xs font-semibold text-slate-700"
              >
                Conteúdo / Direcionamento de Copy *
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {conteudo.length}/2000
              </span>
            </div>
            <textarea
              id="post-conteudo"
              rows={3}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Descreva a pauta, gancho criativo, roteiro ou legenda da postagem..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {errors.conteudo && (
              <p className="text-xs text-red-600 mt-1">{errors.conteudo}</p>
            )}
          </div>

          {/* Briefing URL */}
          <div>
            <label
              htmlFor="post-briefing-url"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              URL do Briefing (Google Docs, Notion, Figma)
            </label>
            <input
              id="post-briefing-url"
              type="url"
              value={briefingUrl}
              onChange={(e) => setBriefingUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {errors.briefing_url && (
              <p className="text-xs text-red-600 mt-1">{errors.briefing_url}</p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Salvando...'
                  : editingPost
                    ? 'Salvar Alterações'
                    : 'Criar Postagem'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

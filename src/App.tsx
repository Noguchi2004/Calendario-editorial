/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './services/firebase';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Filter,
  HelpCircle,
  LayoutGrid,
  List,
  LogOut,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';

import { PlanilhaImporter } from './components/PlanilhaImporter';

import {
  AuthUser,
  EditorialPost,
  POST_STATUS_OPTIONS,
  PostFilters,
  PostFormInput,
} from './types/editorial';
import {
  computeEditorialMetrics,
  extractUniqueCompanies,
  filterPosts,
  formatDisplayDateBR,
  getRelativeDateLabel,
  getRelativeDateString,
  isUrgentPendingPost,
} from './utils/editorialLogic';
import { LoginView } from './components/LoginView';
import { PostFormModal } from './components/PostFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<'firebase' | 'simulated'>('firebase');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Filters & View State atualizado com Período
  const [filters, setFilters] = useState<PostFilters & { periodo?: string }>({
    empresa: 'TODAS',
    status: 'TODOS',
    search: '',
    onlyUrgentAlerts: false,
    periodo: 'TODOS'
  });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<EditorialPost | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Subscribe to Auth state real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          role: 'Admin',
        });
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Posts real-time
  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EditorialPost[];
      
      setPosts(fetchedPosts);
      setPostsLoading(false);
    }, (error) => {
      console.error('Erro ao ler posts:', error);
      setPostsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const todayStr = useMemo(() => getRelativeDateString(0), []);
  const tomorrowStr = useMemo(() => getRelativeDateString(1), []);

  const companies = useMemo(() => extractUniqueCompanies(posts), [posts]);
  const filteredPosts = useMemo(
    () => filterPosts(posts, filters, todayStr),
    [posts, filters, todayStr]
  );
  const metrics = useMemo(
    () => computeEditorialMetrics(posts, todayStr),
    [posts, todayStr]
  );

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setIsPostModalOpen(true);
  };

  const handleOpenEditModal = (post: EditorialPost) => {
    setEditingPost(post);
    setIsPostModalOpen(true);
  };

  const handleSavePost = async (input: PostFormInput) => {
    try {
      if (editingPost) {
        await updateDoc(doc(db, "posts", editingPost.id), input as any);
      } else {
        await addDoc(collection(db, "posts"), input);
      }
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
      alert("Erro ao gravar os dados. Verifique as regras do Firestore.");
    }
  };

  const handleConfirmDelete = async (postId: string) => {
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPostToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      empresa: 'TODAS',
      status: 'TODOS',
      search: '',
      onlyUrgentAlerts: false,
      periodo: 'TODOS'
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setBannerNotice(null);
  };

  const hasActiveFilters =
    filters.empresa !== 'TODAS' ||
    filters.status !== 'TODOS' ||
    filters.search.trim() !== '' ||
    filters.onlyUrgentAlerts ||
    (filters.periodo && filters.periodo !== 'TODOS');

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">
          Inicializando ambiente editorial...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={(user, notice) => {
            setCurrentUser(user);
            if (notice) setBannerNotice(notice);
          }}
          onOpenFirebaseGuide={() => setIsGuideOpen(true)}
        />
        <FirebaseGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="flex items-center justify-between gap-8 px-6 lg:px-10 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleClearFilters();
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Editorial Studio
        </a>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={handleClearFilters}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !hasActiveFilters ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Visão Geral
          </button>
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                onlyUrgentAlerts: !prev.onlyUrgentAlerts,
              }))
            }
            className={`hover:text-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filters.onlyUrgentAlerts
                ? 'text-red-700 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Alertas D+1 ({metrics.urgentAlertsCount})
          </button>
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                status: prev.status === 'Pendente' ? 'TODOS' : 'Pendente',
                onlyUrgentAlerts: false,
              }))
            }
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filters.status === 'Pendente' && !filters.onlyUrgentAlerts
                ? 'text-slate-900 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Fila Pendente ({metrics.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Configuração Firebase
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Post</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-6 lg:px-10 py-6 space-y-6">

        <PlanilhaImporter onImport={handleSavePost} todayStr={todayStr} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900">
              Calendário Editorial Multi-Empresa
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Operador: {currentUser.email}</span>
              <span aria-hidden="true">·</span>
              <span>Permissão: {currentUser.role} Global</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Referência Hoje: {formatDisplayDateBR(todayStr)} ({todayStr})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Guia Firebase</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {metrics.urgentAlertsCount > 0 && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-600 text-white shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-950">
                  Atenção: {metrics.urgentAlertsCount}{' '}
                  {metrics.urgentAlertsCount === 1
                    ? 'postagem pendente agendada'
                    : 'postagens pendentes agendadas'}{' '}
                  para amanhã ({formatDisplayDateBR(tomorrowStr)})
                </h2>
                <p className="text-xs text-red-800 mt-0.5">
                  Postagens com status <strong>Pendente</strong> e data
                  exatamente 1 dia no futuro (
                  <span className="font-mono">{tomorrowStr}</span>) estão
                  destacadas em vermelho na lista abaixo para priorização
                  imediata.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  onlyUrgentAlerts: !prev.onlyUrgentAlerts,
                }))
              }
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.onlyUrgentAlerts
                  ? 'bg-red-900 text-white hover:bg-red-950'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {filters.onlyUrgentAlerts
                ? 'Mostrar Todos os Posts'
                : 'Filtrar Apenas Alertas D+1'}
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
          <div className="p-4 lg:p-5">
            <div className="text-xs font-medium text-slate-500">
              Total de Postagens
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {metrics.total}
              </span>
              <span className="text-xs text-slate-500">
                {companies.length} empresas
              </span>
            </div>
          </div>

          <div className={`p-4 lg:p-5 ${metrics.urgentAlertsCount > 0 ? 'bg-red-50/50' : ''}`}>
            <div className="text-xs font-medium text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Alertas Pendentes (Amanhã)</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-red-600 font-mono tabular-nums">
                {metrics.urgentAlertsCount}
              </span>
              <span className="text-xs font-mono text-red-700 tabular-nums">
                {tomorrowStr}
              </span>
            </div>
          </div>

          <div className="p-4 lg:p-5">
            <div className="text-xs font-medium text-slate-500">
              Total em Status Pendente
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
                {metrics.pendingCount}
              </span>
              <span className="text-xs text-slate-500">
                Aguardando início
              </span>
            </div>
          </div>

          <div className="p-4 lg:p-5">
            <div className="text-xs font-medium text-slate-500">
              Em Fluxo · Publicados
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
                {metrics.inProductionCount + metrics.publishedCount}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {metrics.publishedCount} publicados
              </span>
            </div>
          </div>
        </section>

        {/* NOVA BARRA DE FILTROS SUPER LIMPA */}
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Buscar conteúdo, empresa, responsável..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400 hidden sm:block" />
                <select
                  value={filters.empresa}
                  onChange={(e) => setFilters((prev) => ({ ...prev, empresa: e.target.value }))}
                  className="pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-xs"
                >
                  <option value="TODAS">Empresa: Todas</option>
                  {companies.map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-xs"
                >
                  <option value="TODOS">Status: Todos</option>
                  {POST_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
                <select
                  value={filters.periodo || 'TODOS'}
                  onChange={(e) => setFilters((prev) => ({ ...prev, periodo: e.target.value }))}
                  className="pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-xs"
                >
                  <option value="TODOS">Período: Todos</option>
                  <option value="SEMANA">Próximos 7 dias</option>
                  <option value="MES">Próximos 30 dias</option>
                  <option value="TRIMESTRE">Neste Trimestre</option>
                  <option value="SEMESTRE">Neste Semestre</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 xl:border-l border-slate-200 xl:pl-4">
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    onlyUrgentAlerts: !prev.onlyUrgentAlerts,
                  }))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer shadow-xs ${
                  filters.onlyUrgentAlerts
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Alertas Amanhã</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Limpar
                </button>
              )}

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg ml-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {postsLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-3">
            {[1, 2, 3, 4].map((skeleton) => (
              <div
                key={skeleton}
                className="h-12 bg-slate-100 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Nenhuma postagem encontrada
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {hasActiveFilters
                  ? 'Não há postagens que correspondam aos filtros selecionados no momento.'
                  : 'O calendário editorial ainda não possui postagens cadastradas.'}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Novo Post</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Empresa & Formato</th>
                    <th className="py-3 px-4">Data Programada</th>
                    <th className="py-3 px-4">Objetivo & Conteúdo</th>
                    <th className="py-3 px-4">Status Editorial</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4">Briefing</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredPosts.map((post) => {
                    const isUrgent = isUrgentPendingPost(post, todayStr);
                    const relativeLabel = getRelativeDateLabel(post.data, todayStr);

                    return (
                      <tr
                        key={post.id}
                        className={`transition-colors ${
                          isUrgent
                            ? 'bg-red-50/90 hover:bg-red-100/80 text-red-950'
                            : 'hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900">
                            {post.empresa}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {post.formato}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isUrgent && (
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span
                              className={`font-mono tabular-nums font-semibold ${
                                isUrgent ? 'text-red-700' : 'text-slate-900'
                              }`}
                            >
                              {post.data}
                            </span>
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              isUrgent
                                ? 'text-red-700 font-semibold'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatDisplayDateBR(post.data)} · {relativeLabel}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-md">
                          <div className="font-semibold text-slate-900">
                            {post.objetivo}
                          </div>
                          <p className="text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {post.conteudo}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {isUrgent ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 font-bold text-red-700">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                <span>Pendente · Prazo Amanhã</span>
                              </div>
                              <div className="text-[11px] text-red-600">
                                Ação Imediata Requerida
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 font-semibold">
                              {post.status === 'Publicado' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span
                                className={
                                  post.status === 'Publicado'
                                    ? 'text-emerald-700'
                                    : post.status === 'Aprovado'
                                      ? 'text-slate-900'
                                      : post.status === 'Pendente'
                                        ? 'text-amber-700'
                                        : 'text-slate-700'
                                }
                              >
                                {post.status}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>{post.responsavel}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {post.briefing_url ? (
                            <a
                              href={post.briefing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium underline underline-offset-2"
                            >
                              <span>Abrir Briefing</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">Sem link</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(post)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostToDelete(post)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => {
              const isUrgent = isUrgentPendingPost(post, todayStr);
              const relativeLabel = getRelativeDateLabel(post.data, todayStr);

              return (
                <article
                  key={post.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                    isUrgent
                      ? 'bg-red-50/90 border-red-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <span>{post.empresa}</span>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span className="font-normal text-slate-600">
                          {post.formato}
                        </span>
                      </div>

                      <div className="font-mono tabular-nums text-xs font-semibold flex items-center gap-1">
                        {isUrgent && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span
                          className={
                            isUrgent ? 'text-red-700' : 'text-slate-700'
                          }
                        >
                          {post.data}
                        </span>
                      </div>
                    </div>

                    {isUrgent && (
                      <div className="p-2.5 rounded-lg bg-red-100/90 border border-red-200 flex items-center gap-2 text-xs font-semibold text-red-800">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Alerta: Post Pendente agendado para Amanhã</span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {post.objetivo}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {post.conteudo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <div>
                        Status:{' '}
                        <strong
                          className={
                            isUrgent
                              ? 'text-red-700'
                              : post.status === 'Publicado'
                                ? 'text-emerald-700'
                                : 'text-slate-900'
                          }
                        >
                          {post.status}
                        </strong>{' '}
                        · {relativeLabel}
                      </div>
                      <div>Resp: {post.responsavel}</div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {post.briefing_url ? (
                        <a
                          href={post.briefing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 underline"
                        >
                          <span>Ver Briefing</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sem briefing
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(post)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostToDelete(post)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <PostFormModal
        isOpen={isPostModalOpen}
        editingPost={editingPost}
        existingCompanies={companies}
        onClose={() => setIsPostModalOpen(false)}
        onSave={handleSavePost}
      />

      <DeleteConfirmModal
        post={postToDelete}
        onCancel={() => setPostToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <FirebaseGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
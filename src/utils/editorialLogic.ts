import {
  EditorialMetrics,
  EditorialPost,
  PostFilters,
  PostFormInput,
  POST_FORMAT_OPTIONS,
  POST_STATUS_OPTIONS,
} from '../types/editorial';

/**
 * Formats a Date object as local YYYY-MM-DD string.
 */
export function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a YYYY-MM-DD date string offset by `daysOffset` days from `baseDate`.
 */
export function getRelativeDateString(
  daysOffset: number,
  baseDate: Date = new Date()
): string {
  const copy = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  );
  copy.setDate(copy.getDate() + daysOffset);
  return formatLocalDateYYYYMMDD(copy);
}

/**
 * Business Rule: Visual Alert System
 * Returns true if and only if the post's status is 'Pendente' AND
 * its date (YYYY-MM-DD) is exactly 1 day in the future relative to the current date.
 */
export function isUrgentPendingPost(
  post: Pick<EditorialPost, 'status' | 'data'>,
  referenceTodayStr?: string
): boolean {
  if (post.status !== 'Pendente') {
    return false;
  }

  let tomorrowStr: string;
  if (referenceTodayStr && /^\d{4}-\d{2}-\d{2}$/.test(referenceTodayStr)) {
    const [y, m, d] = referenceTodayStr.split('-').map(Number);
    const refDate = new Date(y, m - 1, d);
    tomorrowStr = getRelativeDateString(1, refDate);
  } else {
    tomorrowStr = getRelativeDateString(1);
  }

  return post.data === tomorrowStr;
}

/**
 * Formats a YYYY-MM-DD string into Brazilian display format DD/MM/YYYY.
 */
export function formatDisplayDateBR(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Returns a human-readable relative label for a YYYY-MM-DD date compared to today.
 */
export function getRelativeDateLabel(
  dateStr: string,
  referenceTodayStr?: string
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return '';
  }
  const todayStr = referenceTodayStr || getRelativeDateString(0);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [py, pm, pd] = dateStr.split('-').map(Number);

  const todayMs = new Date(ty, tm - 1, td).getTime();
  const postMs = new Date(py, pm - 1, pd).getTime();
  const diffDays = Math.round((postMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã (+1d)';
  if (diffDays === -1) return 'Ontem';
  if (diffDays > 1) return `Em ${diffDays} dias`;
  return `Há ${Math.abs(diffDays)} dias`;
}

/**
 * Filters and sorts posts according to active company, status, search query, and urgent alert flag.
 * Urgent pending posts (tomorrow + Pendente) are prioritized or highlighted clearly, sorted by date ascending.
 */
export function filterPosts(
  posts: EditorialPost[],
  filters: PostFilters,
  referenceTodayStr?: string
): EditorialPost[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return posts
    .filter((post) => {
      if (filters.empresa && filters.empresa !== 'TODAS') {
        if (post.empresa !== filters.empresa) return false;
      }

      if (filters.status && filters.status !== 'TODOS') {
        if (post.status !== filters.status) return false;
      }

      if (filters.onlyUrgentAlerts) {
        if (!isUrgentPendingPost(post, referenceTodayStr)) return false;
      }

      if (normalizedSearch.length > 0) {
        const haystack = [
          post.empresa,
          post.objetivo,
          post.conteudo,
          post.responsavel,
          post.formato,
          post.status,
          post.data,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aUrgent = isUrgentPendingPost(a, referenceTodayStr) ? 0 : 1;
      const bUrgent = isUrgentPendingPost(b, referenceTodayStr) ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      return a.data.localeCompare(b.data);
    });
}

/**
 * Extracts unique sorted company names from the posts list.
 */
export function extractUniqueCompanies(posts: EditorialPost[]): string[] {
  const set = new Set<string>();
  for (const post of posts) {
    const trimmed = post.empresa.trim();
    if (trimmed) set.add(trimmed);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Computes summary metrics for the dashboard header.
 */
export function computeEditorialMetrics(
  posts: EditorialPost[],
  referenceTodayStr?: string
): EditorialMetrics {
  let urgentAlertsCount = 0;
  let pendingCount = 0;
  let inProductionCount = 0;
  let publishedCount = 0;

  for (const post of posts) {
    if (isUrgentPendingPost(post, referenceTodayStr)) {
      urgentAlertsCount += 1;
    }
    if (post.status === 'Pendente') {
      pendingCount += 1;
    } else if (
      post.status === 'Em Produção' ||
      post.status === 'Em Aprovação' ||
      post.status === 'Aprovado'
    ) {
      inProductionCount += 1;
    } else if (post.status === 'Publicado') {
      publishedCount += 1;
    }
  }

  return {
    total: posts.length,
    urgentAlertsCount,
    pendingCount,
    inProductionCount,
    publishedCount,
  };
}

/**
 * Validates form input against firebase-blueprint.json constraints.
 */
export function validatePostInput(
  input: PostFormInput
): { valid: true; sanitized: PostFormInput } | { valid: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const empresa = input.empresa.trim();
  const data = input.data.trim();
  const formato = input.formato;
  const objetivo = input.objetivo.trim();
  const conteudo = input.conteudo.trim();
  const status = input.status;
  const responsavel = input.responsavel.trim();
  const briefing_url = input.briefing_url.trim();

  if (!empresa) {
    errors.empresa = 'Informe o nome da empresa.';
  } else if (empresa.length > 120) {
    errors.empresa = 'O nome da empresa deve ter no máximo 120 caracteres.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    errors.data = 'Informe uma data válida no formato AAAA-MM-DD.';
  }

  if (!POST_FORMAT_OPTIONS.includes(formato)) {
    errors.formato = 'Selecione um formato válido.';
  }

  if (!objetivo) {
    errors.objetivo = 'Informe o objetivo estratégico da postagem.';
  } else if (objetivo.length > 200) {
    errors.objetivo = 'O objetivo deve ter no máximo 200 caracteres.';
  }

  if (!conteudo) {
    errors.conteudo = 'Descreva o conteúdo ou copy da postagem.';
  } else if (conteudo.length > 2000) {
    errors.conteudo = 'O conteúdo deve ter no máximo 2000 caracteres.';
  }

  if (!POST_STATUS_OPTIONS.includes(status)) {
    errors.status = 'Selecione um status válido.';
  }

  if (!responsavel) {
    errors.responsavel = 'Informe a pessoa responsável.';
  } else if (responsavel.length > 120) {
    errors.responsavel = 'O nome do responsável deve ter no máximo 120 caracteres.';
  }

  if (briefing_url.length > 0) {
    if (briefing_url.length > 500) {
      errors.briefing_url = 'A URL do briefing deve ter no máximo 500 caracteres.';
    } else if (!/^https?:\/\/.+/i.test(briefing_url)) {
      errors.briefing_url = 'A URL do briefing deve iniciar com http:// ou https://.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitized: {
      empresa,
      data,
      formato,
      objetivo,
      conteudo,
      status,
      responsavel,
      briefing_url,
    },
  };
}

/**
 * Generates initial seed posts relative to the current date so that the
 * Visual Alert System (status === 'Pendente' && data === tomorrow) is immediately active.
 */
export function createSeedPosts(baseDate: Date = new Date()): EditorialPost[] {
  const tomorrow = getRelativeDateString(1, baseDate);
  const today = getRelativeDateString(0, baseDate);
  const inTwoDays = getRelativeDateString(2, baseDate);
  const inFourDays = getRelativeDateString(4, baseDate);
  const inSixDays = getRelativeDateString(6, baseDate);
  const yesterday = getRelativeDateString(-1, baseDate);

  return [
    {
      id: 'post-seed-01',
      empresa: 'Nubank Brasil',
      data: tomorrow,
      formato: 'Reels',
      objetivo: 'Educação Financeira & Retenção',
      conteudo:
        'Roteiro dinâmico de 45s mostrando 3 funcionalidades ocultas das Caixinhas para organizar metas de fim de ano.',
      status: 'Pendente',
      responsavel: 'Mariana Costa',
      briefing_url: 'https://docs.google.com/document/d/briefing-nubank-caixinhas',
      workspace: 'editorial_admin',
    },
    {
      id: 'post-seed-02',
      empresa: 'Natura Cosméticos',
      data: tomorrow,
      formato: 'Carrossel',
      objetivo: 'Lançamento de Produto (Linha Ekos)',
      conteudo:
        'Sequência de 7 lâminas detalhando os bioativos amazônicos da nova linha Ekos Castanha com prova clínica de hidratação.',
      status: 'Pendente',
      responsavel: 'Rafael Mendes',
      briefing_url: 'https://notion.so/briefing-natura-ekos-lancamento',
      workspace: 'editorial_admin',
    },
    {
      id: 'post-seed-03',
      empresa: 'Amaro Fashion',
      data: today,
      formato: 'Stories',
      objetivo: 'Conversão Direta & Cupom Relâmpago',
      conteudo:
        'Enquete interativa de looks de alfaiataria seguida de link direto para a coleção cápsula de primavera.',
      status: 'Aprovado',
      responsavel: 'Beatriz Nogueira',
      briefing_url: 'https://figma.com/file/amaro-stories-primavera',
      workspace: 'editorial_admin',
    },
    {
      id: 'post-seed-04',
      empresa: 'iFood Parceiros',
      data: inTwoDays,
      formato: 'Vídeo Longo',
      objetivo: 'Geração de Leads B2B',
      conteudo:
        'Estudo de caso em vídeo (3 min) com restaurante parceiro que aumentou o ticket médio em 38% usando cardápio inteligente.',
      status: 'Em Produção',
      responsavel: 'Lucas Oliveira',
      briefing_url: 'https://docs.google.com/document/d/ifood-case-b2b',
      workspace: 'editorial_admin',
    },
    {
      id: 'post-seed-05',
      empresa: 'Nubank Brasil',
      data: inFourDays,
      formato: 'Artigo / Blog',
      objetivo: 'Autoridade SEO & Tráfego Orgânico',
      conteudo:
        'Guia completo sobre planejamento tributário e reserva de emergência para profissionais autônomos e MEIs.',
      status: 'Em Aprovação',
      responsavel: 'Mariana Costa',
      briefing_url: 'https://docs.google.com/document/d/seo-guia-mei',
      workspace: 'editorial_admin',
    },
    {
      id: 'post-seed-06',
      empresa: 'Natura Cosméticos',
      data: yesterday,
      formato: 'Post Estático',
      objetivo: 'Institucional & Sustentabilidade',
      conteudo:
        'Infográfico celebrando a marca de 2,2 milhões de hectares de floresta conservados na Amazônia através de cadeias regenerativas.',
      status: 'Publicado',
      responsavel: 'Camila Rocha',
      briefing_url: 'https://notion.so/natura-relatorio-impacto',
      workspace: 'editorial_admin',
    },
    {
      id: 'post-seed-07',
      empresa: 'Amaro Fashion',
      data: inSixDays,
      formato: 'Newsletter',
      objetivo: 'Engajamento CRM & Curadoria Semanal',
      conteudo:
        'Edição semanal da The Edit com tendências monocromáticas e guia de combinação de tecidos naturais.',
      status: 'Pendente',
      responsavel: 'Beatriz Nogueira',
      briefing_url: 'https://docs.google.com/document/d/amaro-newsletter-edit',
      workspace: 'editorial_admin',
    },
  ];
}

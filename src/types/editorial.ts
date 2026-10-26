export type PostStatus =
  | 'Pendente'
  | 'Em Produção'
  | 'Em Aprovação'
  | 'Aprovado'
  | 'Publicado';

export type PostFormat =
  | 'Reels'
  | 'Carrossel'
  | 'Post Estático'
  | 'Stories'
  | 'Vídeo Longo'
  | 'Artigo / Blog'
  | 'Newsletter';

export interface EditorialPost {
  id: string;
  empresa: string;
  data: string; // YYYY-MM-DD
  formato: PostFormat;
  objetivo: string;
  conteudo: string;
  status: PostStatus;
  responsavel: string;
  briefing_url: string;
  workspace?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PostFormInput = Omit<
  EditorialPost,
  'id' | 'workspace' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'
>;

export interface PostFilters {
  empresa: string;
  status: string;
  search: string;
  onlyUrgentAlerts: boolean;
}

export interface EditorialMetrics {
  total: number;
  urgentAlertsCount: number;
  pendingCount: number;
  inProductionCount: number;
  publishedCount: number;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'Admin';
  mode: 'firebase' | 'simulated';
}

export const POST_STATUS_OPTIONS: PostStatus[] = [
  'Pendente',
  'Em Produção',
  'Em Aprovação',
  'Aprovado',
  'Publicado',
];

export const POST_FORMAT_OPTIONS: PostFormat[] = [
  'Reels',
  'Carrossel',
  'Post Estático',
  'Stories',
  'Vídeo Longo',
  'Artigo / Blog',
  'Newsletter',
];

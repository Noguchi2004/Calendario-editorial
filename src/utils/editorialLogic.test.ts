import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEditorialMetrics,
  createSeedPosts,
  extractUniqueCompanies,
  filterPosts,
  getRelativeDateString,
  isUrgentPendingPost,
  validatePostInput,
} from './editorialLogic';
import { EditorialPost } from '../types/editorial';

test('isUrgentPendingPost triggers ONLY when status is Pendente and date is 1 day in the future', () => {
  const refToday = '2026-10-26';
  const tomorrow = '2026-10-27';

  assert.equal(
    isUrgentPendingPost({ status: 'Pendente', data: tomorrow }, refToday),
    true,
    'Should alert when status is Pendente and date is tomorrow'
  );

  assert.equal(
    isUrgentPendingPost({ status: 'Aprovado', data: tomorrow }, refToday),
    false,
    'Should NOT alert when status is not Pendente even if date is tomorrow'
  );

  assert.equal(
    isUrgentPendingPost({ status: 'Pendente', data: refToday }, refToday),
    false,
    'Should NOT alert when date is today'
  );

  assert.equal(
    isUrgentPendingPost({ status: 'Pendente', data: '2026-10-28' }, refToday),
    false,
    'Should NOT alert when date is 2 days in the future'
  );
});

test('filterPosts filters accurately by empresa, status, urgent flag, and search text', () => {
  const baseDate = new Date(2026, 9, 26); // 2026-10-26
  const refToday = getRelativeDateString(0, baseDate);
  const seed = createSeedPosts(baseDate);

  // Filter by company
  const nubankPosts = filterPosts(
    seed,
    { empresa: 'Nubank Brasil', status: 'TODOS', search: '', onlyUrgentAlerts: false },
    refToday
  );
  assert.equal(nubankPosts.length, 2);
  assert.ok(nubankPosts.every((p) => p.empresa === 'Nubank Brasil'));

  // Filter by status
  const pendingPosts = filterPosts(
    seed,
    { empresa: 'TODAS', status: 'Pendente', search: '', onlyUrgentAlerts: false },
    refToday
  );
  assert.equal(pendingPosts.length, 3);
  assert.ok(pendingPosts.every((p) => p.status === 'Pendente'));

  // Filter by urgent alerts only
  const urgentPosts = filterPosts(
    seed,
    { empresa: 'TODAS', status: 'TODOS', search: '', onlyUrgentAlerts: true },
    refToday
  );
  assert.equal(urgentPosts.length, 2);
  assert.ok(urgentPosts.every((p) => isUrgentPendingPost(p, refToday)));
});

test('computeEditorialMetrics calculates total, urgent alerts, pending, and published counts', () => {
  const baseDate = new Date(2026, 9, 26);
  const refToday = getRelativeDateString(0, baseDate);
  const seed = createSeedPosts(baseDate);
  const metrics = computeEditorialMetrics(seed, refToday);

  assert.equal(metrics.total, 7);
  assert.equal(metrics.urgentAlertsCount, 2);
  assert.equal(metrics.pendingCount, 3);
  assert.equal(metrics.publishedCount, 1);
});

test('extractUniqueCompanies returns sorted unique company names', () => {
  const posts: EditorialPost[] = [
    {
      id: '1',
      empresa: 'Zeta Corp',
      data: '2026-10-27',
      formato: 'Reels',
      objetivo: 'Obj',
      conteudo: 'Conteudo',
      status: 'Pendente',
      responsavel: 'Ana',
      briefing_url: '',
    },
    {
      id: '2',
      empresa: 'Alpha Brand',
      data: '2026-10-27',
      formato: 'Carrossel',
      objetivo: 'Obj',
      conteudo: 'Conteudo',
      status: 'Pendente',
      responsavel: 'Ana',
      briefing_url: '',
    },
    {
      id: '3',
      empresa: 'Zeta Corp',
      data: '2026-10-28',
      formato: 'Stories',
      objetivo: 'Obj',
      conteudo: 'Conteudo',
      status: 'Publicado',
      responsavel: 'Ana',
      briefing_url: '',
    },
  ];

  assert.deepEqual(extractUniqueCompanies(posts), ['Alpha Brand', 'Zeta Corp']);
});

test('validatePostInput enforces required fields, YYYY-MM-DD date format, and URL scheme', () => {
  const validResult = validatePostInput({
    empresa: '  Acme Tech  ',
    data: '2026-10-27',
    formato: 'Reels',
    objetivo: 'Conversão',
    conteudo: 'Vídeo sobre o novo recurso.',
    status: 'Pendente',
    responsavel: 'Carlos Silva',
    briefing_url: 'https://docs.google.com/document/d/123',
  });
  assert.equal(validResult.valid, true);
  if (validResult.valid) {
    assert.equal(validResult.sanitized.empresa, 'Acme Tech');
  }

  const invalidResult = validatePostInput({
    empresa: '',
    data: '27/10/2026',
    formato: 'Reels',
    objetivo: '',
    conteudo: '',
    status: 'Pendente',
    responsavel: '',
    briefing_url: 'ftp://invalid-link',
  });
  assert.equal(invalidResult.valid, false);
  if (!invalidResult.valid) {
    assert.ok(invalidResult.errors.empresa);
    assert.ok(invalidResult.errors.data);
    assert.ok(invalidResult.errors.objetivo);
    assert.ok(invalidResult.errors.conteudo);
    assert.ok(invalidResult.errors.responsavel);
    assert.ok(invalidResult.errors.briefing_url);
  }
});

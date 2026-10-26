# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Authentication & Verified Identity Gate**: Every operation (`get`, `list`, `create`, `update`, `delete`) on `/posts/{postId}` requires an authenticated session (`request.auth != null`) and verified identity (`request.auth.token.email_verified == true` or registered admin document).
2. **Path Variable Hardening**: Document IDs `{postId}` must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
3. **Strict Schema & Key Whitelisting (`isValidPost`)**:
   - Allowed & Required keys: `['empresa', 'data', 'formato', 'objetivo', 'conteudo', 'status', 'responsavel', 'briefing_url', 'workspace', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt']`.
   - No shadow or unwhitelisted keys may be added on `create` or `update`.
   - `empresa`: `string`, `1 <= size <= 120`.
   - `data`: `string`, `size == 10`, matches `^\d{4}-\d{2}-\d{2}$`.
   - `formato`: `string`, `size <= 60`, in `['Reels', 'Carrossel', 'Post Estático', 'Stories', 'Vídeo Longo', 'Artigo / Blog', 'Newsletter']`.
   - `objetivo`: `string`, `1 <= size <= 200`.
   - `conteudo`: `string`, `1 <= size <= 2000`.
   - `status`: `string`, `size <= 40`, in `['Pendente', 'Em Produção', 'Em Aprovação', 'Aprovado', 'Publicado']`.
   - `responsavel`: `string`, `1 <= size <= 120`.
   - `briefing_url`: `string`, `size <= 500`.
   - `workspace`: `string`, equals `'editorial_admin'`.
   - `createdBy`: `string`, `1 <= size <= 128`, immutable after creation (`incoming().createdBy == existing().createdBy`), and must equal `request.auth.uid` on creation.
   - `updatedBy`: `string`, `1 <= size <= 128`, must equal `request.auth.uid` on both creation and update.
   - `createdAt`: `timestamp`, immutable after creation (`incoming().createdAt == existing().createdAt`), and must equal `request.time` on creation.
   - `updatedAt`: `timestamp`, must equal `request.time` on creation and update.
4. **Secure List Queries**: `allow list` enforces `resource.data.workspace == 'editorial_admin'`, requiring client queries to filter by `where('workspace', '==', 'editorial_admin')`.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: `auth = null`, valid post payload -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'pedrohcnoguti@gmail.com', email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Create**: Valid post payload + `{ isSuperAdmin: true }` -> `PERMISSION_DENIED`.
4. **Creator Identity Spoofing on Create**: `createdBy: 'other-user-uid'` when `request.auth.uid == 'u1'` -> `PERMISSION_DENIED`.
5. **Updater Identity Spoofing on Update**: `updatedBy: 'other-user-uid'` when `request.auth.uid == 'u1'` -> `PERMISSION_DENIED`.
6. **Immutable Field Mutation (`createdBy`)**: Updating `createdBy` to a different UID -> `PERMISSION_DENIED`.
7. **Immutable Field Mutation (`createdAt`)**: Updating `createdAt` to a new timestamp -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: Setting `updatedAt` to a past or future timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
9. **Date Format Poisoning**: Setting `data: '26/10/2026'` instead of `YYYY-MM-DD` -> `PERMISSION_DENIED`.
10. **Status Enum Bypass**: Setting `status: 'Cancelado'` (not in allowed status enum) -> `PERMISSION_DENIED`.
11. **Denial-of-Wallet String Overflow**: Setting `conteudo` to a 5,000-character string (`> 2000`) -> `PERMISSION_DENIED`.
12. **Unconstrained List Query**: Querying `/posts` without `where('workspace', '==', 'editorial_admin')` against non-matching resource -> `PERMISSION_DENIED`.

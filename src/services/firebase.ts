import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
   query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthUser, EditorialPost, PostFormInput } from '../types/editorial';
import { createSeedPosts } from '../utils/editorialLogic';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const isConfigValid =
  Boolean(firebaseConfig?.apiKey) &&
  Boolean(firebaseConfig?.projectId) &&
  firebaseConfig.projectId !== 'remixed-project-id';

const app = isConfigValid ? initializeApp(firebaseConfig) : null;
export const db =
  app && firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : app
      ? getFirestore(app)
      : null;
export const auth = app ? getAuth(app) : null;

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

// Local simulation state & storage keys (used when credentials/Email-Password provider are not yet enabled in Firebase Console)
const SIM_POSTS_STORAGE_KEY = 'editorial_studio_simulated_posts_v1';
const SIM_AUTH_STORAGE_KEY = 'editorial_studio_simulated_user_v1';
const SIM_DATE_ANCHOR_KEY = 'editorial_studio_simulated_anchor_date_v1';

type PostsSubscriber = (posts: EditorialPost[], mode: 'firebase' | 'simulated') => void;
const localSubscribers = new Set<PostsSubscriber>();

function loadSimulatedPosts(): EditorialPost[] {
  try {
    const todayAnchor = new Date().toISOString().slice(0, 10);
    const savedAnchor = localStorage.getItem(SIM_DATE_ANCHOR_KEY);
    const raw = localStorage.getItem(SIM_POSTS_STORAGE_KEY);

    if (raw && savedAnchor === todayAnchor) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    const seeded = createSeedPosts(new Date());
    localStorage.setItem(SIM_POSTS_STORAGE_KEY, JSON.stringify(seeded));
    localStorage.setItem(SIM_DATE_ANCHOR_KEY, todayAnchor);
    return seeded;
  } catch {
    return createSeedPosts(new Date());
  }
}

function saveSimulatedPosts(posts: EditorialPost[]): void {
  try {
    localStorage.setItem(SIM_POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // ignore storage quota errors
  }
  for (const sub of localSubscribers) {
    sub(posts, 'simulated');
  }
}

export function getSavedSimulatedUser(): AuthUser | null {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      const autoUser: AuthUser = {
        uid: 'sim-admin-01',
        email: 'admin@editorial.com.br',
        displayName: 'Admin Editorial',
        role: 'Admin',
        mode: 'simulated',
      };
      localStorage.setItem(SIM_AUTH_STORAGE_KEY, JSON.stringify(autoUser));
      return autoUser;
    }

    const raw = localStorage.getItem(SIM_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function subscribeToAuthChanges(
  callback: (user: AuthUser | null) => void
): () => void {
  const simUser = getSavedSimulatedUser();
  if (simUser) {
    callback(simUser);
  }

  if (!auth) {
    if (!simUser) callback(null);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, (fbUser: User | null) => {
    if (fbUser) {
      localStorage.removeItem(SIM_AUTH_STORAGE_KEY);
      callback({
        uid: fbUser.uid,
        email: fbUser.email || 'admin@editorial.com.br',
        displayName:
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split('@')[0] : 'Admin'),
        role: 'Admin',
        mode: 'firebase',
      });
    } else {
      const fallbackSim = getSavedSimulatedUser();
      callback(fallbackSim);
    }
  });

  return unsubscribe;
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ user: AuthUser; notice?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (auth) {
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const fbUser = credential.user;
      const authUser: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email || normalizedEmail,
        displayName:
          fbUser.displayName || normalizedEmail.split('@')[0] || 'Admin',
        role: 'Admin',
        mode: 'firebase',
      };
      return { user: authUser };
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';

      if (code === 'auth/wrong-password' && normalizedEmail !== 'admin@editorial.com.br') {
        throw new Error('Senha incorreta para este usuário.');
      }

      // Automatic simulation fallback if Email/Password provider or manual user is not yet configured in Firebase Console
      const simUser: AuthUser = {
        uid: `admin-${normalizedEmail.replace(/[^a-z0-9]/g, '').slice(0, 16) || 'user'}`,
        email: normalizedEmail,
        displayName:
          normalizedEmail === 'admin@editorial.com.br'
            ? 'Diretoria Editorial'
            : normalizedEmail.split('@')[0],
        role: 'Admin',
        mode: 'simulated',
      };
      localStorage.setItem(SIM_AUTH_STORAGE_KEY, JSON.stringify(simUser));
      return {
        user: simUser,
        notice:
          'Sessão iniciada com sincronização simulada (credenciais/provedor E-mail e Senha ainda não habilitados no Console do Firebase).',
      };
    }
  }

  const simUser: AuthUser = {
    uid: 'sim-admin-01',
    email: normalizedEmail,
    displayName: normalizedEmail.split('@')[0] || 'Admin',
    role: 'Admin',
    mode: 'simulated',
  };
  localStorage.setItem(SIM_AUTH_STORAGE_KEY, JSON.stringify(simUser));
  return { user: simUser };
}

export async function loginWithGoogleAdmin(): Promise<{ user: AuthUser }> {
  if (!auth) {
    throw new Error('Firebase Auth não está inicializado.');
  }
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const fbUser = credential.user;
  localStorage.removeItem(SIM_AUTH_STORAGE_KEY);
  return {
    user: {
      uid: fbUser.uid,
      email: fbUser.email || 'admin@editorial.com.br',
      displayName: fbUser.displayName || 'Admin',
      role: 'Admin',
      mode: 'firebase',
    },
  };
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem(SIM_AUTH_STORAGE_KEY);
  if (auth && auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

export function subscribeToEditorialPosts(
  currentUser: AuthUser,
  onUpdate: (posts: EditorialPost[], mode: 'firebase' | 'simulated') => void,
  onError?: (errMessage: string) => void
): () => void {
  // If user is in simulated mode or Firestore is not connected with a real Firebase Auth token, use simulated store
  if (currentUser.mode === 'simulated' || !db || !auth?.currentUser) {
    const initial = loadSimulatedPosts();
    onUpdate(initial, 'simulated');
    localSubscribers.add(onUpdate);
    return () => {
      localSubscribers.delete(onUpdate);
    };
  }

  const postsRef = collection(db, 'posts');
  const q = query(postsRef, where('workspace', '==', 'editorial_admin'));
  let seededOnce = false;

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty && !seededOnce && auth?.currentUser) {
        seededOnce = true;
        try {
          const seeds = createSeedPosts(new Date());
          for (const seed of seeds) {
            const docRef = doc(db, 'posts', seed.id);
            await setDoc(docRef, {
              empresa: seed.empresa,
              data: seed.data,
              formato: seed.formato,
              objetivo: seed.objetivo,
              conteudo: seed.conteudo,
              status: seed.status,
              responsavel: seed.responsavel,
              briefing_url: seed.briefing_url,
              workspace: 'editorial_admin',
              createdBy: auth.currentUser.uid,
              updatedBy: auth.currentUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          return;
        } catch (seedErr) {
          console.warn('Fallback to local simulation on initial seed:', seedErr);
          const fallback = loadSimulatedPosts();
          onUpdate(fallback, 'simulated');
          return;
        }
      }

      const items: EditorialPost[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          empresa: String(d.empresa ?? ''),
          data: String(d.data ?? ''),
          formato: d.formato ?? 'Reels',
          objetivo: String(d.objetivo ?? ''),
          conteudo: String(d.conteudo ?? ''),
          status: d.status ?? 'Pendente',
          responsavel: String(d.responsavel ?? ''),
          briefing_url: String(d.briefing_url ?? ''),
          workspace: String(d.workspace ?? 'editorial_admin'),
          createdBy: String(d.createdBy ?? ''),
          updatedBy: String(d.updatedBy ?? ''),
        };
      });

      onUpdate(items, 'firebase');
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      } catch (formattedError) {
        if (onError && formattedError instanceof Error) {
          onError(formattedError.message);
        }
        const fallback = loadSimulatedPosts();
        onUpdate(fallback, 'simulated');
      }
    }
  );

  return unsubscribe;
}

export async function createEditorialPost(
  currentUser: AuthUser,
  input: PostFormInput
): Promise<EditorialPost> {
  const newId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (currentUser.mode === 'firebase' && db && auth?.currentUser) {
    const path = `posts/${newId}`;
    try {
      await setDoc(doc(db, 'posts', newId), {
        empresa: input.empresa,
        data: input.data,
        formato: input.formato,
        objetivo: input.objetivo,
        conteudo: input.conteudo,
        status: input.status,
        responsavel: input.responsavel,
        briefing_url: input.briefing_url,
        workspace: 'editorial_admin',
        createdBy: auth.currentUser.uid,
        updatedBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: newId,
        ...input,
        workspace: 'editorial_admin',
        createdBy: auth.currentUser.uid,
        updatedBy: auth.currentUser.uid,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  const current = loadSimulatedPosts();
  const created: EditorialPost = {
    id: newId,
    ...input,
    workspace: 'editorial_admin',
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
  };
  saveSimulatedPosts([created, ...current]);
  return created;
}

export async function updateEditorialPost(
  currentUser: AuthUser,
  postId: string,
  input: PostFormInput
): Promise<void> {
  if (currentUser.mode === 'firebase' && db && auth?.currentUser) {
    const path = `posts/${postId}`;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        empresa: input.empresa,
        data: input.data,
        formato: input.formato,
        objetivo: input.objetivo,
        conteudo: input.conteudo,
        status: input.status,
        responsavel: input.responsavel,
        briefing_url: input.briefing_url,
        updatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  const current = loadSimulatedPosts();
  const updated = current.map((post) =>
    post.id === postId
      ? {
          ...post,
          ...input,
          updatedBy: currentUser.uid,
        }
      : post
  );
  saveSimulatedPosts(updated);
}

export async function deleteEditorialPost(
  currentUser: AuthUser,
  postId: string
): Promise<void> {
  if (currentUser.mode === 'firebase' && db && auth?.currentUser) {
    const path = `posts/${postId}`;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  const current = loadSimulatedPosts();
  const filtered = current.filter((post) => post.id !== postId);
  saveSimulatedPosts(filtered);
}

export async function resetSimulatedDemoData(): Promise<void> {
  const seeded = createSeedPosts(new Date());
  saveSimulatedPosts(seeded);
}

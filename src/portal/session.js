import {reactive} from 'vue';

// The signed-in portal user, separate from the admin session. Kept in localStorage so a reload doesn't
// sign them out; the API ends sessions after PORTAL_SESSION_HOURS whatever happens here.
const KEY = 'smatid_portal_session';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.token && new Date(saved.expires_at) > new Date()) return saved;
  } catch {
    // Storage blocked or unreadable: start signed out.
  }
  return null;
}

const saved = load();

export const portal = reactive({
  token: saved ? saved.token : null,
  expires_at: saved ? saved.expires_at : null,
  user: saved ? saved.user : null,
  client: saved ? saved.client : null,
});

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({token: portal.token, expires_at: portal.expires_at, user: portal.user, client: portal.client}));
  } catch {
    // Not saved: the session lasts until the tab is closed.
  }
}

/** From a sign-in reply: {token, expires_at, user, client}. */
export function portalSignIn(data) {
  Object.assign(portal, {token: data.token, expires_at: data.expires_at, user: data.user, client: data.client});
  persist();
}

/** Refreshes what we know about the user and company (e.g. the balance) without signing in again. */
export function portalUpdate({user, client}) {
  if (user) portal.user = user;
  if (client) portal.client = client;
  persist();
}

export function portalSignOut() {
  Object.assign(portal, {token: null, expires_at: null, user: null, client: null});
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing saved to remove.
  }
}

export const isPortalSignedIn = () => Boolean(portal.token) && new Date(portal.expires_at) > new Date();
export const isOwner = () => portal.user && portal.user.role === 'owner';

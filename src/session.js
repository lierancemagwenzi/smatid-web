import {reactive} from 'vue';

// The signed-in admin. The token is kept in localStorage so a reload doesn't sign you out;
// the API ends the session after ADMIN_SESSION_HOURS whatever happens here.
const KEY = 'smatid_admin_session';

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

export const session = reactive({
    token: saved ? saved.token : null,
    admin: saved ? saved.admin : null,
    expires_at: saved ? saved.expires_at : null,
});

export function signIn({token, admin, expires_at}) {
    Object.assign(session, {token, admin, expires_at});
    try {
        localStorage.setItem(KEY, JSON.stringify({token, admin, expires_at}));
    } catch {
        // Not saved: the session lasts until the tab is closed.
    }
}

export function signOut() {
    Object.assign(session, {token: null, admin: null, expires_at: null});
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Nothing saved to remove.
    }
}

export const isSignedIn = () => Boolean(session.token) && new Date(session.expires_at) > new Date();

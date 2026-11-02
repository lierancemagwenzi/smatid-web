import {session, signOut} from './session.js';
import router from './router.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
    constructor(status, code) {
        super(messageFor(code, status));
        this.status = status;
        this.code = code;
    }
}

// What the API's error codes mean, for people.
const MESSAGES = {
    invalid_credentials: 'That email and password don’t match an admin account.',
    too_many_attempts: 'Too many failed sign-ins. Wait 15 minutes and try again.',
    email_and_password_required: 'Enter your email and password.',
    auth_unavailable: 'The service can’t check sign-ins right now. Try again shortly.',
    name_required: 'Enter the client’s name.',
    valid_email_required: 'Enter a valid email address for the client.',
    client_not_found: 'That client doesn’t exist.',
    request_not_found: 'That request doesn’t exist.',
};

function messageFor(code, status) {
    if (MESSAGES[code]) return MESSAGES[code];
    if (status === 0) return 'Can’t reach the Smatid KYC API. Check your connection.';
    return `Something went wrong (${code || `HTTP ${status}`}).`;
}

async function request(method, path, {body, query} = {}) {
    const url = new URL(BASE + path, window.location.origin);
    for (const [k, v] of Object.entries(query || {})) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
    const headers = {'Content-Type': 'application/json'};
    if (session.token) headers.Authorization = `Bearer ${session.token}`;

    let res;
    try {
        res = await fetch(url, {method, headers, body: body && JSON.stringify(body)});
    } catch {
        throw new ApiError(0, 'network');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/admin/login') {
        // The session ended (expired, or signed out elsewhere): back to the sign-in page.
        signOut();
        router.push({name: 'login', query: {next: router.currentRoute.value.fullPath}});
    }
    if (!res.ok) throw new ApiError(res.status, data.error);
    return data;
}

export const api = {
    login: (email, password) => request('POST', '/api/admin/login', {body: {email, password}}),
    logout: () => request('POST', '/api/admin/logout'),
    me: () => request('GET', '/api/admin/me'),
    stats: (query) => request('GET', '/api/admin/stats', {query}),
    clients: () => request('GET', '/api/admin/clients'),
    client: (id) => request('GET', `/api/admin/clients/${id}`),
    createClient: (name, email) => request('POST', '/api/admin/clients', {body: {name, email}}),
    revokeClient: (id) => request('POST', `/api/admin/clients/${id}/revoke`),
    requests: (query) => request('GET', '/api/admin/requests', {query}),
    request: (id) => request('GET', `/api/admin/requests/${id}`),
};

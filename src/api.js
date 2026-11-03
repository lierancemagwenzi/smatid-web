import {session, signOut} from './session.js';
import router from './router.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
    constructor(status, code, extra = {}) {
        super(messageFor(code, status));
        this.status = status;
        this.code = code;
        // The rest of the error body, e.g. Smatpay's own reason in `message`.
        this.extra = extra;
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
    invalid_key: 'Use lowercase letters, numbers and dashes for the key, e.g. liveness-check.',
    key_taken: 'A module with that key already exists.',
    module_not_found: 'That module doesn’t exist.',
    webhook_url_must_be_https: 'The webhook address must start with https://.',
    webhook_url_not_public: 'The webhook address must be a public website, not a private or internal one.',
    invalid_webhook_url: 'That isn’t a valid web address.',
    email_taken: 'That email already has a portal account. Use a different email.',
    invalid_credits: 'Enter a whole number of credits, other than 0.',
    note_required: 'Add a note saying why (it shows in the client’s history).',
    balance_would_go_negative: 'That would take the client below zero credits.',
    invalid_trial_until: 'That isn’t a valid date.',
    invalid_credit_cost: 'Use a whole number from 0 to 1000.',
    api_url_must_be_https: 'The SmatPay API address must start with https://.',
    invalid_api_url: 'That isn’t a valid web address.',
    invalid_merchant_id: 'The merchant ID should be letters and numbers only.',
    invalid_account_id: 'The merchant account ID should be a number.',
    invalid_profile_number: 'The payment profile number should be a number.',
    plane_must_be_sandbox_or_production: 'Choose sandbox or production.',
    encryption_key_missing: 'The server has no SETTINGS_ENCRYPTION_KEY, so keys can’t be saved safely. Add it to the API’s .env first.',
    nothing_to_update: 'Nothing has changed.',
    user_not_found: 'That user doesn’t exist, or was already removed.',
    invalid_amount: 'Enter the amount received, 0 or more.',
    reference_too_long: 'Keep the payment reference to 128 characters.',
    note_too_long: 'Keep the note to 150 characters.',
    already_set_up: 'They’ve already set a password. They can use “Forgot password” on the portal sign-in page.',
    user_not_active: 'That user is disabled, so no invite was sent.',
    last_owner: 'This is the client’s only owner. Add another owner first.',
};

function messageFor(code, status) {
    if (MESSAGES[code]) return MESSAGES[code];
    if (status === 0) return 'Can’t reach the Smatid KYC API. Check your connection.';
    return `Something went wrong (${code || `HTTP ${status}`}).`;
}

async function request(method, path, {body, query, raw} = {}) {
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
    if (raw && res.ok) return res.blob();
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/admin/login') {
        // The session ended (expired, or signed out elsewhere): back to the sign-in page.
        signOut();
        router.push({name: 'login', query: {next: router.currentRoute.value.fullPath}});
    }
    if (!res.ok) throw new ApiError(res.status, data.error, data);
    return data;
}

export const api = {
    login: (email, password) => request('POST', '/api/admin/login', {body: {email, password}}),
    logout: () => request('POST', '/api/admin/logout'),
    me: () => request('GET', '/api/admin/me'),
    stats: (query) => request('GET', '/api/admin/stats', {query}),
    clients: () => request('GET', '/api/admin/clients'),
    client: (id) => request('GET', `/api/admin/clients/${id}`),
    createClient: (name, email, contact_name) => request('POST', '/api/admin/clients', {body: {name, email, contact_name}}),
    adjustCredits: (id, credits, note) => request('POST', `/api/admin/clients/${id}/credits`, {body: {credits, note}}),
    clientTransactions: (id, query) => request('GET', `/api/admin/clients/${id}/transactions`, {query}),
    clientUsers: (id) => request('GET', `/api/admin/clients/${id}/users`),
    addClientUser: (id, fields) => request('POST', `/api/admin/clients/${id}/users`, {body: fields}),
    removeClientUser: (id, userId) => request('DELETE', `/api/admin/clients/${id}/users/${userId}`),
    resendInvite: (id, userId) => request('POST', `/api/admin/clients/${id}/users/${userId}/resend-invite`),
    clientTopups: (id, query) => request('GET', `/api/admin/clients/${id}/topups`, {query}),
    manualTopup: (id, fields) => request('POST', `/api/admin/clients/${id}/topups`, {body: fields}),
    clientCreditUsage: (id, query) => request('GET', `/api/admin/clients/${id}/credit-usage`, {query}),
    pricing: () => request('GET', '/api/public/pricing'),
    topups: (query) => request('GET', '/api/admin/topups', {query}),
    paymentSettings: () => request('GET', '/api/admin/settings/payments'),
    savePaymentSettings: (fields) => request('PUT', '/api/admin/settings/payments', {body: fields}),
    testPaymentSettings: (fields) => request('POST', '/api/admin/settings/payments/test', {body: fields}),
    updateClient: (id, fields) => request('PATCH', `/api/admin/clients/${id}`, {body: fields}),
    revokeClient: (id) => request('POST', `/api/admin/clients/${id}/revoke`),
    modules: () => request('GET', '/api/admin/modules'),
    createModule: (fields) => request('POST', '/api/admin/modules', {body: fields}),
    updateModule: (id, fields) => request('PATCH', `/api/admin/modules/${id}`, {body: fields}),
    livenessSession: (sessionId) => request('GET', `/api/admin/liveness/${encodeURIComponent(sessionId)}`),
    livenessFrame: (sessionId, frame) => request('GET', `/api/admin/liveness/${encodeURIComponent(sessionId)}/frames/${encodeURIComponent(frame)}`, {raw: true}),
    requests: (query) => request('GET', '/api/admin/requests', {query}),
    request: (id) => request('GET', `/api/admin/requests/${id}`),
};

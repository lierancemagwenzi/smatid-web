import {portal, portalSignOut} from './session.js';
import router from '../router.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class PortalError extends Error {
  constructor(status, code, extra = {}) {
    super(messageFor(code, status, extra));
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const MESSAGES = {
  invalid_credentials: 'That email and password don’t match an account.',
  email_not_verified: 'Please confirm your email first. Check your inbox for the link we sent.',
  account_suspended: 'This account has been suspended. Contact Smatid for help.',
  too_many_attempts: 'Too many attempts. Please wait a while and try again.',
  email_and_password_required: 'Enter your email and password.',
  company_name_required: 'Enter your company’s name.',
  name_required: 'Enter a name.',
  valid_email_required: 'Enter a valid email address.',
  password_too_short: 'Use a password of at least 10 characters.',
  password_too_long: 'That password is too long.',
  current_password_wrong: 'Your current password isn’t right.',
  invalid_or_expired_link: 'This link has expired or has already been used. Ask for a new one.',
  owner_only: 'Only an account owner can do that.',
  email_taken: 'Someone with that email already has an account.',
  cannot_remove_yourself: 'You can’t remove yourself.',
  last_owner: 'A company needs at least one owner.',
  invalid_credits: 'Choose how many credits to buy.',
  invalid_method: 'Choose a way to pay.',
  invalid_mobile: 'Enter a valid mobile number for that wallet.',
  payments_unavailable: 'Payments aren’t available right now. Please try again later.',
  webhook_url_must_be_https: 'The webhook address must start with https://.',
  webhook_url_not_public: 'The webhook address must be a public website, not a private or internal one.',
  invalid_webhook_url: 'That isn’t a valid web address.',
  auth_unavailable: 'We can’t sign you in right now. Please try again shortly.',
};

function messageFor(code, status, extra) {
  if (code === 'payment_not_started') return `The payment couldn’t be started: ${extra.message || 'please try again.'}`;
  if (MESSAGES[code]) return MESSAGES[code];
  if (status === 0) return 'Can’t reach Smatid. Check your connection.';
  return `Something went wrong (${code || `HTTP ${status}`}).`;
}

async function request(method, path, {body, query} = {}) {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const headers = {'Content-Type': 'application/json'};
  if (portal.token) headers.Authorization = `Bearer ${portal.token}`;
  let res;
  try {
    res = await fetch(url, {method, headers, body: body && JSON.stringify(body)});
  } catch {
    throw new PortalError(0, 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && portal.token && !path.startsWith('/api/portal/login')) {
    portalSignOut();
    router.push({name: 'portal-login', query: {next: router.currentRoute.value.fullPath}});
  }
  if (!res.ok) throw new PortalError(res.status, data.error, data);
  return data;
}

export const portalApi = {
  register: (body) => request('POST', '/api/portal/register', {body}),
  verifyEmail: (token) => request('POST', '/api/portal/verify-email', {body: {token}}),
  resendVerification: (email) => request('POST', '/api/portal/resend-verification', {body: {email}}),
  login: (email, password) => request('POST', '/api/portal/login', {body: {email, password}}),
  logout: () => request('POST', '/api/portal/logout'),
  forgotPassword: (email) => request('POST', '/api/portal/forgot-password', {body: {email}}),
  resetPassword: (token, password) => request('POST', '/api/portal/reset-password', {body: {token, password}}),
  me: () => request('GET', '/api/portal/me'),
  changePassword: (current_password, new_password) => request('POST', '/api/portal/password', {body: {current_password, new_password}}),
  dashboard: (query) => request('GET', '/api/portal/dashboard', {query}),
  usage: (query) => request('GET', '/api/portal/usage', {query}),
  usageDetail: (id) => request('GET', `/api/portal/usage/${id}`),
  transactions: (query) => request('GET', '/api/portal/transactions', {query}),
  topupOptions: () => request('GET', '/api/portal/topup-options'),
  topups: (query) => request('GET', '/api/portal/topups', {query}),
  createTopup: (body) => request('POST', '/api/portal/topups', {body}),
  topup: (id) => request('GET', `/api/portal/topups/${id}`),
  developers: () => request('GET', '/api/portal/developers'),
  createApiToken: () => request('POST', '/api/portal/api-token'),
  setWebhook: (webhook_url) => request('PUT', '/api/portal/webhook', {body: {webhook_url}}),
  webhookSecret: () => request('GET', '/api/portal/webhook-secret'),
  rotateWebhookSecret: () => request('POST', '/api/portal/webhook-secret/rotate'),
  team: () => request('GET', '/api/portal/team'),
  invite: (body) => request('POST', '/api/portal/team', {body}),
  removeUser: (id) => request('DELETE', `/api/portal/team/${id}`),
};

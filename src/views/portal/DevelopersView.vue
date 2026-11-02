<template>
  <div class="page">
    <p v-if="!isOwner()" class="note-bar">Only account owners can change these settings.</p>

    <section class="card">
      <header class="card-header"><h2>API token</h2><RouterLink to="/docs/authentication" class="small">How it works</RouterLink></header>
      <div class="card-body stack">
        <template v-if="fresh">
          <div class="ok-box">
            <strong>Copy your new token now.</strong> It won’t be shown again{{ replaced ? ', and your old token has stopped working' : '' }}.
          </div>
          <div class="secret">
            <code>{{ fresh }}</code>
            <button class="btn btn-secondary btn-sm" type="button" @click="copy(fresh, 'token')">{{ copied === 'token' ? 'Copied' : 'Copy' }}</button>
          </div>
          <p class="muted small">Send it with every request as <code>Authorization: Bearer {{ fresh.slice(0, 12) }}…</code>, from your server only.</p>
        </template>
        <template v-else-if="dev?.has_api_token">
          <p>Your token starts with <code>{{ dev.token_prefix }}…</code>. For security, the whole token is only shown when it’s created.</p>
          <p class="muted small">Lost it, or think someone else has it? Create a new one: the old one stops working straight away.</p>
        </template>
        <p v-else-if="dev">You don’t have an API token yet. Create one to start calling the API.</p>
        <div v-if="isOwner()">
          <button class="btn" :class="dev?.has_api_token ? 'btn-secondary' : 'btn-primary'" type="button" :disabled="busy" @click="dev?.has_api_token ? (confirming = true) : makeToken()">
            {{ dev?.has_api_token ? 'Create a new token' : 'Create API token' }}
          </button>
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card-header"><h2>Webhook</h2><RouterLink to="/docs/webhooks" class="small">How webhooks work</RouterLink></header>
      <div class="card-body stack">
        <p class="muted small">Liveness results are sent here as soon as a check finishes. A session can still ask for a different address.</p>
        <form class="row" @submit.prevent="saveWebhook">
          <input v-model="webhook" class="input" type="url" placeholder="https://your-server.com/hooks/smatid" :disabled="!isOwner()" />
          <button v-if="isOwner()" class="btn btn-primary" type="submit" :disabled="savingWebhook">{{ savingWebhook ? 'Saving…' : 'Save' }}</button>
        </form>
        <p v-if="webhookMsg" :class="webhookOk ? 'ok-text' : 'form-error'">{{ webhookMsg }}</p>

        <div v-if="isOwner()" class="secret-block">
          <h3>Signing secret</h3>
          <p class="muted small">Use it to check that webhooks really come from Smatid. Keep it on your server.</p>
          <div v-if="secret" class="secret">
            <code>{{ secret }}</code>
            <button class="btn btn-secondary btn-sm" type="button" @click="copy(secret, 'secret')">{{ copied === 'secret' ? 'Copied' : 'Copy' }}</button>
          </div>
          <div class="row-btns">
            <button v-if="!secret" class="btn btn-secondary btn-sm" type="button" @click="showSecret">Show secret</button>
            <button class="btn btn-ghost btn-sm" type="button" @click="rotate">Replace secret</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card-header"><h2>Get started</h2></header>
      <div class="card-body">
        <ul class="links">
          <li><RouterLink to="/docs/quickstart">Quick start</RouterLink>: your first check in a few minutes</li>
          <li><RouterLink to="/docs/endpoints">All endpoints</RouterLink></li>
          <li><RouterLink to="/docs/errors">Errors</RouterLink>, including <code>402 insufficient_credits</code></li>
        </ul>
      </div>
    </section>

    <ModalDialog v-if="confirming" title="Create a new token?" @close="confirming = false">
      <p style="margin:0">Your current token will <strong>stop working immediately</strong>. Any system using it will get errors until you give it the new one.</p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="confirming = false">Cancel</button>
        <button class="btn btn-danger" type="button" :disabled="busy" @click="makeToken">Create new token</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue';
import {portalApi} from '../../portal/api.js';
import {isOwner, portalUpdate} from '../../portal/session.js';
import ModalDialog from '../../components/ModalDialog.vue';

const dev = ref(null);
const fresh = ref('');
// Whether the new token replaced one (said once it's made, so the check has to happen before).
const replaced = ref(false);
const busy = ref(false);
const confirming = ref(false);
const webhook = ref('');
const savingWebhook = ref(false);
const webhookMsg = ref('');
const webhookOk = ref(false);
const secret = ref('');
const copied = ref('');

async function load() {
  dev.value = await portalApi.developers();
  webhook.value = dev.value.webhook_url || '';
}
onMounted(load);

async function makeToken() {
  busy.value = true;
  try {
    replaced.value = Boolean(dev.value && dev.value.has_api_token);
    const res = await portalApi.createApiToken();
    fresh.value = res.access_token;
    confirming.value = false;
    await load();
    portalUpdate(await portalApi.me());
  } finally {
    busy.value = false;
  }
}

async function saveWebhook() {
  savingWebhook.value = true;
  webhookMsg.value = '';
  try {
    const res = await portalApi.setWebhook(webhook.value.trim() || null);
    webhook.value = res.webhook_url || '';
    webhookOk.value = true;
    webhookMsg.value = res.webhook_url ? 'Saved. New liveness sessions will send their results there.' : 'Removed.';
  } catch (err) {
    webhookOk.value = false;
    webhookMsg.value = err.message;
  } finally {
    savingWebhook.value = false;
  }
}

async function showSecret() {
  secret.value = (await portalApi.webhookSecret()).webhook_secret;
}

async function rotate() {
  secret.value = (await portalApi.rotateWebhookSecret()).webhook_secret;
}

async function copy(value, what) {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = what;
    setTimeout(() => (copied.value = ''), 1500);
  } catch {
    // Select it by hand.
  }
}
</script>

<style scoped>
.page { display: grid; gap: 20px; max-width: 860px; }
.stack { display: grid; gap: 12px; }
.stack p { margin: 0; }
.note-bar { margin: 0; padding: 12px 16px; border-radius: 10px; background: var(--surface-2); color: var(--ink-2); font-size: 14px; }
.ok-box { padding: 12px 14px; border-radius: 10px; background: var(--ok-soft); color: #065f46; font-size: 14px; }
.secret { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--surface-2); }
.secret code { flex: 1; word-break: break-all; font-size: 13px; user-select: all; }
.row { display: flex; gap: 10px; }
.row .input { flex: 1; }
.row-btns { display: flex; gap: 8px; }
.secret-block { display: grid; gap: 8px; padding-top: 14px; border-top: 1px solid var(--line); }
.secret-block h3 { font-size: 14px; }
.ok-text { color: var(--ok); font-size: 14px; }
.links { margin: 0; padding-left: 20px; display: grid; gap: 6px; font-size: 14.5px; }
@media (max-width: 600px) { .row { flex-direction: column; } }
</style>

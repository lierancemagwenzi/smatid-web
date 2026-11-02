<template>
  <div class="page">
    <RouterLink to="/admin/clients" class="back small">← Clients</RouterLink>
    <p v-if="error" class="form-error">{{ error }}</p>

    <template v-if="client">
      <section class="card head">
        <div class="head-main">
          <div class="title-row">
            <h2>{{ client.name }}</h2>
            <span class="badge" :class="client.status === 'active' ? 'ok' : 'bad'">{{ client.status === 'active' ? 'Active' : 'Revoked' }}</span>
          </div>
          <dl class="facts">
            <div><dt>Email</dt><dd>{{ client.email || '—' }}</dd></div>
            <div><dt>Token</dt><dd><code v-if="client.token_prefix">{{ client.token_prefix }}…</code><span v-else class="muted">none yet</span></dd></div>
            <div><dt>Created</dt><dd>{{ formatDateTime(client.created_at) }}</dd></div>
            <div><dt>Last used</dt><dd>{{ formatDateTime(client.last_used_at) }}</dd></div>
            <div v-if="client.revoked_at"><dt>Revoked</dt><dd>{{ formatDateTime(client.revoked_at) }}</dd></div>
            <div><dt>Requests</dt><dd>{{ formatNumber(client.requests) }}</dd></div>
          </dl>
        </div>
        <button v-if="client.status === 'active'" class="btn btn-secondary danger-outline" type="button" @click="confirming = true">Revoke access</button>
      </section>

      <ClientBilling :client="client" @updated="client = {...client, ...$event}" />

      <section class="card webhook">
        <header class="card-header">
          <h2>Webhook</h2>
          <button v-if="!editingWebhook" class="btn btn-ghost btn-sm" type="button" @click="editWebhook">{{ client.webhook_url ? 'Change' : 'Set up' }}</button>
        </header>
        <div class="card-body">
          <template v-if="!editingWebhook">
            <p v-if="client.webhook_url" class="webhook-url"><code>{{ client.webhook_url }}</code></p>
            <p v-else class="muted small">No default webhook. Liveness results are only sent to a webhook when the session asks for one.</p>
            <p class="muted small">Liveness results are POSTed here, signed with the client’s secret, when a session finishes. A session can give its own <code>webhook_url</code> instead.</p>
          </template>
          <form v-else class="webhook-form" @submit.prevent="saveWebhook">
            <label class="visually-hidden" for="webhook-url">Webhook URL</label>
            <input id="webhook-url" v-model="webhookDraft" class="input" type="url" placeholder="https://client.example/hooks/smatid" autofocus />
            <div class="webhook-actions">
              <button v-if="client.webhook_url" class="btn btn-ghost btn-sm danger-text" type="button" :disabled="savingWebhook" @click="clearWebhook">Remove</button>
              <button class="btn btn-secondary btn-sm" type="button" @click="editingWebhook = false">Cancel</button>
              <button class="btn btn-primary btn-sm" type="submit" :disabled="savingWebhook">{{ savingWebhook ? 'Saving…' : 'Save' }}</button>
            </div>
            <p v-if="webhookError" class="form-error">{{ webhookError }}</p>
          </form>
        </div>
      </section>

      <div v-if="stats" class="stats">
        <div v-for="c in stats.by_check" :key="c.check_type" class="card stat">
          <span class="stat-label">{{ checkName(c.check_type) }}</span>
          <span class="stat-value">{{ formatNumber(c.requests) }}</span>
          <span class="stat-note">last 30 days{{ c.errors ? ` · ${plural(c.errors, 'error')}` : '' }}</span>
        </div>
        <div v-if="!stats.by_check.length" class="card stat">
          <span class="stat-label">Last 30 days</span>
          <span class="stat-value">0</span>
          <span class="stat-note">no requests</span>
        </div>
      </div>

      <section v-if="stats" class="card">
        <header class="card-header"><h2>Requests per day</h2></header>
        <div class="card-body"><UsageChart :by-day="stats.by_day" :days="30" /></div>
      </section>

      <section class="card">
        <header class="card-header">
          <h2>Requests</h2>
          <RouterLink :to="{path: '/admin/usage', query: {client_id: client.id}}" class="small">Filter in Usage</RouterLink>
        </header>
        <RequestsTable :rows="requests" :show-client="false" :loading="loadingRequests" empty-text="This client hasn’t made any requests yet." @open="openId = $event" />
        <footer v-if="total > requests.length" class="more">
          <button class="btn btn-secondary btn-sm" type="button" :disabled="loadingRequests" @click="loadMore">Show more</button>
        </footer>
      </section>
    </template>

    <RequestDrawer :id="openId" @close="openId = null" />

    <ModalDialog v-if="confirming" title="Revoke access?" @close="confirming = false">
      <p class="confirm-text">
        <strong>{{ client.name }}</strong>’s access token stops working at once, and any calls they make will be refused.
        This can’t be undone; to give them access again, create a new client.
      </p>
      <p v-if="revokeError" class="form-error">{{ revokeError }}</p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="confirming = false">Cancel</button>
        <button class="btn btn-danger" type="button" :disabled="revoking" @click="revoke">{{ revoking ? 'Revoking…' : 'Revoke access' }}</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {api} from '../../api.js';
import {checkName, daysAgo, formatDateTime, formatNumber, plural} from '../../format.js';
import UsageChart from '../../components/UsageChart.vue';
import RequestsTable from '../../components/RequestsTable.vue';
import RequestDrawer from '../../components/RequestDrawer.vue';
import ModalDialog from '../../components/ModalDialog.vue';
import ClientBilling from '../../components/ClientBilling.vue';

const route = useRoute();
const client = ref(null);
const stats = ref(null);
const requests = ref([]);
const total = ref(0);
const page = ref(1);
const loadingRequests = ref(false);
const error = ref('');
const openId = ref(null);

async function loadRequests() {
  loadingRequests.value = true;
  try {
    const r = await api.requests({client_id: route.params.id, page: page.value, per_page: 25});
    requests.value = page.value === 1 ? r.requests : [...requests.value, ...r.requests];
    total.value = r.total;
  } catch (err) {
    error.value = err.message;
  } finally {
    loadingRequests.value = false;
  }
}

function loadMore() {
  page.value++;
  loadRequests();
}

async function load() {
  error.value = '';
  client.value = null;
  stats.value = null;
  page.value = 1;
  try {
    const [c, s] = await Promise.all([
      api.client(route.params.id),
      api.stats({client_id: route.params.id, from: daysAgo(29)}),
    ]);
    client.value = c.client;
    stats.value = s;
    loadRequests();
  } catch (err) {
    error.value = err.message;
  }
}

watch(() => route.params.id, (id) => id && load(), {immediate: true});

const editingWebhook = ref(false);
const webhookDraft = ref('');
const savingWebhook = ref(false);
const webhookError = ref('');

function editWebhook() {
  webhookDraft.value = client.value.webhook_url || '';
  webhookError.value = '';
  editingWebhook.value = true;
}

async function putWebhook(url) {
  savingWebhook.value = true;
  webhookError.value = '';
  try {
    const {client: updated} = await api.updateClient(client.value.id, {webhook_url: url});
    client.value = {...client.value, ...updated};
    editingWebhook.value = false;
  } catch (err) {
    webhookError.value = err.message;
  } finally {
    savingWebhook.value = false;
  }
}

const saveWebhook = () => putWebhook(webhookDraft.value.trim() || null);
const clearWebhook = () => putWebhook(null);

const confirming = ref(false);
const revoking = ref(false);
const revokeError = ref('');

async function revoke() {
  revoking.value = true;
  revokeError.value = '';
  try {
    const {client: updated} = await api.revokeClient(client.value.id);
    client.value = {...client.value, ...updated};
    confirming.value = false;
  } catch (err) {
    revokeError.value = err.message;
  } finally {
    revoking.value = false;
  }
}
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.back { justify-self: start; color: var(--muted); }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 22px 24px; flex-wrap: wrap; }
.head-main { display: grid; gap: 16px; min-width: 0; }
.title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.title-row h2 { font-size: 22px; font-weight: 700; }
.facts { margin: 0; display: flex; flex-wrap: wrap; gap: 14px 36px; }
.facts dt { font-size: 12px; color: var(--muted); font-weight: 600; }
.facts dd { margin: 2px 0 0; font-size: 14px; }
.danger-outline { color: var(--bad); border-color: #f5c2c2; }
.danger-outline:hover { background: var(--bad-soft) !important; }
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.stat { padding: 18px 20px; display: grid; gap: 4px; }
.stat-label { font-size: 13px; color: var(--muted); font-weight: 600; }
.stat-value { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
.stat-note { font-size: 12px; color: var(--muted); }
.more { padding: 14px; text-align: center; border-top: 1px solid var(--line); }
.confirm-text { margin: 0; }
.webhook .card-body { display: grid; gap: 8px; }
.webhook p { margin: 0; }
.webhook-url code { word-break: break-all; font-size: 13px; }
.webhook-form { display: grid; gap: 10px; }
.webhook-actions { display: flex; justify-content: flex-end; gap: 8px; }
.danger-text { color: var(--bad); margin-right: auto; }
</style>

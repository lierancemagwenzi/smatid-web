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
            <div><dt>Token</dt><dd><code>{{ client.token_prefix }}…</code></dd></div>
            <div><dt>Created</dt><dd>{{ formatDateTime(client.created_at) }}</dd></div>
            <div><dt>Last used</dt><dd>{{ formatDateTime(client.last_used_at) }}</dd></div>
            <div v-if="client.revoked_at"><dt>Revoked</dt><dd>{{ formatDateTime(client.revoked_at) }}</dd></div>
            <div><dt>Requests</dt><dd>{{ formatNumber(client.requests) }}</dd></div>
          </dl>
        </div>
        <button v-if="client.status === 'active'" class="btn btn-secondary danger-outline" type="button" @click="confirming = true">Revoke access</button>
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
</style>

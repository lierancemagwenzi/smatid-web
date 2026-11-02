<template>
  <div class="page">
    <section class="card filters">
      <div class="field grow">
        <label for="f-q">Search</label>
        <input id="f-q" v-model="draftQ" class="input" type="search" placeholder="Name, company or ID number" @keydown.enter="applySearch" @search="applySearch" />
      </div>
      <div class="field">
        <label for="f-client">Client</label>
        <select id="f-client" v-model="filters.client_id" class="select">
          <option value="">All clients</option>
          <option v-for="c in clients" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        </select>
      </div>
      <div class="field">
        <label for="f-check">Check</label>
        <select id="f-check" v-model="filters.check_type" class="select">
          <option value="">All checks</option>
          <option v-for="(label, key) in CHECKS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="f-outcome">Result</label>
        <select id="f-outcome" v-model="filters.outcome" class="select">
          <option value="">Any</option>
          <option value="ok">Answered</option>
          <option value="error">Errors only</option>
        </select>
      </div>
      <div class="field">
        <label for="f-from">From</label>
        <input id="f-from" v-model="filters.from" class="input" type="date" :max="filters.to || undefined" />
      </div>
      <div class="field">
        <label for="f-to">To</label>
        <input id="f-to" v-model="filters.to" class="input" type="date" :min="filters.from || undefined" />
      </div>
      <button v-if="hasFilters" class="btn btn-ghost clear" type="button" @click="clearFilters">Clear</button>
    </section>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card">
      <header class="card-header">
        <h2>{{ loading ? 'Loading…' : `${formatNumber(total)} request${total === 1 ? '' : 's'}` }}</h2>
        <span v-if="loading" class="spinner"></span>
      </header>
      <RequestsTable :rows="rows" :loading="loading" :empty-text="hasFilters ? 'No requests match these filters.' : 'No KYC requests yet.'" @open="openId = $event" />
      <footer v-if="pages > 1" class="pager">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="page <= 1 || loading" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ pages }}</span>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="page >= pages || loading" @click="page++">Older →</button>
      </footer>
    </section>

    <RequestDrawer :id="openId" @close="openId = null" />
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {api} from '../../api.js';
import {CHECKS, formatNumber} from '../../format.js';
import RequestsTable from '../../components/RequestsTable.vue';
import RequestDrawer from '../../components/RequestDrawer.vue';

const PER_PAGE = 25;
const KEYS = ['q', 'client_id', 'check_type', 'outcome', 'from', 'to'];

const route = useRoute();
const router = useRouter();

// Filters live in the URL, so a filtered view can be bookmarked or shared with another admin.
const filters = reactive(Object.fromEntries(KEYS.map((k) => [k, typeof route.query[k] === 'string' ? route.query[k] : ''])));
const draftQ = ref(filters.q);
const page = ref(Number(route.query.page) || 1);

const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const clients = ref([]);
const openId = ref(null);

const pages = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)));
const hasFilters = computed(() => KEYS.some((k) => filters[k]));

function applySearch() {
  filters.q = draftQ.value.trim();
}

function clearFilters() {
  KEYS.forEach((k) => (filters[k] = ''));
  draftQ.value = '';
}

let seq = 0;
async function load() {
  const mine = ++seq;
  loading.value = true;
  error.value = '';
  try {
    const r = await api.requests({...filters, page: page.value, per_page: PER_PAGE});
    if (mine !== seq) return;
    rows.value = r.requests;
    total.value = r.total;
  } catch (err) {
    if (mine === seq) error.value = err.message;
  } finally {
    if (mine === seq) loading.value = false;
  }
}

watch(
  () => KEYS.map((k) => filters[k]).join('|'),
  () => {
    if (page.value !== 1) page.value = 1;
    else sync();
  },
);
watch(page, sync);

function sync() {
  const query = Object.fromEntries(KEYS.filter((k) => filters[k]).map((k) => [k, filters[k]]));
  if (page.value > 1) query.page = String(page.value);
  router.replace({query});
  load();
}

onMounted(async () => {
  load();
  try {
    clients.value = (await api.clients()).clients;
  } catch {
    // The client filter just stays empty.
  }
});
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px; padding: 16px 18px; }
.filters .field { min-width: 130px; flex: 1 1 130px; }
.filters .grow { flex: 2 1 200px; }
.clear { align-self: flex-end; }
.pager { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--line); }
</style>

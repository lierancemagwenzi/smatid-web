<template>
  <div class="page">
    <section class="card filters">
      <div class="field grow">
        <label for="q">Search</label>
        <input id="q" v-model="draftQ" class="input" type="search" placeholder="Name, company number, reference…" @keydown.enter="filters.q = draftQ.trim()" @search="filters.q = draftQ.trim()" />
      </div>
      <div class="field">
        <label for="check">Check</label>
        <select id="check" v-model="filters.check_type" class="select">
          <option value="">All checks</option>
          <option v-for="(label, key) in CHECKS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="outcome">Result</label>
        <select id="outcome" v-model="filters.outcome" class="select">
          <option value="">Any</option>
          <option value="ok">Answered</option>
          <option value="error">Errors only</option>
        </select>
      </div>
      <div class="field"><label for="from">From</label><input id="from" v-model="filters.from" class="input" type="date" /></div>
      <div class="field"><label for="to">To</label><input id="to" v-model="filters.to" class="input" type="date" /></div>
    </section>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card">
      <header class="card-header">
        <h2>{{ loading ? 'Loading…' : `${formatNumber(total)} ${total === 1 ? 'check' : 'checks'}` }}</h2>
        <span v-if="loading" class="spinner"></span>
      </header>
      <RequestsTable :rows="rows" :show-client="false" show-credits :loading="loading" empty-text="No checks match." @open="openId = $event" />
      <footer v-if="pages > 1" class="pager">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="page <= 1" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ pages }}</span>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="page >= pages" @click="page++">Older →</button>
      </footer>
    </section>

    <RequestDrawer :id="openId" :fetcher="portalApi.usageDetail" :admin="false" @close="openId = null" />
  </div>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue';
import {portalApi} from '../../portal/api.js';
import {CHECKS, formatNumber} from '../../format.js';
import RequestsTable from '../../components/RequestsTable.vue';
import RequestDrawer from '../../components/RequestDrawer.vue';

const PER_PAGE = 25;
const filters = reactive({q: '', check_type: '', outcome: '', from: '', to: ''});
const draftQ = ref('');
const page = ref(1);
const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const openId = ref(null);
const pages = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)));

let seq = 0;
async function load() {
  const mine = ++seq;
  loading.value = true;
  try {
    const r = await portalApi.usage({...filters, page: page.value, per_page: PER_PAGE});
    if (mine !== seq) return;
    rows.value = r.requests;
    total.value = r.total;
    error.value = '';
  } catch (err) {
    if (mine === seq) error.value = err.message;
  } finally {
    if (mine === seq) loading.value = false;
  }
}

watch(() => JSON.stringify(filters), () => (page.value === 1 ? load() : (page.value = 1)));
watch(page, load, {immediate: true});
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px; padding: 16px 18px; }
.filters .field { min-width: 130px; flex: 1 1 130px; }
.filters .grow { flex: 2 1 220px; }
.pager { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--line); }
</style>

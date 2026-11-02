<template>
  <div class="page">
    <div class="toolbar">
      <p class="muted">Credit top-ups paid through SmatPay, by every client.</p>
      <select v-model="status" class="select narrow" aria-label="Status">
        <option value="">All</option>
        <option value="paid">Paid</option>
        <option value="pending">Waiting</option>
        <option value="failed">Failed</option>
        <option value="expired">Not paid</option>
      </select>
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>
    <section class="card">
      <header class="card-header"><h2>{{ loading ? 'Loading…' : `${formatNumber(total)} top-ups` }}</h2><span class="muted small">Paid on this page: {{ paidTotal }}</span></header>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>When</th><th>Client</th><th class="num">Credits</th><th>Amount</th><th>Method</th><th>Status</th><th>Reference</th></tr></thead>
          <tbody>
            <tr v-for="tp in rows" :key="tp.id">
              <td class="nowrap muted">{{ formatDateTime(tp.created_at) }}</td>
              <td><RouterLink :to="`/admin/clients/${tp.client_id}`">{{ tp.client_name || `#${tp.client_id}` }}</RouterLink></td>
              <td class="num">{{ formatNumber(tp.credits) }}</td>
              <td class="nowrap">{{ tp.currency }} {{ tp.amount.toFixed(2) }}</td>
              <td>{{ tp.method }}{{ tp.payer_mobile ? ` · ${tp.payer_mobile}` : '' }}</td>
              <td><span class="badge" :class="TONE[tp.status]">{{ tp.status }}</span><div v-if="tp.failure_reason" class="muted small">{{ tp.failure_reason }}</div></td>
              <td><code class="small">{{ tp.reference }}</code></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !rows.length" class="empty">No top-ups yet.</p>
      </div>
      <footer v-if="pages > 1" class="pager">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="page <= 1" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ pages }}</span>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="page >= pages" @click="page++">Older →</button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue';
import {api} from '../../api.js';
import {formatDateTime, formatNumber} from '../../format.js';

const TONE = {paid: 'ok', pending: '', failed: 'bad', expired: 'warn', refunded: 'warn'};
const PER_PAGE = 25;
const status = ref('');
const page = ref(1);
const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const pages = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)));
const paidTotal = computed(() => {
  const sums = {};
  for (const r of rows.value.filter((x) => x.status === 'paid')) sums[r.currency] = (sums[r.currency] || 0) + r.amount;
  return Object.entries(sums).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ') || '—';
});

async function load() {
  loading.value = true;
  try {
    const r = await api.topups({status: status.value, page: page.value, per_page: PER_PAGE});
    rows.value = r.topups;
    total.value = r.total;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
watch(status, () => (page.value === 1 ? load() : (page.value = 1)));
watch(page, load, {immediate: true});
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.toolbar p { margin: 0; }
.narrow { width: auto; }
.pager { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--line); }
</style>

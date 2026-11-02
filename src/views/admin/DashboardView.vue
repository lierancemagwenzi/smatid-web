<template>
  <div class="page">
    <div class="toolbar">
      <p class="muted">KYC activity across all clients.</p>
      <select v-model.number="days" class="select range" aria-label="Period">
        <option :value="7">Last 7 days</option>
        <option :value="30">Last 30 days</option>
        <option :value="90">Last 90 days</option>
      </select>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="stats">
      <div class="card stat">
        <span class="stat-label">Requests</span>
        <span class="stat-value">{{ stats ? formatNumber(stats.totals.requests) : '—' }}</span>
        <span class="stat-note">in the last {{ days }} days</span>
      </div>
      <div class="card stat">
        <span class="stat-label">Errors</span>
        <span class="stat-value" :class="{bad: stats && stats.totals.errors}">{{ stats ? formatNumber(stats.totals.errors) : '—' }}</span>
        <span class="stat-note">{{ errorRate }}</span>
      </div>
      <div class="card stat">
        <span class="stat-label">Active clients</span>
        <span class="stat-value">{{ stats ? formatNumber(stats.totals.active_clients) : '—' }}</span>
        <span class="stat-note">{{ stats ? `${stats.totals.revoked_clients} revoked` : '' }}</span>
      </div>
      <div v-for="c in checkTotals" :key="c.check_type" class="card stat">
        <span class="stat-label">{{ checkName(c.check_type) }}</span>
        <span class="stat-value">{{ formatNumber(c.requests) }}</span>
        <span class="stat-note">{{ c.errors ? plural(c.errors, 'error') : 'no errors' }}</span>
      </div>
    </div>

    <div class="grid">
      <section class="card">
        <header class="card-header"><h2>Requests per day</h2></header>
        <div class="card-body">
          <UsageChart v-if="stats" :by-day="stats.by_day" :days="days" />
          <div v-else class="chart-placeholder"></div>
        </div>
      </section>

      <section class="card">
        <header class="card-header">
          <h2>Top clients</h2>
          <RouterLink to="/admin/clients" class="small">All clients</RouterLink>
        </header>
        <ul v-if="stats && stats.by_client.length" class="top">
          <li v-for="c in stats.by_client" :key="c.client_id">
            <RouterLink :to="`/admin/clients/${c.client_id}`">{{ c.name || `#${c.client_id}` }}</RouterLink>
            <div class="top-bar"><i :style="{width: `${(c.requests / stats.by_client[0].requests) * 100}%`}"></i></div>
            <span class="num">{{ formatNumber(c.requests) }}</span>
          </li>
        </ul>
        <p v-else class="empty">{{ stats ? 'No requests in this period.' : '' }}</p>
      </section>
    </div>

    <section class="card">
      <header class="card-header">
        <h2>Latest requests</h2>
        <RouterLink to="/admin/usage" class="small">All usage</RouterLink>
      </header>
      <RequestsTable :rows="recent" :loading="loading" @open="openId = $event" />
    </section>

    <RequestDrawer :id="openId" @close="openId = null" />
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue';
import {api} from '../../api.js';
import {checkName, daysAgo, formatNumber, plural} from '../../format.js';
import UsageChart from '../../components/UsageChart.vue';
import RequestsTable from '../../components/RequestsTable.vue';
import RequestDrawer from '../../components/RequestDrawer.vue';

const days = ref(30);
const stats = ref(null);
const recent = ref([]);
const loading = ref(true);
const error = ref('');
const openId = ref(null);

const checkTotals = computed(() => (stats.value ? stats.value.by_check : []));
const errorRate = computed(() => {
  if (!stats.value || !stats.value.totals.requests) return 'no requests';
  return `${((stats.value.totals.errors / stats.value.totals.requests) * 100).toFixed(1)}% of requests`;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const from = daysAgo(days.value - 1);
    const [s, r] = await Promise.all([api.stats({from}), api.requests({per_page: 8})]);
    stats.value = s;
    recent.value = r.requests;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(days, load, {immediate: true});
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.toolbar p { margin: 0; }
.range { width: auto; }
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
.stat { padding: 18px 20px; display: grid; gap: 4px; }
.stat-label { font-size: 13px; color: var(--muted); font-weight: 600; }
.stat-value { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.stat-value.bad { color: var(--bad); }
.stat-note { font-size: 12px; color: var(--muted); }
.grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.chart-placeholder { height: 240px; }
.top { list-style: none; margin: 0; padding: 8px 20px 16px; display: grid; gap: 4px; }
.top li { display: grid; grid-template-columns: minmax(0, 1.2fr) 1fr auto; align-items: center; gap: 12px; padding: 8px 0; font-size: 14px; }
.top a { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-bar { height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
.top-bar i { display: block; height: 100%; background: var(--brand); border-radius: 3px; }
.num { font-variant-numeric: tabular-nums; font-weight: 600; }
@media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
</style>

<template>
  <div class="page">
    <div v-if="welcome" class="banner ok">
      <strong>Welcome to Smatid KYC.</strong>
      Your free trial has started: {{ formatNumber(data?.client.trial_credits) }} credits until {{ formatDate(data?.client.trial_until) }}.
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>

    <template v-if="data">
      <div v-if="data.client.trial_active" class="banner info">
        <span>Free trial: <strong>{{ formatNumber(data.client.trial_credits) }} trial credits</strong> left, until {{ formatDate(data.client.trial_until) }} ({{ daysLeft }} {{ daysLeft === 1 ? 'day' : 'days' }}). Unused trial credits expire then.</span>
        <RouterLink to="/app/credits" class="btn btn-secondary btn-sm">Top up</RouterLink>
      </div>
      <div v-else-if="data.client.available_credits <= 0" class="banner warn">
        <span><strong>You’re out of credits.</strong> Checks are refused with <code>402 insufficient_credits</code> until you top up.</span>
        <RouterLink to="/app/credits" class="btn btn-primary btn-sm">Top up now</RouterLink>
      </div>

      <div v-if="!data.client.has_api_token" class="card setup">
        <div>
          <h2>Next step: create your API token</h2>
          <p class="muted small">Your systems use it to call the KYC API.{{ isOwner() ? '' : ' Ask an account owner to create it.' }}</p>
        </div>
        <RouterLink v-if="isOwner()" to="/app/developers" class="btn btn-primary">Create API token</RouterLink>
      </div>

      <div class="stats">
        <div class="card stat hero">
          <span class="stat-label">Available credits</span>
          <span class="stat-value">{{ formatNumber(data.client.available_credits) }}</span>
          <span class="stat-note">{{ formatNumber(data.client.credits) }} paid{{ data.client.trial_active ? ` · ${formatNumber(data.client.trial_credits)} trial` : '' }}</span>
          <RouterLink to="/app/credits" class="btn btn-primary btn-sm">Top up</RouterLink>
        </div>
        <div class="card stat">
          <span class="stat-label">Checks, last 30 days</span>
          <span class="stat-value">{{ formatNumber(data.stats.totals.requests) }}</span>
          <span class="stat-note">{{ data.stats.totals.errors ? plural(data.stats.totals.errors, 'error') : 'no errors' }}</span>
        </div>
        <div class="card stat">
          <span class="stat-label">Credits used, last 30 days</span>
          <span class="stat-value">{{ formatNumber(data.stats.totals.credits) }}</span>
          <span class="stat-note"><RouterLink to="/app/credits#history">See history</RouterLink></span>
        </div>
      </div>

      <div class="grid">
        <section class="card">
          <header class="card-header"><h2>Checks per day</h2></header>
          <div class="card-body"><UsageChart :by-day="data.stats.by_day" :days="30" /></div>
        </section>
        <section class="card">
          <header class="card-header"><h2>Prices</h2><span class="muted small">credits per check</span></header>
          <table class="table">
            <tbody>
              <tr v-for="p in data.prices" :key="p.key">
                <td>{{ p.name }}<span v-if="p.status !== 'enabled'" class="badge plain off">unavailable</span></td>
                <td class="num"><strong>{{ p.credit_cost }}</strong></td>
              </tr>
            </tbody>
          </table>
          <p class="muted small price-note">Only completed checks are charged. A bad request or a source being down is refunded.</p>
        </section>
      </div>

      <section class="card">
        <header class="card-header">
          <h2>Latest checks</h2>
          <RouterLink to="/app/usage" class="small">All usage</RouterLink>
        </header>
        <RequestsTable :rows="data.recent" :show-client="false" show-credits empty-text="No checks yet. Once your systems call the API, they’ll show here." @open="openId = $event" />
      </section>
    </template>
    <div v-else-if="!error" class="empty"><span class="spinner" style="display:inline-block"></span></div>

    <RequestDrawer :id="openId" :fetcher="portalApi.usageDetail" :admin="false" @close="openId = null" />
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {portalApi} from '../../portal/api.js';
import {isOwner, portalUpdate} from '../../portal/session.js';
import {formatDate, formatNumber, plural} from '../../format.js';
import UsageChart from '../../components/UsageChart.vue';
import RequestsTable from '../../components/RequestsTable.vue';
import RequestDrawer from '../../components/RequestDrawer.vue';

const route = useRoute();
const welcome = route.query.welcome === '1';
const data = ref(null);
const error = ref('');
const openId = ref(null);

const daysLeft = computed(() => (data.value ? Math.max(0, Math.ceil((new Date(data.value.client.trial_until) - Date.now()) / 86400000)) : 0));

onMounted(async () => {
  try {
    data.value = await portalApi.dashboard({from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)});
    portalUpdate(data.value);
  } catch (err) {
    error.value = err.message;
  }
});
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 18px; border-radius: 12px; font-size: 14.5px; }
.banner.ok { background: var(--ok-soft); color: #065f46; display: block; }
.banner.info { background: var(--brand-soft); color: #1e3a8a; }
.banner.warn { background: var(--warn-soft); color: #92400e; }
.setup { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; border-color: #bfd0ff; flex-wrap: wrap; }
.setup h2 { font-size: 16px; margin-bottom: 4px; }
.setup p { margin: 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.stat { padding: 18px 20px; display: grid; gap: 4px; align-content: start; }
.stat.hero { background: linear-gradient(135deg, #eef3ff, #ffffff); border-color: #c7d6ff; }
.stat .btn { justify-self: start; margin-top: 8px; }
.stat-label { font-size: 13px; color: var(--muted); font-weight: 600; }
.stat-value { font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.stat-note { font-size: 12.5px; color: var(--muted); }
.grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.price-note { margin: 0; padding: 12px 16px 16px; }
.off { margin-left: 8px; font-size: 11px; }
@media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
</style>

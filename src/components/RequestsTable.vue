<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Time</th>
          <th v-if="showClient">Client</th>
          <th>Check</th>
          <th>Searched for</th>
          <th>Result</th>
          <th class="num">Took</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id" class="clickable" tabindex="0" @click="$emit('open', r.id)" @keydown.enter="$emit('open', r.id)">
          <td class="nowrap muted">{{ formatDateTime(r.created_at) }}</td>
          <td v-if="showClient" class="nowrap">
            <RouterLink :to="`/admin/clients/${r.client_id}`" @click.stop>{{ r.client_name || `#${r.client_id}` }}</RouterLink>
          </td>
          <td class="nowrap">{{ checkName(r.check_type) }}</td>
          <td class="subject">{{ r.subject || '—' }}</td>
          <td>
            <div class="result">
              <OutcomeBadge :outcome="r.outcome" />
              <span class="label">{{ r.label }}</span>
            </div>
          </td>
          <td class="num muted nowrap">{{ formatDuration(r.duration_ms) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!rows.length && !loading" class="empty">{{ emptyText }}</p>
  </div>
</template>

<script setup>
import OutcomeBadge from './OutcomeBadge.vue';
import {checkName, formatDateTime, formatDuration} from '../format.js';

defineProps({
  rows: {type: Array, required: true},
  showClient: {type: Boolean, default: true},
  loading: {type: Boolean, default: false},
  emptyText: {type: String, default: 'No KYC requests yet.'},
});
defineEmits(['open']);
</script>

<style scoped>
.subject { font-weight: 500; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result { display: flex; align-items: center; gap: 8px; min-width: 0; }
.label { color: var(--ink-2); font-size: 13px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

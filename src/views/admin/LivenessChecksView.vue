<template>
  <div>
    <div class="toolbar">
      <div class="filters">
        <select v-model="filters.status" class="select" aria-label="Result">
          <option value="">Any result</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="started">In progress</option>
          <option value="pending">Not started</option>
        </select>
      </div>
      <span class="muted small">{{ total }} {{ total === 1 ? 'check' : 'checks' }}</span>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Face</th>
              <th>When</th>
              <th>Client</th>
              <th>Result</th>
              <th>Tries</th>
              <th>Reference</th>
              <th>Session</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.session_id" class="clickable" @click="current = s.session_id">
              <td class="thumb">
                <AuthImage v-if="s.photo" :load="() => api.livenessFrame(s.session_id, s.photo)" :alt="`Face from ${s.session_id}`" width="56px" height="56px" />
                <span v-else class="muted small">—</span>
              </td>
              <td class="nowrap">{{ when(s.created_at) }}</td>
              <td>{{ s.client?.name || '—' }}<span v-if="s.test" class="badge small-badge">test</span></td>
              <td>
                <OutcomeBadge :outcome="s.status" />
                <div v-if="s.failure_reason" class="small muted">{{ words(s.failure_reason) }}</div>
              </td>
              <td>{{ s.attempts }}</td>
              <td class="small">{{ s.reference || '—' }}</td>
              <td class="mono small nowrap">{{ s.session_id }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !sessions.length" class="empty">No liveness checks yet.</p>
        <div v-if="loading" class="empty"><span class="spinner" style="display:inline-block"></span></div>
      </div>
      <div v-if="total > perPage" class="pager">
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page <= 1" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ Math.ceil(total / perPage) }}</span>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page * perPage >= total" @click="page++">Older →</button>
      </div>
    </section>

    <ModalDialog v-if="current" :title="`Liveness check ${current}`" width="980px" @close="current = null">
      <LivenessFrames :session-id="current" />
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref, watch} from 'vue';
import {api} from '../../api.js';
import ModalDialog from '../../components/ModalDialog.vue';
import AuthImage from '../../components/AuthImage.vue';
import LivenessFrames from '../../components/LivenessFrames.vue';
import OutcomeBadge from '../../components/OutcomeBadge.vue';

const sessions = ref([]);
const total = ref(0);
const page = ref(1);
const perPage = 25;
const filters = reactive({status: ''});
const loading = ref(true);
const error = ref('');
const current = ref(null);

const when = (d) => (d ? new Date(d).toLocaleString() : '—');
const words = (k) => String(k).replace(/_/g, ' ');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.livenessSessions({status: filters.status, page: page.value, per_page: perPage});
    sessions.value = res.sessions;
    total.value = res.total;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(() => filters.status, () => {
  page.value = 1;
  load();
});
watch(page, load);
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; flex-wrap: wrap; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.filters .select { width: auto; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.thumb { width: 68px; }
.clickable { cursor: pointer; }
.clickable:hover td { background: var(--surface-2, rgba(127, 127, 127, 0.06)); }
.small-badge { margin-left: 6px; font-size: 11px; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-top: 1px solid var(--line); }
</style>

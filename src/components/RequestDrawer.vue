<template>
  <Teleport to="body">
    <div v-if="id" class="scrim" @mousedown.self="$emit('close')">
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="KYC request">
        <header class="drawer-head">
          <div>
            <p class="muted small">Request #{{ id }}</p>
            <h2>{{ detail ? detail.subject || checkName(detail.check_type) : 'Loading…' }}</h2>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" aria-label="Close" @click="$emit('close')">✕</button>
        </header>

        <div class="drawer-body">
          <div v-if="loading" class="loading"><span class="spinner"></span></div>
          <p v-else-if="error" class="form-error">{{ error }}</p>
          <template v-else-if="detail">
            <div class="summary">
              <OutcomeBadge :outcome="detail.outcome" />
              <span>{{ detail.label }}</span>
            </div>
            <dl class="facts">
              <div><dt>Client</dt><dd><RouterLink :to="`/admin/clients/${detail.client_id}`" @click="$emit('close')">{{ detail.client_name || `#${detail.client_id}` }}</RouterLink></dd></div>
              <div><dt>Check</dt><dd>{{ checkName(detail.check_type) }}</dd></div>
              <div><dt>Time</dt><dd>{{ formatDateTime(detail.created_at) }}</dd></div>
              <div><dt>Took</dt><dd>{{ formatDuration(detail.duration_ms) }}</dd></div>
              <div><dt>HTTP status</dt><dd>{{ detail.status }}</dd></div>
              <div><dt>Caller IP</dt><dd class="mono">{{ detail.ip || '—' }}</dd></div>
              <div class="wide"><dt>Call</dt><dd class="mono">{{ detail.method }} {{ detail.path }}</dd></div>
            </dl>

            <div v-if="matches.length" class="matches">
              <h3>Matches</h3>
              <ul>
                <li v-for="m in matches" :key="m.id">
                  <div>
                    <strong>{{ m.name }}</strong>
                    <span class="muted small"> · {{ Math.round(m.score * 100) }}% · {{ (m.datasets || []).length }} lists</span>
                  </div>
                  <div class="match-tags">
                    <span v-if="m.sanctioned" class="badge bad">Sanctioned</span>
                    <span v-if="m.pep" class="badge info">PEP</span>
                    <a v-if="m.url" :href="m.url" target="_blank" rel="noopener noreferrer" class="small">Source ↗</a>
                  </div>
                </li>
              </ul>
            </div>

            <JsonBlock title="What was searched" :value="detail.request" />
            <JsonBlock title="Response" :value="detail.response" />
          </template>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {api} from '../api.js';
import {checkName, formatDateTime, formatDuration} from '../format.js';
import OutcomeBadge from './OutcomeBadge.vue';
import JsonBlock from './JsonBlock.vue';

const props = defineProps({id: {type: [Number, String], default: null}});
const emit = defineEmits(['close']);

const detail = ref(null);
const loading = ref(false);
const error = ref('');
const matches = computed(() => (detail.value && detail.value.response && detail.value.response.matches) || []);

watch(
  () => props.id,
  async (id) => {
    detail.value = null;
    error.value = '';
    if (!id) return;
    loading.value = true;
    try {
      const {request} = await api.request(id);
      if (props.id === id) detail.value = request;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  },
  {immediate: true},
);

const onKey = (e) => e.key === 'Escape' && props.id && emit('close');
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: 40; background: rgb(15 23 42 / 0.35); display: flex; justify-content: flex-end; }
.drawer {
  width: min(640px, 100%);
  height: 100%;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slide 0.18s ease-out;
}
@keyframes slide { from { transform: translateX(24px); opacity: 0; } }
.drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
.drawer-head p { margin: 0 0 2px; }
.drawer-head h2 { font-size: 18px; font-weight: 700; word-break: break-word; }
.drawer-body { padding: 20px; overflow-y: auto; display: grid; gap: 18px; align-content: start; }
.loading { display: grid; place-items: center; padding: 40px; }
.summary { display: flex; align-items: center; gap: 10px; font-weight: 500; }
.facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; padding: 16px; border: 1px solid var(--line); border-radius: var(--radius); }
.facts .wide { grid-column: 1 / -1; }
.facts dt { font-size: 12px; color: var(--muted); font-weight: 600; }
.facts dd { margin: 2px 0 0; font-size: 14px; word-break: break-all; }
.matches h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-bottom: 8px; }
.matches ul { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--radius); }
.matches li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.matches li:last-child { border-bottom: 0; }
.match-tags { display: flex; align-items: center; gap: 8px; }
@media (max-width: 600px) { .facts { grid-template-columns: 1fr; } }
</style>

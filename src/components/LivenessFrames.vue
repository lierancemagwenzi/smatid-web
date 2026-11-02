<template>
  <div class="liveness">
    <h3>Liveness check</h3>
    <div v-if="loading" class="muted small">Loading the session…</div>
    <p v-else-if="error" class="form-error">{{ error }}</p>
    <template v-else-if="session">
      <dl class="facts">
        <div><dt>Status</dt><dd><OutcomeBadge :outcome="badge" /></dd></div>
        <div><dt>Tries</dt><dd>{{ session.attempts }}</dd></div>
        <div><dt>Anti-spoof score</dt><dd>{{ score(session.scores && session.scores.real) }}</dd></div>
        <div><dt>Same person</dt><dd>{{ score(session.scores && session.scores.similarity) }}</dd></div>
        <div v-if="session.failure_reason" class="wide"><dt>Reason</dt><dd class="mono">{{ session.failure_reason }}</dd></div>
      </dl>

      <div v-for="attempt in attempts" :key="attempt.n" class="attempt">
        <p class="small muted">Try {{ attempt.n }}{{ attempt.n === session.attempts ? ' (latest)' : '' }}</p>
        <div class="frames">
          <figure v-for="f in attempt.frames" :key="f.name">
            <img v-if="urls[f.name]" :src="urls[f.name]" :alt="`${stepName(f.step)} frame`" />
            <div v-else class="placeholder"></div>
            <figcaption>
              {{ stepName(f.step) }}
              <template v-if="attempt.n === session.attempts && stepResult(f.index)">
                <span :class="stepResult(f.index).ok ? 'ok' : 'bad'">{{ stepResult(f.index).ok ? '✓' : stepResult(f.index).problem }}</span>
              </template>
            </figcaption>
          </figure>
        </div>
      </div>
      <p v-if="!attempts.length" class="muted small">No pictures yet: the person hasn’t finished a try.</p>
    </template>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue';
import {api} from '../api.js';
import OutcomeBadge from './OutcomeBadge.vue';

const props = defineProps({sessionId: {type: String, required: true}});

const session = ref(null);
const frames = ref([]);
const urls = ref({});
const loading = ref(false);
const error = ref('');

const STEPS = {center: 'Straight on', turn_left: 'Turn left', turn_right: 'Turn right', open_mouth: 'Mouth open'};
const stepName = (s) => STEPS[s] || s;
const score = (v) => (typeof v === 'number' ? v.toFixed(2) : '—');
const badge = computed(() => (session.value ? session.value.status : 'pending'));

// Frame files are attempt-<n>-<index>-<step>.jpg.
const attempts = computed(() => {
  const byAttempt = new Map();
  for (const name of frames.value) {
    const m = name.match(/^attempt-(\d+)-(\d+)-([a-z_]+)\.jpg$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (!byAttempt.has(n)) byAttempt.set(n, []);
    byAttempt.get(n).push({name, index: Number(m[2]), step: m[3]});
  }
  return [...byAttempt.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([n, list]) => ({n, frames: list.sort((a, b) => a.index - b.index)}));
});

const stepResult = (index) => {
  const steps = session.value && session.value.result && session.value.result.steps;
  return steps ? steps[index] : null;
};

function release() {
  Object.values(urls.value).forEach((u) => URL.revokeObjectURL(u));
  urls.value = {};
}

watch(
  () => props.sessionId,
  async (id) => {
    release();
    session.value = null;
    frames.value = [];
    error.value = '';
    loading.value = true;
    try {
      const data = await api.livenessSession(id);
      session.value = data.session;
      frames.value = data.frames;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
    // Pictures need the admin's sign-in, so they're fetched rather than linked.
    for (const name of frames.value) {
      try {
        const blob = await api.livenessFrame(id, name);
        if (props.sessionId === id) urls.value = {...urls.value, [name]: URL.createObjectURL(blob)};
      } catch {
        // That picture just stays blank.
      }
    }
  },
  {immediate: true},
);

onBeforeUnmount(release);
</script>

<style scoped>
.liveness { display: grid; gap: 12px; }
h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; padding: 16px; border: 1px solid var(--line); border-radius: var(--radius); }
.facts .wide { grid-column: 1 / -1; }
.facts dt { font-size: 12px; color: var(--muted); font-weight: 600; }
.facts dd { margin: 2px 0 0; font-size: 14px; }
.attempt p { margin: 0 0 6px; }
.frames { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
figure { margin: 0; display: grid; gap: 4px; }
img, .placeholder { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 8px; background: var(--surface-2); transform: scaleX(-1); }
figcaption { font-size: 12px; color: var(--ink-2); display: flex; justify-content: space-between; gap: 4px; flex-wrap: wrap; }
figcaption .ok { color: var(--ok); font-weight: 700; }
figcaption .bad { color: var(--bad); font-family: var(--mono); font-size: 11px; }
@media (max-width: 600px) { .frames { grid-template-columns: repeat(2, 1fr); } }
</style>

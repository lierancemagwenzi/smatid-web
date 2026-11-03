<template>
  <section class="card">
    <header class="card-header"><h2>Test liveness</h2><RouterLink to="/docs/liveness" class="small">How liveness works</RouterLink></header>
    <div class="card-body stack">
      <p class="muted small">
        Free test sessions, so you can see the whole flow before you build it in. They use no credits, aren’t counted in your usage,
        and say <code>"test": true</code> in the result and the webhook.
        <template v-if="left !== null"> {{ left }} {{ left === 1 ? 'test' : 'tests' }} left in the last 24 hours.</template>
      </p>
      <div class="row-btns">
        <button class="btn btn-primary btn-sm" type="button" :disabled="busy" @click="create()">Try it yourself</button>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="busy" @click="create('passed')">Send a passed result</button>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="busy" @click="create('failed')">Send a failed result</button>
      </div>
      <p class="muted small">“Try it yourself” opens a real check on the hosted page. The other two skip the camera and finish straight away, to test your webhook.</p>
      <p v-if="error" class="form-error">{{ error }}</p>

      <div v-if="session" class="session">
        <div class="session-head">
          <span>Session <code>{{ session.session_id }}</code></span>
          <OutcomeBadge :outcome="session.status" />
        </div>

        <div v-if="waiting" class="handoff">
          <img :src="qrUrl" alt="QR code for the test check" width="132" height="132" />
          <div class="stack">
            <p>Scan the code with your phone, or <a :href="session.url" target="_blank" rel="noopener">open the check in a new tab</a>.</p>
            <p class="muted small"><span class="spinner"></span> Waiting for the check to finish. This updates by itself.</p>
          </div>
        </div>

        <p v-if="!session.webhook" class="muted small">No webhook is set, so no result was sent. Add one above to receive results.</p>
        <p v-else class="small">
          Webhook to <code>{{ session.webhook.url }}</code>:
          <span class="badge" :class="WEBHOOK_TONE[session.webhook.status] || ''">{{ webhookText }}</span>
          <span v-if="session.webhook.last_error" class="muted"> · {{ session.webhook.last_error }}</span>
        </p>

        <JsonBlock :title="`GET /api/kyc/liveness/${session.session_id}`" :value="session" />
        <p class="muted small">The webhook’s <code>data</code> is this same object, sent as <code>{"event": "liveness.completed", "data": …}</code> and signed with your secret.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, ref} from 'vue';
import {portalApi} from '../portal/api.js';
import JsonBlock from './JsonBlock.vue';
import OutcomeBadge from './OutcomeBadge.vue';

const WEBHOOK_TONE = {delivered: 'ok', pending: '', failed: 'bad'};
const OPEN = ['pending', 'started'];

const session = ref(null);
const left = ref(null);
const busy = ref(false);
const error = ref('');
let timer = null;
let polls = 0;

const waiting = computed(() => session.value && OPEN.includes(session.value.status));
const qrUrl = computed(() => session.value && `${session.value.url.replace('/liveness/', '/api/liveness/')}/qr.svg`);
const webhookText = computed(() => {
  const w = session.value && session.value.webhook;
  if (!w || !w.status) return 'sent when the check finishes';
  if (w.status === 'delivered') return 'delivered';
  if (w.status === 'failed') return `failed after ${w.attempts} tries`;
  return w.attempts ? `retrying (${w.attempts} tries so far)` : 'sending…';
});

function stop() {
  clearTimeout(timer);
  timer = null;
}
onBeforeUnmount(stop);

/** Follows the session until it finishes and its webhook has gone out (or given up), for at most ~10 minutes. */
function follow() {
  stop();
  const s = session.value;
  const webhookSettled = !s.webhook || ['delivered', 'failed'].includes(s.webhook.status);
  if ((!OPEN.includes(s.status) && webhookSettled) || polls > 200) return;
  timer = setTimeout(async () => {
    polls++;
    try {
      session.value = (await portalApi.livenessTest(s.session_id)).session;
    } catch {
      // Try again on the next tick.
    }
    follow();
  }, 3000);
}

async function create(outcome) {
  busy.value = true;
  error.value = '';
  stop();
  try {
    const res = await portalApi.createLivenessTest(outcome ? {outcome} : {});
    session.value = res.session;
    left.value = res.tests_left_today;
    polls = 0;
    follow();
  } catch (err) {
    error.value = err.message;
    if (err.code === 'test_limit_reached') left.value = 0;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.stack { display: grid; gap: 12px; }
.stack p { margin: 0; }
.row-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.session { display: grid; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line); }
.session p { margin: 0; }
.session-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; }
.session-head code { font-size: 12.5px; word-break: break-all; }
.handoff { display: flex; gap: 16px; align-items: center; padding: 14px; border: 1px solid var(--line); border-radius: var(--radius); }
.handoff img { flex: none; border-radius: 8px; background: #fff; }
.spinner { display: inline-block; vertical-align: -2px; width: 12px; height: 12px; }
@media (max-width: 600px) { .handoff { flex-direction: column; align-items: flex-start; } }
</style>

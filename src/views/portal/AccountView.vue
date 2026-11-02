<template>
  <div class="page">
    <section class="card">
      <header class="card-header"><h2>You</h2></header>
      <dl class="card-body facts">
        <div><dt>Name</dt><dd>{{ portal.user?.name }}</dd></div>
        <div><dt>Email</dt><dd>{{ portal.user?.email }}</dd></div>
        <div><dt>Company</dt><dd>{{ portal.client?.name }}</dd></div>
        <div><dt>Role</dt><dd>{{ portal.user?.role === 'owner' ? 'Owner' : 'Member' }}</dd></div>
      </dl>
    </section>

    <section class="card">
      <header class="card-header"><h2>Change password</h2></header>
      <form class="card-body form" @submit.prevent="change">
        <p v-if="message" :class="ok ? 'ok-text' : 'form-error'">{{ message }}</p>
        <div class="field"><label for="cur">Current password</label><input id="cur" v-model="current" class="input" type="password" autocomplete="current-password" required /></div>
        <div class="field"><label for="new">New password</label><input id="new" v-model="next" class="input" type="password" autocomplete="new-password" minlength="10" required /><span class="small muted">At least 10 characters. You’ll stay signed in here; other devices are signed out.</span></div>
        <div><button class="btn btn-primary" type="submit" :disabled="busy">{{ busy ? 'Saving…' : 'Change password' }}</button></div>
      </form>
    </section>
  </div>
</template>

<script setup>
import {ref} from 'vue';
import {portalApi} from '../../portal/api.js';
import {portal} from '../../portal/session.js';

const current = ref('');
const next = ref('');
const busy = ref(false);
const message = ref('');
const ok = ref(false);

async function change() {
  message.value = '';
  busy.value = true;
  try {
    await portalApi.changePassword(current.value, next.value);
    ok.value = true;
    message.value = 'Password changed.';
    current.value = '';
    next.value = '';
  } catch (err) {
    ok.value = false;
    message.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.page { display: grid; gap: 20px; max-width: 720px; }
.facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
.facts dt { font-size: 12px; font-weight: 600; color: var(--muted); }
.facts dd { margin: 2px 0 0; }
.form { display: grid; gap: 14px; max-width: 420px; }
.form p { margin: 0; }
.ok-text { color: var(--ok); }
@media (max-width: 600px) { .facts { grid-template-columns: 1fr; } }
</style>

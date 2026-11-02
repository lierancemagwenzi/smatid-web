<template>
  <AuthShell title="Reset your password" :subtitle="sent ? '' : 'Enter your email and we’ll send you a link to choose a new password.'">
    <div v-if="sent" class="ok-box">If there’s an account for <strong>{{ email }}</strong>, we’ve sent a link to reset its password. It works for 1 hour.</div>
    <template v-else>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <form novalidate @submit.prevent="submit">
        <div class="field">
          <label for="email">Work email</label>
          <input id="email" v-model="email" class="input" type="email" autocomplete="username" required autofocus />
        </div>
        <button class="btn btn-primary btn-lg" type="submit" :disabled="busy">{{ busy ? 'Sending…' : 'Send reset link' }}</button>
      </form>
    </template>
    <template #below><RouterLink to="/login">Back to sign in</RouterLink></template>
  </AuthShell>
</template>

<script setup>
import {ref} from 'vue';
import AuthShell from '../../components/AuthShell.vue';
import {portalApi} from '../../portal/api.js';

const email = ref('');
const sent = ref(false);
const busy = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await portalApi.forgotPassword(email.value.trim());
    sent.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

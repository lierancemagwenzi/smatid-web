<template>
  <AuthShell title="Sign in" subtitle="Run KYC checks, top up credits and see your usage.">
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="unverified" class="ok-box">
      <p style="margin:0 0 10px">We need to confirm your email before you can sign in.</p>
      <button class="btn btn-secondary btn-sm" type="button" :disabled="resending || resent" @click="resend">
        {{ resent ? 'Sent: check your inbox' : resending ? 'Sending…' : 'Send the link again' }}
      </button>
    </div>
    <form novalidate @submit.prevent="submit">
      <div class="field">
        <label for="email">Work email</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" required autofocus />
      </div>
      <div class="field">
        <div class="row-between">
          <label for="password">Password</label>
          <RouterLink to="/forgot-password" class="small">Forgot password?</RouterLink>
        </div>
        <input id="password" v-model="password" class="input" type="password" autocomplete="current-password" required />
      </div>
      <button class="btn btn-primary btn-lg" type="submit" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>
    <template #below>New to Smatid KYC? <RouterLink to="/register">Start a free trial</RouterLink></template>
  </AuthShell>
</template>

<script setup>
import {ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import {portalApi} from '../../portal/api.js';
import {portalSignIn} from '../../portal/session.js';

const route = useRoute();
const router = useRouter();
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const password = ref('');
const error = ref('');
const busy = ref(false);
const unverified = ref(false);
const resending = ref(false);
const resent = ref(false);

async function submit() {
  error.value = '';
  unverified.value = false;
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.';
    return;
  }
  busy.value = true;
  try {
    portalSignIn(await portalApi.login(email.value.trim(), password.value));
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/app') ? route.query.next : '/app';
    router.replace(next);
  } catch (err) {
    if (err.code === 'email_not_verified') unverified.value = true;
    else error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function resend() {
  resending.value = true;
  try {
    await portalApi.resendVerification(email.value.trim());
    resent.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    resending.value = false;
  }
}
</script>

<template>
  <main class="login">
    <form class="card login-card" @submit.prevent="submit" novalidate>
      <RouterLink to="/" class="logo">
        <img src="/favicon.svg" alt="" width="32" height="32" />
        <span>Smatid <b>KYC</b></span>
      </RouterLink>
      <h1>Admin sign in</h1>
      <p class="muted small">Manage API clients and review KYC usage.</p>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" required autofocus />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="password" class="input" type="password" autocomplete="current-password" required />
      </div>

      <button class="btn btn-primary btn-lg" type="submit" :disabled="busy">
        <span v-if="busy" class="spinner" aria-hidden="true"></span>
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </main>
</template>

<script setup>
import {ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {api} from '../../api.js';
import {signIn} from '../../session.js';

const route = useRoute();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.';
    return;
  }
  busy.value = true;
  try {
    signIn(await api.login(email.value.trim(), password.value));
    password.value = '';
    // Only follow ?next= within /admin, never off to another site.
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/admin') ? route.query.next : '/admin';
    router.replace(next);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background:
    radial-gradient(700px 400px at 80% 0%, rgb(29 78 216 / 0.12), transparent 60%),
    var(--bg);
}
.login-card { width: 100%; max-width: 400px; padding: 32px; display: grid; gap: 16px; }
.logo { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 600; font-size: 17px; margin-bottom: 8px; }
.logo:hover { text-decoration: none; }
.logo b { color: var(--brand); }
h1 { font-size: 22px; font-weight: 700; }
.muted { margin: -8px 0 4px; }
.btn-lg { margin-top: 4px; }
.spinner { border-color: rgb(255 255 255 / 0.4); border-top-color: #fff; width: 16px; height: 16px; }
</style>

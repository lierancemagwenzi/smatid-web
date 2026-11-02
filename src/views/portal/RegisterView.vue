<template>
  <AuthShell v-if="!done" title="Start your free trial" :subtitle="`${trialText} No card needed.`">
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <form novalidate @submit.prevent="submit">
      <div class="field">
        <label for="company">Company name</label>
        <input id="company" v-model="form.company_name" class="input" autocomplete="organization" required autofocus />
      </div>
      <div class="field">
        <label for="name">Your name</label>
        <input id="name" v-model="form.name" class="input" autocomplete="name" required />
      </div>
      <div class="field">
        <label for="email">Work email</label>
        <input id="email" v-model="form.email" class="input" type="email" autocomplete="email" required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <div class="pw">
          <input id="password" v-model="form.password" class="input" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="10" required />
          <button class="btn btn-ghost btn-sm" type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
        </div>
        <span class="small muted">At least 10 characters.</span>
      </div>
      <button class="btn btn-primary btn-lg" type="submit" :disabled="busy">{{ busy ? 'Creating your account…' : 'Create account' }}</button>
      <p class="small muted center">By creating an account you agree to use Smatid KYC only for lawful identity checks.</p>
    </form>
    <template #below>Already have an account? <RouterLink to="/login">Sign in</RouterLink></template>
  </AuthShell>

  <AuthShell v-else title="Check your email" :subtitle="`We sent a confirmation link to ${form.email}.`">
    <div class="ok-box">Click the link in the email to confirm your address and start your free trial. It works for 24 hours.</div>
    <p class="small muted">No email after a few minutes? Check your spam folder, or send it again.</p>
    <button class="btn btn-secondary" type="button" :disabled="resending || resent" @click="resend">
      {{ resent ? 'Sent again' : resending ? 'Sending…' : 'Send the link again' }}
    </button>
    <template #below><RouterLink to="/login">Back to sign in</RouterLink></template>
  </AuthShell>
</template>

<script setup>
import {reactive, ref} from 'vue';
import AuthShell from '../../components/AuthShell.vue';
import {portalApi} from '../../portal/api.js';

const trialText = 'Get free credits for 30 days to try company, sanctions and liveness checks.';
const form = reactive({company_name: '', name: '', email: '', password: ''});
const showPassword = ref(false);
const error = ref('');
const busy = ref(false);
const done = ref(false);
const resending = ref(false);
const resent = ref(false);

async function submit() {
  error.value = '';
  if (!form.company_name.trim() || !form.name.trim() || !form.email.trim()) {
    error.value = 'Fill in every field.';
    return;
  }
  if (form.password.length < 10) {
    error.value = 'Use a password of at least 10 characters.';
    return;
  }
  busy.value = true;
  try {
    const res = await portalApi.register({...form, company_name: form.company_name.trim(), name: form.name.trim(), email: form.email.trim()});
    form.email = res.email;
    form.password = '';
    done.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function resend() {
  resending.value = true;
  try {
    await portalApi.resendVerification(form.email);
    resent.value = true;
  } finally {
    resending.value = false;
  }
}
</script>

<style scoped>
.pw { display: flex; gap: 6px; }
.center { text-align: center; margin: 0; }
</style>

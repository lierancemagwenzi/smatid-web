<template>
  <main class="auth">
    <div class="auth-card card">
      <RouterLink to="/" class="logo">
        <img src="/favicon.svg" alt="" width="30" height="30" />
        <span>Smatid <b>KYC</b></span>
      </RouterLink>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="sub">{{ subtitle }}</p>
      <slot />
    </div>
    <p v-if="$slots.below" class="below"><slot name="below" /></p>
  </main>
</template>

<script setup>
defineProps({title: {type: String, required: true}, subtitle: {type: String, default: ''}});
</script>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 32px 16px;
  background:
    radial-gradient(800px 420px at 85% -5%, rgb(29 78 216 / 0.14), transparent 60%),
    radial-gradient(600px 360px at -10% 105%, rgb(13 148 136 / 0.10), transparent 60%),
    var(--bg);
}
.auth-card { width: 100%; max-width: 440px; padding: 32px; display: grid; gap: 16px; }
.logo { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 600; font-size: 17px; margin-bottom: 4px; }
.logo:hover { text-decoration: none; }
.logo b { color: var(--brand); }
h1 { font-size: 23px; font-weight: 700; }
.sub { margin: -8px 0 0; color: var(--muted); font-size: 14.5px; line-height: 1.55; }
.below { margin: 0; font-size: 14px; color: var(--muted); text-align: center; }
.auth-card :deep(form) { display: grid; gap: 14px; }
.auth-card :deep(.btn-lg) { width: 100%; }
.auth-card :deep(.row-between) { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.auth-card :deep(.ok-box) { padding: 14px 16px; border-radius: 10px; background: var(--ok-soft); color: #065f46; font-size: 14.5px; line-height: 1.55; }
@media (max-width: 480px) { .auth-card { padding: 24px 20px; } }
</style>

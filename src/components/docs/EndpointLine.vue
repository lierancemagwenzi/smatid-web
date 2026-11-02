<template>
  <div class="endpoint">
    <span class="method" :class="method.toLowerCase()">{{ method }}</span>
    <code>{{ path }}</code>
    <span v-if="auth" class="auth">{{ auth }}</span>
  </div>
</template>

<script setup>
defineProps({method: {type: String, required: true}, path: {type: String, required: true}, auth: {type: String, default: ''}});
</script>

<style scoped>
.endpoint { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); margin: 12px 0 16px; }
.method { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.03em; }
.get { background: #e7f6ef; color: #047857; }
.post { background: #e8efff; color: #1d4ed8; }
.put, .patch { background: #fdf3e2; color: #b45309; }
.delete { background: #fdecec; color: #b91c1c; }
code { font-size: 14px; color: var(--ink); word-break: break-all; }
.auth { margin-left: auto; font-size: 12px; color: var(--muted); }
</style>

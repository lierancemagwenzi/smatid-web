<template>
  <aside class="note" :class="kind">
    <strong v-if="title">{{ title }}</strong>
    <div><slot /></div>
  </aside>
</template>

<script setup>
defineProps({kind: {type: String, default: 'info'}, title: {type: String, default: ''}});
</script>

<style scoped>
.note { display: grid; gap: 4px; padding: 12px 16px; border-radius: 10px; margin: 16px 0; font-size: 14.5px; border-left: 4px solid; }
.note :deep(p) { margin: 0; }
.info { background: #eef3ff; border-color: #1d4ed8; }
.warn { background: #fdf3e2; border-color: #b45309; }
.danger { background: #fdecec; border-color: #b91c1c; }
.tip { background: #e7f6ef; border-color: #047857; }
strong { font-size: 14px; }
</style>

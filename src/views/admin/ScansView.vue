<template>
  <div class="page">
    <nav class="tabs" role="tablist" aria-label="Kind of scan">
      <RouterLink v-for="t in TABS" :key="t.type" :to="{query: {type: t.type}}" class="tab" :class="{active: type === t.type}"
        role="tab" :aria-selected="type === t.type">{{ t.label }}</RouterLink>
    </nav>
    <IdCardsView v-if="type === 'id_card'" />
    <PassportScansView v-else-if="type === 'passport'" />
    <LivenessChecksView v-else-if="type === 'liveness'" />
    <DocumentChecksView v-else />
  </div>
</template>

<script setup>
// Every scan the service has kept: ID cards, passports and liveness checks with their pictures, and proofread documents.
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import IdCardsView from './IdCardsView.vue';
import PassportScansView from './PassportScansView.vue';
import LivenessChecksView from './LivenessChecksView.vue';
import DocumentChecksView from './DocumentChecksView.vue';

const TABS = [
  {type: 'id_card', label: 'ID cards'},
  {type: 'passport', label: 'Passports'},
  {type: 'liveness', label: 'Liveness'},
  {type: 'document', label: 'Documents'},
];
const route = useRoute();
const type = computed(() => (TABS.some((t) => t.type === route.query.type) ? route.query.type : 'id_card'));
</script>

<style scoped>
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); margin-bottom: 18px; overflow-x: auto; }
.tab { padding: 10px 14px; text-decoration: none; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
.tab:hover { color: var(--text, inherit); }
.tab.active { color: var(--text, inherit); border-bottom-color: var(--brand, #2563eb); font-weight: 600; }
</style>

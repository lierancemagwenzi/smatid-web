<template>
  <Teleport to="body">
    <div class="backdrop" @mousedown.self="$emit('close')">
      <section class="dialog card" role="dialog" aria-modal="true" :aria-labelledby="titleId" :style="{maxWidth: width}">
        <header class="dialog-head">
          <h2 :id="titleId">{{ title }}</h2>
          <button class="btn btn-ghost btn-sm" type="button" aria-label="Close" @click="$emit('close')">✕</button>
        </header>
        <div class="dialog-body"><slot /></div>
        <footer v-if="$slots.footer" class="dialog-foot"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import {onBeforeUnmount, onMounted} from 'vue';

defineProps({title: {type: String, required: true}, width: {type: String, default: '480px'}});
const emit = defineEmits(['close']);
const titleId = `dialog-${Math.random().toString(36).slice(2)}`;

const onKey = (e) => e.key === 'Escape' && emit('close');
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(15 23 42 / 0.45);
}
.dialog { width: 100%; box-shadow: var(--shadow-lg); max-height: calc(100vh - 32px); display: flex; flex-direction: column; }
.dialog-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); }
.dialog-head h2 { font-size: 16px; font-weight: 600; }
.dialog-body { padding: 20px; display: grid; gap: 16px; overflow-y: auto; }
.dialog-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--line); background: var(--surface-2); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
</style>

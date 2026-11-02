<template>
  <div class="json">
    <div class="json-head">
      <span>{{ title }}</span>
      <button class="btn btn-ghost btn-sm" type="button" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
    </div>
    <pre><code>{{ text }}</code></pre>
  </div>
</template>

<script setup>
import {computed, ref} from 'vue';

const props = defineProps({title: String, value: {required: true}});
const text = computed(() => JSON.stringify(props.value, null, 2));
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Clipboard blocked; the text can still be selected by hand.
  }
}
</script>

<style scoped>
.json { border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.json-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 4px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
pre { margin: 0; padding: 14px; overflow: auto; max-height: 420px; font-size: 12.5px; line-height: 1.6; background: #fbfcfe; }
</style>

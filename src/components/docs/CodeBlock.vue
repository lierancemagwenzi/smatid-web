<template>
  <div class="code">
    <div class="code-head">
      <div v-if="tabs.length > 1" class="code-tabs" role="tablist">
        <button
          v-for="(tab, i) in tabs"
          :key="tab.label"
          type="button"
          role="tab"
          :aria-selected="i === active"
          :class="{on: i === active}"
          @click="choose(i)"
        >{{ tab.label }}</button>
      </div>
      <span v-else class="code-label">{{ tabs[0].label }}</span>
      <button class="copy" type="button" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
    </div>
    <pre><code>{{ tabs[active].code.trim() }}</code></pre>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';

// tabs: [{label: 'curl', code: '...'}, ...]. The chosen language is remembered across code blocks.
const props = defineProps({tabs: {type: Array, required: true}});
const KEY = 'smatid_docs_language';
const active = ref(0);
const copied = ref(false);

function preferred() {
  try {
    const label = localStorage.getItem(KEY);
    const i = props.tabs.findIndex((t) => t.label === label);
    return i > -1 ? i : 0;
  } catch {
    return 0;
  }
}
active.value = preferred();
watch(() => props.tabs, () => (active.value = preferred()));
window.addEventListener('smatid-docs-language', () => (active.value = preferred()));

function choose(i) {
  active.value = i;
  try {
    localStorage.setItem(KEY, props.tabs[i].label);
  } catch {
    // Not remembered; fine.
  }
  window.dispatchEvent(new Event('smatid-docs-language'));
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.tabs[active.value].code.trim());
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Clipboard blocked; the code can still be selected.
  }
}
</script>

<style scoped>
.code { border-radius: 12px; overflow: hidden; background: #0b1324; border: 1px solid #1e293b; margin: 14px 0 20px; }
.code-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 12px; border-bottom: 1px solid #1e293b; }
.code-tabs { display: flex; gap: 2px; flex-wrap: wrap; }
.code-tabs button, .copy {
  border: 0; background: transparent; color: #94a3b8; font: inherit; font-size: 12.5px; font-weight: 600;
  padding: 5px 10px; border-radius: 6px; cursor: pointer;
}
.code-tabs button:hover, .copy:hover { color: #e2e8f0; background: rgb(255 255 255 / 0.06); }
.code-tabs button.on { color: #fff; background: rgb(147 180 255 / 0.18); }
.code-label { color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
pre { margin: 0; padding: 16px 18px; overflow-x: auto; color: #e2e8f0; font-size: 13px; line-height: 1.65; }
code { font-family: var(--mono); font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'calt' 0; }
</style>

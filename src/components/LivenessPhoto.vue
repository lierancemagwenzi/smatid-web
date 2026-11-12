<template>
  <AuthImage v-if="frame" :load="load" :alt="alt" :width="width" :height="height" />
  <span v-else class="muted small">{{ message }}</span>
</template>

<script setup>
// The face from a liveness check: its latest try, looking straight ahead (what face matches compare).
import {computed, ref, watch} from 'vue';
import {api} from '../api.js';
import AuthImage from './AuthImage.vue';

const props = defineProps({
  sessionId: {type: String, required: true},
  alt: {type: String, default: 'The face from the liveness check'},
  width: {type: String, default: '100%'},
  height: {type: String, default: 'auto'},
});

const frame = ref('');
const message = ref('Loading…');
const load = computed(() => {
  const id = props.sessionId;
  const name = frame.value;
  return () => api.livenessFrame(id, name);
});

watch(() => props.sessionId, async (id) => {
  frame.value = '';
  message.value = 'Loading…';
  try {
    const {frames} = await api.livenessSession(id);
    const centre = (frames || [])
      .map((name) => ({name, m: name.match(/^attempt-(\d+)-\d+-center\.jpg$/)}))
      .filter((f) => f.m)
      .sort((a, b) => Number(b.m[1]) - Number(a.m[1]));
    if (centre.length) frame.value = centre[0].name;
    else message.value = 'No picture kept';
  } catch {
    message.value = 'The liveness check isn’t available';
  }
}, {immediate: true});
</script>

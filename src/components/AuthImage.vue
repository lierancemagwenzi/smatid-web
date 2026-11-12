<template>
  <span ref="box" class="auth-image" :class="{empty: !url}" :style="{width, height}">
    <img v-if="url" :src="url" :alt="alt" />
    <span v-else-if="failed" class="muted small">{{ missing }}</span>
  </span>
</template>

<script setup>
// A picture the API only gives to a signed-in admin, so it's fetched (with the session token) rather than
// linked. Loaded once it scrolls into view; let go of when it leaves the page.
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';

const props = defineProps({
  // () => Promise<Blob>, e.g. () => api.idCardImage(id). Changing it loads the new picture.
  load: {type: Function, required: true},
  alt: {type: String, default: ''},
  width: {type: String, default: '100%'},
  height: {type: String, default: 'auto'},
  missing: {type: String, default: 'No picture'},
});

const box = ref(null);
const url = ref('');
const failed = ref(false);
let observer = null;
let wanted = false;

function release() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = '';
}

async function fetchIt() {
  const load = props.load;
  failed.value = false;
  try {
    const blob = await load();
    if (load !== props.load || !wanted) return;
    release();
    url.value = URL.createObjectURL(blob);
  } catch {
    if (load === props.load) failed.value = true;
  }
}

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    wanted = true;
    fetchIt();
    return;
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && !wanted) {
      wanted = true;
      observer.disconnect();
      fetchIt();
    }
  }, {rootMargin: '200px'});
  observer.observe(box.value);
});

watch(() => props.load, () => {
  if (wanted) fetchIt();
});

onBeforeUnmount(() => {
  wanted = false;
  if (observer) observer.disconnect();
  release();
});
</script>

<style scoped>
.auth-image { display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 6px; background: var(--surface-2, rgba(127, 127, 127, 0.08)); vertical-align: middle; }
.auth-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.auth-image.empty { border: 1px dashed var(--line); }
.auth-image .small { padding: 4px; text-align: center; }
</style>

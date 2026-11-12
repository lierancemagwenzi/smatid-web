<template>
  <div class="face-match">
    <div class="head">
      <h3>Face match</h3>
      <span class="badge" :class="tone">{{ label }}</span>
    </div>
    <div class="pair">
      <figure>
        <AuthImage :load="documentPhoto" :alt="documentLabel" height="150px" />
        <figcaption class="small muted">{{ documentLabel }}</figcaption>
      </figure>
      <figure v-if="match.liveness_session_id">
        <LivenessPhoto :session-id="match.liveness_session_id" height="150px" />
        <figcaption class="small muted">Liveness check <span class="mono">{{ match.liveness_session_id }}</span></figcaption>
      </figure>
    </div>
    <p class="small muted">
      Similarity <strong>{{ similarity }}</strong>
      <template v-if="match.thresholds"> (match at {{ match.thresholds.match }}, review at {{ match.thresholds.review }})</template>
      <template v-if="match.checked_at"> · checked {{ new Date(match.checked_at).toLocaleString() }}</template>
    </p>
  </div>
</template>

<script setup>
import {computed} from 'vue';
import AuthImage from './AuthImage.vue';
import LivenessPhoto from './LivenessPhoto.vue';

const props = defineProps({
  match: {type: Object, required: true},
  // () => Promise<Blob>: the picture the face was taken from (the card, the passport page or its chip photo).
  documentPhoto: {type: Function, required: true},
  documentLabel: {type: String, default: 'The document'},
});

const LABELS = {match: 'Match', review: 'Needs review', no_match: 'No match', no_face_on_card: 'No face on the card', no_face: 'No face found'};
const label = computed(() => LABELS[props.match.status] || props.match.status || '—');
const tone = computed(() => ({match: 'ok', review: 'warn', no_match: 'bad'})[props.match.status] || 'warn');
const similarity = computed(() => (typeof props.match.similarity === 'number' ? props.match.similarity.toFixed(3) : '—'));
</script>

<style scoped>
.face-match { border-top: 1px solid var(--line); padding-top: 14px; margin-top: 14px; }
.head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.head h3 { margin: 0; font-size: 15px; }
.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
figure { margin: 0; display: grid; gap: 6px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>

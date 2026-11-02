<template>
  <span class="badge" :class="look.tone">{{ look.text }}</span>
</template>

<script setup>
import {computed} from 'vue';

const props = defineProps({outcome: {type: String, required: true}});

const LOOKS = {
  found: {tone: 'ok', text: 'Found'},
  not_found: {tone: 'warn', text: 'Not found'},
  clear: {tone: 'ok', text: 'Clear'},
  hit: {tone: 'warn', text: 'Match'},
  pep: {tone: 'info', text: 'PEP'},
  sanctioned: {tone: 'bad', text: 'Sanctioned'},
  error: {tone: 'bad', text: 'Error'},
};
const look = computed(() => LOOKS[props.outcome] || {tone: '', text: props.outcome});
</script>

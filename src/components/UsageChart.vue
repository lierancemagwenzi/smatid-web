<template>
  <div class="chart">
    <div class="legend">
      <span v-for="s in SERIES" :key="s.key"><i :style="{background: s.color}"></i>{{ s.label }}</span>
    </div>
    <div class="plot" role="img" :aria-label="`Requests per day, ${days.length} days, ${total} in all`">
      <div class="axis">
        <span>{{ max }}</span>
        <span>{{ Math.round(max / 2) }}</span>
        <span>0</span>
      </div>
      <div class="bars">
        <div v-for="d in days" :key="d.date" class="day" :title="tooltip(d)">
          <div class="stack" :style="{height: `${(d.total / max) * 100}%`}">
            <div v-for="s in SERIES" :key="s.key" :style="{flexGrow: d[s.key], background: s.color}"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="x">
      <span>{{ formatDate(days[0]?.date) }}</span>
      <span>{{ formatDate(days[days.length - 1]?.date) }}</span>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue';
import {formatDate} from '../format.js';

const props = defineProps({
  byDay: {type: Array, required: true},
  days: {type: Number, default: 30},
});

const SERIES = [
  {key: 'company', label: 'Company registration', color: 'var(--chart-company)'},
  {key: 'sanctions', label: 'Sanctions & PEP', color: 'var(--chart-sanctions)'},
];

// Every day in the range, including days without calls, oldest first.
const days = computed(() => {
  const counts = new Map();
  for (const row of props.byDay) {
    const entry = counts.get(row.date) || {};
    entry[row.check_type] = (entry[row.check_type] || 0) + row.requests;
    counts.set(row.date, entry);
  }
  const out = [];
  for (let i = props.days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const c = counts.get(date) || {};
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    out.push({date, total, ...Object.fromEntries(SERIES.map((s) => [s.key, c[s.key] || 0]))});
  }
  return out;
});

const total = computed(() => days.value.reduce((n, d) => n + d.total, 0));
// A round top for the scale, at least 4.
const max = computed(() => {
  const top = Math.max(4, ...days.value.map((d) => d.total));
  const step = 10 ** Math.floor(Math.log10(top));
  return Math.ceil(top / (step / 2)) * (step / 2);
});

const tooltip = (d) => `${formatDate(d.date)}: ${d.total} request${d.total === 1 ? '' : 's'}` + SERIES.map((s) => `\n${s.label}: ${d[s.key]}`).join('');
</script>

<style scoped>
.legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--ink-2); margin-bottom: 14px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.plot { display: grid; grid-template-columns: auto 1fr; gap: 10px; height: 200px; }
.axis { display: flex; flex-direction: column; justify-content: space-between; font-size: 11px; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
.bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  border-bottom: 1px solid var(--line-strong);
  background: linear-gradient(to bottom, var(--line) 1px, transparent 1px) 0 0 / 100% 50%;
}
.day { flex: 1; height: 100%; display: flex; align-items: flex-end; min-width: 0; }
.day:hover .stack { opacity: 0.8; }
.stack { width: 100%; display: flex; flex-direction: column-reverse; border-radius: 3px 3px 0 0; overflow: hidden; min-height: 0; }
.stack div { min-height: 0; }
.x { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 6px; padding-left: 28px; }
</style>

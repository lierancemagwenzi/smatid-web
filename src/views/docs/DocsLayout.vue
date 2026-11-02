<template>
  <div class="docs">
    <header class="top">
      <div class="top-inner">
        <RouterLink to="/" class="logo">
          <img src="/favicon.svg" alt="" width="26" height="26" />
          <span>Smatid <b>KYC</b></span>
          <span class="tag">Docs</span>
        </RouterLink>
        <nav class="top-links" aria-label="Site">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/docs/introduction" class="on">Documentation</RouterLink>
          <RouterLink to="/admin" class="btn btn-secondary btn-sm">Admin sign in</RouterLink>
        </nav>
      </div>
    </header>

    <div class="body">
      <aside class="side" aria-label="Documentation">
        <div v-for="group in groups" :key="group.name" class="side-group">
          <p class="side-title">{{ group.name }}</p>
          <RouterLink
            v-for="s in group.sections"
            :key="s.slug"
            :to="`/docs/${s.slug}`"
            class="side-link"
            :class="{active: s.slug === current.slug}"
          >{{ s.title }}</RouterLink>
        </div>
      </aside>

      <div class="mobile-nav">
        <label class="visually-hidden" for="docs-section">Section</label>
        <select id="docs-section" class="select" :value="current.slug" @change="go($event.target.value)">
          <optgroup v-for="group in groups" :key="group.name" :label="group.name">
            <option v-for="s in group.sections" :key="s.slug" :value="s.slug">{{ s.title }}</option>
          </optgroup>
        </select>
      </div>

      <main class="content">
        <p class="crumb">{{ current.group }}</p>
        <article class="doc">
          <component :is="page" />
        </article>
        <nav class="pager" aria-label="Previous and next">
          <RouterLink v-if="prev" :to="`/docs/${prev.slug}`" class="pager-link">
            <span class="pager-dir">← Previous</span>
            <span>{{ prev.title }}</span>
          </RouterLink>
          <span v-else></span>
          <RouterLink v-if="next" :to="`/docs/${next.slug}`" class="pager-link right">
            <span class="pager-dir">Next →</span>
            <span>{{ next.title }}</span>
          </RouterLink>
        </nav>
      </main>
    </div>
  </div>
</template>

<script setup>
import {computed, defineAsyncComponent} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {SECTIONS} from './docs.js';

const route = useRoute();
const router = useRouter();

const pages = import.meta.glob('./pages/*.vue');
const loaded = {};
function pageFor(slug) {
  const path = `./pages/${slug}.vue`;
  if (!loaded[slug]) loaded[slug] = defineAsyncComponent(pages[path]);
  return loaded[slug];
}

const current = computed(() => SECTIONS.find((s) => s.slug === route.params.slug) || SECTIONS[0]);
const index = computed(() => SECTIONS.indexOf(current.value));
const prev = computed(() => SECTIONS[index.value - 1]);
const next = computed(() => SECTIONS[index.value + 1]);
const page = computed(() => pageFor(current.value.slug));

const groups = SECTIONS.reduce((out, s) => {
  const g = out.find((x) => x.name === s.group);
  if (g) g.sections.push(s);
  else out.push({name: s.group, sections: [s]});
  return out;
}, []);

const go = (slug) => router.push(`/docs/${slug}`);
</script>

<style scoped>
.docs { min-height: 100vh; background: var(--surface); }
.top { position: sticky; top: 0; z-index: 10; background: rgb(11 19 36 / 0.96); backdrop-filter: blur(8px); }
.top-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; gap: 20px; }
.logo { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 600; }
.logo:hover { text-decoration: none; }
.logo b { color: #93b4ff; }
.tag { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #cbd5e1; border: 1px solid rgb(255 255 255 / 0.2); border-radius: 6px; padding: 2px 6px; }
.top-links { margin-left: auto; display: flex; align-items: center; gap: 20px; }
.top-links a { color: #cbd5e1; font-size: 14px; font-weight: 500; }
.top-links a:hover, .top-links a.on { color: #fff; text-decoration: none; }
.top-links .btn { background: transparent; color: #fff; border-color: rgb(255 255 255 / 0.25); }
.top-links .btn:hover { background: rgb(255 255 255 / 0.08); }

.body { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 250px minmax(0, 1fr); }
.side { position: sticky; top: 60px; height: calc(100vh - 60px); overflow-y: auto; padding: 28px 20px 40px 24px; border-right: 1px solid var(--line); }
.side-group { margin-bottom: 22px; }
.side-title { margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.side-link { display: block; padding: 6px 10px; margin: 1px 0; border-radius: 7px; color: var(--ink-2); font-size: 14.5px; }
.side-link:hover { background: var(--surface-2); text-decoration: none; }
.side-link.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.mobile-nav { display: none; }

.content { padding: 36px 56px 64px; max-width: 900px; }
.crumb { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--brand); }
.pager { display: flex; justify-content: space-between; gap: 16px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); }
.pager-link { display: grid; gap: 2px; padding: 12px 16px; border: 1px solid var(--line); border-radius: 10px; min-width: 200px; color: var(--ink); font-weight: 600; }
.pager-link:hover { border-color: var(--brand); text-decoration: none; }
.pager-link.right { text-align: right; }
.pager-dir { font-size: 12px; color: var(--muted); font-weight: 500; }

/* Prose for every page. */
.doc :deep(h1) { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 12px; }
.doc :deep(.lead) { font-size: 17px; color: var(--ink-2); margin: 0 0 24px; }
.doc :deep(h2) { font-size: 22px; font-weight: 700; margin: 40px 0 10px; padding-top: 8px; scroll-margin-top: 80px; }
.doc :deep(h3) { font-size: 17px; font-weight: 600; margin: 28px 0 8px; }
.doc :deep(p), .doc :deep(li) { font-size: 15.5px; line-height: 1.7; color: #1e293b; }
.doc :deep(p) { margin: 0 0 14px; }
.doc :deep(ul), .doc :deep(ol) { margin: 0 0 16px; padding-left: 22px; }
.doc :deep(li) { margin-bottom: 6px; }
.doc :deep(code) { font-family: var(--mono); font-size: 0.86em; background: var(--surface-2); padding: 2px 5px; border-radius: 5px; color: #0f172a; }
.doc :deep(pre code) { background: none; padding: 0; color: inherit; }
.doc :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0 22px; font-size: 14.5px; display: block; overflow-x: auto; }
.doc :deep(th) { text-align: left; font-size: 12.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 12px; border-bottom: 2px solid var(--line); white-space: nowrap; }
.doc :deep(td) { padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; line-height: 1.55; }
.doc :deep(td code) { white-space: nowrap; }
.doc :deep(.steps) { list-style: none; padding: 0; counter-reset: step; }
.doc :deep(.steps > li) { position: relative; padding: 0 0 6px 44px; counter-increment: step; }
.doc :deep(.steps > li)::before {
  content: counter(step); position: absolute; left: 0; top: 0;
  width: 28px; height: 28px; border-radius: 50%; background: var(--brand); color: #fff;
  display: grid; place-items: center; font-size: 13px; font-weight: 700;
}
.doc :deep(.steps > li > strong:first-child) { display: block; font-size: 16px; margin-bottom: 2px; }
.doc :deep(.req) { color: var(--bad); font-size: 12px; font-weight: 600; }
.doc :deep(.opt) { color: var(--muted); font-size: 12px; }
.doc :deep(.cards) { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin: 16px 0 24px; }
.doc :deep(.cards a) { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); }
.doc :deep(.cards a:hover) { border-color: var(--brand); text-decoration: none; }
.doc :deep(.cards a span) { color: var(--muted); font-size: 13.5px; }

@media (max-width: 900px) {
  .body { grid-template-columns: 1fr; }
  .side { display: none; }
  .mobile-nav { display: block; padding: 14px 16px; border-bottom: 1px solid var(--line); position: sticky; top: 60px; background: var(--surface); z-index: 5; }
  .content { padding: 24px 16px 48px; }
  .top-inner { padding: 0 16px; }
  .top-links a:not(.btn):not(.on) { display: none; }
  .doc :deep(h1) { font-size: 26px; }
  .pager { flex-direction: column; }
  .pager-link { min-width: 0; }
}
@media (max-width: 480px) { .top-links .on { display: none; } }
</style>

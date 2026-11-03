<template>
  <div class="shell">
    <aside class="sidebar" :class="{open: menuOpen}">
      <RouterLink to="/app" class="logo" @click="menuOpen = false">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span>Smatid <b>KYC</b></span>
      </RouterLink>
      <div class="company">
        <span class="company-name">{{ portal.client?.name }}</span>
        <span class="company-role">{{ portal.user?.role === 'owner' ? 'Owner' : 'Member' }}</span>
      </div>
      <nav aria-label="Account">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-item" :class="{active: isActive(item)}" @click="menuOpen = false">
          <span aria-hidden="true" v-html="item.icon"></span>
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="sidebar-foot">
        <RouterLink to="/docs/introduction" class="nav-item small">Documentation ↗</RouterLink>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-sm menu-btn" type="button" aria-label="Menu" @click="menuOpen = !menuOpen">☰</button>
        <h1 class="page-title">{{ route.meta.title }}</h1>
        <RouterLink to="/app/credits" class="balance" :class="{low: low}" title="Available credits">
          <span class="balance-n">{{ formatNumber(portal.client?.available_credits) }}</span>
          <span class="balance-l">credits</span>
        </RouterLink>
        <div class="who">
          <span class="who-name">{{ portal.user?.name }}</span>
          <button class="btn btn-secondary btn-sm" type="button" :disabled="signingOut" @click="logout">Sign out</button>
        </div>
      </header>
      <main class="content">
        <RouterView />
      </main>
    </div>
    <div v-if="menuOpen" class="scrim" @click="menuOpen = false"></div>
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {portalApi} from '../../portal/api.js';
import {portal, portalSignOut, portalUpdate} from '../../portal/session.js';
import {formatNumber} from '../../format.js';

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const signingOut = ref(false);
const low = computed(() => (portal.client?.available_credits ?? 0) < 10);

const icon = (path) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const nav = [
  {to: '/app', label: 'Dashboard', exact: true, icon: icon('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>')},
  {to: '/app/checks', label: 'Run a check', icon: icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11l2 2 4-4"/>')},
  {to: '/app/credits', label: 'Credits & top-up', icon: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>')},
  {to: '/app/usage', label: 'Usage', icon: icon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')},
  {to: '/app/developers', label: 'Developers', icon: icon('<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>')},
  {to: '/app/team', label: 'Team', icon: icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/>')},
  {to: '/app/account', label: 'Your account', icon: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>')},
];

const isActive = (item) => (item.exact ? route.path === item.to : route.path.startsWith(item.to));

// Fresh balance and role on every visit (e.g. after a top-up made elsewhere).
onMounted(async () => {
  try {
    portalUpdate(await portalApi.me());
  } catch {
    // A 401 already signs out and goes to sign-in.
  }
});

async function logout() {
  signingOut.value = true;
  try {
    await portalApi.logout();
  } catch {
    // Signed out here either way.
  }
  portalSignOut();
  router.replace({name: 'portal-login'});
}
</script>

<style scoped>
.shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
.sidebar { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 18px; padding: 20px 14px; background: var(--surface); border-right: 1px solid var(--line); }
.logo { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 600; font-size: 16px; padding: 4px 10px; }
.logo:hover { text-decoration: none; }
.logo b { color: var(--brand); }
.company { display: grid; gap: 2px; padding: 10px 12px; border-radius: 10px; background: var(--surface-2); }
.company-name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.company-role { font-size: 12px; color: var(--muted); }
nav { display: grid; gap: 2px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: var(--ink-2); font-size: 14px; font-weight: 500; }
.nav-item:hover { background: var(--surface-2); text-decoration: none; }
.nav-item.active { background: var(--brand-soft); color: var(--brand); }
.sidebar-foot { margin-top: auto; }
.main { min-width: 0; display: flex; flex-direction: column; background: var(--bg); }
.topbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 16px; height: 64px; padding: 0 28px; background: rgb(246 248 251 / 0.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.page-title { font-size: 18px; font-weight: 700; }
.balance { margin-left: auto; display: flex; align-items: baseline; gap: 6px; padding: 6px 12px; border-radius: 999px; background: var(--ok-soft); color: var(--ok); font-weight: 700; }
.balance:hover { text-decoration: none; filter: brightness(0.97); }
.balance.low { background: var(--warn-soft); color: var(--warn); }
.balance-n { font-size: 15px; font-variant-numeric: tabular-nums; }
.balance-l { font-size: 12px; font-weight: 600; }
.who { display: flex; align-items: center; gap: 12px; }
.who-name { font-size: 14px; font-weight: 600; }
.menu-btn { display: none; font-size: 18px; }
.content { padding: 28px; max-width: 1180px; width: 100%; }
.scrim { display: none; }
@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; }
  .sidebar { position: fixed; inset: 0 auto 0 0; width: 264px; z-index: 30; transform: translateX(-100%); transition: transform 0.2s; }
  .sidebar.open { transform: none; }
  .scrim { display: block; position: fixed; inset: 0; background: rgb(15 23 42 / 0.4); z-index: 20; }
  .menu-btn { display: inline-flex; }
  .topbar { padding: 0 16px; gap: 10px; }
  .who-name { display: none; }
  .content { padding: 20px 16px; }
}
</style>

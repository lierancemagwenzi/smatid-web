<template>
  <div class="admin">
    <aside class="sidebar" :class="{open: menuOpen}">
      <RouterLink to="/admin" class="logo" @click="menuOpen = false">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span>Smatid <b>KYC</b></span>
      </RouterLink>
      <nav aria-label="Admin">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-item" :class="{active: isActive(item)}" @click="menuOpen = false">
          <span aria-hidden="true" v-html="item.icon"></span>
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="sidebar-foot">
        <RouterLink to="/" class="nav-item small">← Back to website</RouterLink>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-sm menu-btn" type="button" aria-label="Menu" @click="menuOpen = !menuOpen">☰</button>
        <h1 class="page-title">{{ route.meta.title }}</h1>
        <div class="who">
          <div class="who-text">
            <span class="who-name">{{ session.admin?.name }}</span>
            <span class="who-email">{{ session.admin?.email }}</span>
          </div>
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
import {ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {api} from '../../api.js';
import {session, signOut} from '../../session.js';

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const signingOut = ref(false);

const icon = (path) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const nav = [
  {to: '/admin', label: 'Dashboard', exact: true, icon: icon('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>')},
  {to: '/admin/clients', label: 'Clients', icon: icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/>')},
  {to: '/admin/modules', label: 'Modules', icon: icon('<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/>')},
  {to: '/admin/topups', label: 'Top-ups', icon: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>')},
  {to: '/admin/usage', label: 'Usage', icon: icon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')},
];

nav.push({to: '/admin/settings', label: 'Settings', icon: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>')});

const isActive = (item) => (item.exact ? route.path === item.to : route.path.startsWith(item.to));

async function logout() {
  signingOut.value = true;
  try {
    await api.logout();
  } catch {
    // Signed out here either way; the session expires on its own.
  }
  signOut();
  router.replace({name: 'login'});
}
</script>

<style scoped>
.admin { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 14px;
  background: var(--night);
  color: #cbd5e1;
}
.logo { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 600; font-size: 16px; padding: 4px 10px; }
.logo:hover { text-decoration: none; }
.logo b { color: #93b4ff; }
nav { display: grid; gap: 2px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 500;
}
.nav-item:hover { background: rgb(255 255 255 / 0.06); color: #fff; text-decoration: none; }
.nav-item.active { background: rgb(147 180 255 / 0.14); color: #fff; }
.sidebar-foot { margin-top: auto; }
.sidebar-foot .nav-item { color: #94a3b8; }

.main { min-width: 0; display: flex; flex-direction: column; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 64px;
  padding: 0 28px;
  background: rgb(246 248 251 / 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.page-title { font-size: 18px; font-weight: 700; }
.who { margin-left: auto; display: flex; align-items: center; gap: 14px; }
.who-text { display: grid; text-align: right; line-height: 1.3; }
.who-name { font-size: 14px; font-weight: 600; }
.who-email { font-size: 12px; color: var(--muted); }
.menu-btn { display: none; font-size: 18px; }
.content { padding: 28px; max-width: 1280px; width: 100%; }
.scrim { display: none; }

@media (max-width: 900px) {
  .admin { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 260px;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform 0.2s;
  }
  .sidebar.open { transform: none; }
  .scrim { display: block; position: fixed; inset: 0; background: rgb(15 23 42 / 0.4); z-index: 20; }
  .menu-btn { display: inline-flex; }
  .topbar { padding: 0 16px; gap: 8px; }
  .who-text { display: none; }
  .content { padding: 20px 16px; }
}
</style>

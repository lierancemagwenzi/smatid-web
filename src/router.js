import {createRouter, createWebHistory} from 'vue-router';
import {isSignedIn} from './session.js';
import {isPortalSignedIn} from './portal/session.js';
import LandingView from './views/LandingView.vue';
import {SECTIONS} from './views/docs/docs.js';

const routes = [
    {path: '/', name: 'landing', component: LandingView},
    // Client portal: accounts.
    {path: '/login', name: 'portal-login', component: () => import('./views/portal/LoginView.vue'), meta: {title: 'Sign in', guest: true}},
    {path: '/register', name: 'portal-register', component: () => import('./views/portal/RegisterView.vue'), meta: {title: 'Start your free trial', guest: true}},
    {path: '/verify-email', name: 'portal-verify', component: () => import('./views/portal/VerifyEmailView.vue'), meta: {title: 'Confirm your email'}},
    {path: '/forgot-password', name: 'portal-forgot', component: () => import('./views/portal/ForgotPasswordView.vue'), meta: {title: 'Reset your password'}},
    {path: '/reset-password', name: 'portal-reset', component: () => import('./views/portal/SetPasswordView.vue'), meta: {title: 'Choose a new password'}},
    {path: '/accept-invite', name: 'portal-accept-invite', component: () => import('./views/portal/SetPasswordView.vue'), meta: {title: 'Set up your account'}},
    {
        path: '/app',
        component: () => import('./views/portal/PortalLayout.vue'),
        meta: {requiresUser: true},
        children: [
            {path: '', name: 'portal-dashboard', component: () => import('./views/portal/DashboardView.vue'), meta: {title: 'Dashboard'}},
            {path: 'checks', name: 'portal-checks', component: () => import('./views/portal/ChecksView.vue'), meta: {title: 'Run a check'}},
            {path: 'documents', name: 'portal-documents', component: () => import('./views/portal/DocumentsView.vue'), meta: {title: 'Proofread a document'}},
            {path: 'credits', name: 'portal-credits', component: () => import('./views/portal/CreditsView.vue'), meta: {title: 'Credits & top-up'}},
            {path: 'usage', name: 'portal-usage', component: () => import('./views/portal/UsageView.vue'), meta: {title: 'Usage'}},
            {path: 'developers', name: 'portal-developers', component: () => import('./views/portal/DevelopersView.vue'), meta: {title: 'Developers'}},
            {path: 'team', name: 'portal-team', component: () => import('./views/portal/TeamView.vue'), meta: {title: 'Team'}},
            {path: 'account', name: 'portal-account', component: () => import('./views/portal/AccountView.vue'), meta: {title: 'Your account'}},
        ],
    },
    {path: '/docs', redirect: '/docs/introduction'},
    {path: '/docs/:slug', name: 'docs', component: () => import('./views/docs/DocsLayout.vue'), meta: {docs: true}},
    {path: '/admin/login', name: 'login', component: () => import('./views/admin/LoginView.vue'), meta: {title: 'Sign in'}},
    {
        path: '/admin',
        component: () => import('./views/admin/AdminLayout.vue'),
        meta: {requiresAdmin: true},
        children: [
            {path: '', name: 'dashboard', component: () => import('./views/admin/DashboardView.vue'), meta: {title: 'Dashboard'}},
            {path: 'clients', name: 'clients', component: () => import('./views/admin/ClientsView.vue'), meta: {title: 'Clients'}},
            {path: 'clients/:id', name: 'client', component: () => import('./views/admin/ClientView.vue'), meta: {title: 'Client'}},
            {path: 'modules', name: 'modules', component: () => import('./views/admin/ModulesView.vue'), meta: {title: 'Modules'}},
            {path: 'settings', name: 'settings', component: () => import('./views/admin/SettingsView.vue'), meta: {title: 'Settings'}},
            {path: 'topups', name: 'topups', component: () => import('./views/admin/TopupsView.vue'), meta: {title: 'Top-ups'}},
            {path: 'scans', name: 'scans', component: () => import('./views/admin/ScansView.vue'), meta: {title: 'Scans'}},
            // The ID cards page is now the Scans page's first tab.
            {path: 'id-cards', redirect: {name: 'scans', query: {type: 'id_card'}}},
            {path: 'usage', name: 'usage', component: () => import('./views/admin/UsageView.vue'), meta: {title: 'Usage'}},
        ],
    },
    {path: '/:pathMatch(.*)*', redirect: '/'},
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: (to, from, saved) => {
        if (saved) return saved;
        // Doc pages load on demand, so give the page a moment to appear before scrolling to a heading.
        if (to.hash) return new Promise((resolve) => setTimeout(() => resolve({el: to.hash, top: 80, behavior: 'smooth'}), to.path === from.path ? 0 : 250));
        return {top: 0};
    },
});

router.beforeEach((to) => {
    if (to.matched.some((r) => r.meta.requiresAdmin) && !isSignedIn()) {
        return {name: 'login', query: to.fullPath !== '/admin' ? {next: to.fullPath} : {}};
    }
    if (to.name === 'login' && isSignedIn()) return {name: 'dashboard'};
    if (to.matched.some((r) => r.meta.requiresUser) && !isPortalSignedIn()) {
        return {name: 'portal-login', query: to.fullPath !== '/app' ? {next: to.fullPath} : {}};
    }
    if (to.meta.guest && isPortalSignedIn()) return {name: 'portal-dashboard'};
});

router.afterEach((to) => {
    if (to.meta.docs) {
        const section = SECTIONS.find((s) => s.slug === to.params.slug);
        document.title = `${section ? section.title : 'Documentation'} · Smatid KYC docs`;
        return;
    }
    document.title = to.meta.title ? `${to.meta.title} · Smatid KYC` : 'Smatid KYC';
});

export default router;

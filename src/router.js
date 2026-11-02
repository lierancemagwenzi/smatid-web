import {createRouter, createWebHistory} from 'vue-router';
import {isSignedIn} from './session.js';
import LandingView from './views/LandingView.vue';
import {SECTIONS} from './views/docs/docs.js';

const routes = [
    {path: '/', name: 'landing', component: LandingView},
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

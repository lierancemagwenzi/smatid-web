import {createRouter, createWebHistory} from 'vue-router';
import {isSignedIn} from './session.js';
import LandingView from './views/LandingView.vue';

const routes = [
    {path: '/', name: 'landing', component: LandingView},
    {path: '/admin/login', name: 'login', component: () => import('./views/admin/LoginView.vue'), meta: {title: 'Sign in'}},
    {
        path: '/admin',
        component: () => import('./views/admin/AdminLayout.vue'),
        meta: {requiresAdmin: true},
        children: [
            {path: '', name: 'dashboard', component: () => import('./views/admin/DashboardView.vue'), meta: {title: 'Dashboard'}},
            {path: 'clients', name: 'clients', component: () => import('./views/admin/ClientsView.vue'), meta: {title: 'Clients'}},
            {path: 'clients/:id', name: 'client', component: () => import('./views/admin/ClientView.vue'), meta: {title: 'Client'}},
            {path: 'usage', name: 'usage', component: () => import('./views/admin/UsageView.vue'), meta: {title: 'Usage'}},
        ],
    },
    {path: '/:pathMatch(.*)*', redirect: '/'},
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: (to, from, saved) => saved || (to.hash ? {el: to.hash, behavior: 'smooth'} : {top: 0}),
});

router.beforeEach((to) => {
    if (to.matched.some((r) => r.meta.requiresAdmin) && !isSignedIn()) {
        return {name: 'login', query: to.fullPath !== '/admin' ? {next: to.fullPath} : {}};
    }
    if (to.name === 'login' && isSignedIn()) return {name: 'dashboard'};
});

router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · Smatid KYC` : 'Smatid KYC';
});

export default router;

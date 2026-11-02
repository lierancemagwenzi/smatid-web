import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';

// In development the API (smatpay_kyc) runs on localhost:8011 and /api is proxied to it,
// so VITE_API_URL can stay empty. For a build, set VITE_API_URL to the API's public address.
export default defineConfig({
    plugins: [vue()],
    server: {
        port: 5173,
        proxy: {'/api': 'http://localhost:8011'},
    },
});

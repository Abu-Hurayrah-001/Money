import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import svelteEmailTailwind from 'svelte-email-tailwind/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		svelteEmailTailwind(),
	],
});

<script>
    import { Html, Head, Preview, Body, Container, Text } from 'svelte-email-tailwind';
    
    export let OTP;
</script>

<Html lang="en">
    <Head />
    <Body class="bg-[#f4f4f5] p-6 font-sans">
        <div class="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
            <h1 class="text-3xl font-semibold text-center text-gray-800 mb-3">🔐 One-Time Passcode</h1>
            <p class="text-base text-center text-gray-600 mb-6">Use the code below to complete your login. This code is valid for <strong>30 seconds</strong>.</p>
            <div class="text-center text-5xl font-bold tracking-widest text-indigo-600 bg-indigo-50 py-4 rounded-xl mb-6">
                <strong>{OTP}</strong>
            </div>
            <p class="text-xs text-center text-gray-400">Didn't request this code? You can safely ignore this email.</p>
        </div>
    </Body>
</Html>
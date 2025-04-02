<script>
  export let OTP;
</script>

<Html lang="en">
    <Head />
    <Body class="bg-gray-100 p-6">
        <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 class="text-2xl font-bold text-center mb-4">Your OTP Code</h1>
            <p class="text-lg text-center mb-4">Use the code below to verify your account:</p>
            <div class="text-center text-4xl font-semibold text-blue-500 mb-4">
                {OTP}
            </div>
            <p class="text-sm text-center text-gray-500">This code will expire in 30 seconds.</p>
        </div>
    </Body>
</Html>
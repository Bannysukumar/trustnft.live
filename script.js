document.addEventListener('DOMContentLoaded', function() {
    // Password visibility toggle
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
    });

    // Login button functionality
    const loginButton = document.querySelector('.login-button');
    loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        const phone = document.querySelector('#phone').value;
        const password = passwordInput.value;

        if (!phone || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Here you would typically make an API call to your backend
        console.log('Login attempted with:', { phone, password });
        
        // For demo purposes, always redirect to dashboard
        window.location.href = 'dashboard.html';
    });
}); 
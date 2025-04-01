document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Send verification code
    const sendButton = document.querySelector('.send-button');
    let countdown = 60;
    let timer = null;

    sendButton.addEventListener('click', function() {
        if (this.disabled) return;

        // Simulate sending verification code
        alert('Verification code sent!');
        
        // Disable button and start countdown
        this.disabled = true;
        this.style.opacity = '0.5';
        this.textContent = `${countdown}s`;

        timer = setInterval(() => {
            countdown--;
            this.textContent = `${countdown}s`;
            
            if (countdown === 0) {
                clearInterval(timer);
                this.disabled = false;
                this.style.opacity = '1';
                this.textContent = 'Send';
                countdown = 60;
            }
        }, 1000);
    });

    // Password visibility toggle
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.src = 'eye-slash-icon.png';
            } else {
                input.type = 'password';
                this.src = 'eye-icon.png';
            }
        });
    });

    // Form submission
    const submitButton = document.querySelector('.submit-button');
    submitButton.addEventListener('click', function() {
        const verificationCode = document.getElementById('verification-code').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!verificationCode || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (newPassword.length !== 6) {
            alert('Payment password must be 6 digits');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        // Add password change logic here
        alert('Payment password set successfully');
        window.history.back();
    });
}); 
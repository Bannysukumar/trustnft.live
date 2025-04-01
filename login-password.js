document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
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
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!oldPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        // Add password change logic here
        alert('Password changed successfully');
        window.history.back();
    });
}); 
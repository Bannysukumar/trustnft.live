document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase (make sure firebase-config.js is loaded)
    const auth = firebase.auth();

    // Password visibility toggle for all password fields
    const togglePasswords = document.querySelectorAll('.toggle-password');
    const currentPasswordInput = document.querySelector('#current-password');
    const newPasswordInput = document.querySelector('#new-password');
    const confirmPasswordInput = document.querySelector('#confirm-password');

    togglePasswords.forEach((toggle, index) => {
        toggle.addEventListener('click', function() {
            let input;
            switch(index) {
                case 0:
                    input = currentPasswordInput;
                    break;
                case 1:
                    input = newPasswordInput;
                    break;
                case 2:
                    input = confirmPasswordInput;
                    break;
            }
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            toggle.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    });

    // OK button functionality
    const okButton = document.querySelector('.login-button');
    okButton.addEventListener('click', async function(e) {
        e.preventDefault();

        try {
            const phone = document.querySelector('#phone').value.trim();
            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Basic validation
            if (!phone || !currentPassword || !newPassword || !confirmPassword) {
                throw new Error('Please fill in all fields');
            }

            if (!/^\d{10}$/.test(phone)) {
                throw new Error('Please enter a valid 10-digit phone number');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }

            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }

            if (currentPassword === newPassword) {
                throw new Error('New password must be different from current password');
            }

            // Get current user
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Please log in again to change your password');
            }

            // Verify current password by reauthenticating
            try {
                const credential = firebase.auth.EmailAuthProvider.credential(
                    `${phone}@trustnft.live`,
                    currentPassword
                );
                await user.reauthenticateWithCredential(credential);
            } catch (authError) {
                console.error('Authentication error:', authError);
                throw new Error('Current password is incorrect');
            }

            // Update password
            await user.updatePassword(newPassword);
            
            // Update successful
            alert('Password changed successfully!');
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error("Error changing password:", error);
            alert(error.message || 'Error changing password');
        }
    });

    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Check if user is authenticated
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Pre-fill phone number if available
        const phoneInput = document.querySelector('#phone');
        if (phoneInput && user.email) {
            const phone = user.email.split('@')[0];
            phoneInput.value = phone;
            phoneInput.disabled = true; // Prevent editing phone number
        }
    });
}); 
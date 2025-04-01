document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Show message function
    function showMessage(message, isError = false) {
        // Remove any existing message
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isError ? 'error' : 'success'}`;
        messageDiv.textContent = message;

        // Insert at the top of the container
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => messageDiv.remove(), 5000);
    }

    // Toggle password visibility
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePassword) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // Handle back button
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.history.back();
        });
    }

    // Handle login
    const loginButton = document.querySelector('.login-button');
    if (loginButton) {
        loginButton.addEventListener('click', async function() {
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value.trim();

            // Basic validation
            if (!phone || !password) {
                showMessage('Please enter both phone number and password', true);
                return;
            }

            try {
                // Check if user exists and password matches
                const usersSnapshot = await db.collection('users')
                    .where('phone', '==', phone)
                    .get();

                if (usersSnapshot.empty) {
                    showMessage('Invalid phone number or password', true);
                    return;
                }

                const userDoc = usersSnapshot.docs[0];
                const userData = userDoc.data();

                // Check password
                if (userData.password !== password) { // In a real app, use proper password hashing
                    showMessage('Invalid phone number or password', true);
                    return;
                }

                // Check if user is blocked
                if (userData.status === 'blocked') {
                    showMessage('Your account has been blocked. Please contact support.', true);
                    return;
                }

                // Update last login timestamp
                await db.collection('users').doc(userDoc.id).update({
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Store user data in localStorage
                localStorage.setItem('userId', userDoc.id);
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('userRole', userData.role || 'user');

                // Show success message
                showMessage('Login successful');

            // Redirect to dashboard
                setTimeout(() => {
            window.location.href = 'dashboard.html';
                }, 1000);

        } catch (error) {
                console.error('Login error:', error);
                showMessage('An error occurred during login. Please try again.', true);
            }
        });
    }
}); 
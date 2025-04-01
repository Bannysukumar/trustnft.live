document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const adminLoginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Check if already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check if user is admin
            try {
                const adminDoc = await db.collection('admins').doc(user.uid).get();
                if (adminDoc.exists && adminDoc.data().role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        }
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginButton = document.querySelector('.login-button');

        try {
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';
            errorMessage.style.display = 'none';

            // Sign in with Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if user is admin
            const adminDoc = await db.collection('admins').doc(user.uid).get();
            
            if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
                // Not an admin, sign out and show error
                await auth.signOut();
                throw new Error('Unauthorized access');
            }

            // Admin login successful, redirect to dashboard
            window.location.href = 'admin-dashboard.html';

        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = getErrorMessage(error);
            errorMessage.style.display = 'block';
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });

    function getErrorMessage(error) {
        switch (error.code) {
            case 'auth/wrong-password':
                return 'Invalid password';
            case 'auth/user-not-found':
                return 'Admin account not found';
            case 'auth/invalid-email':
                return 'Invalid email format';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later';
            default:
                return error.message || 'Failed to login. Please try again';
        }
    }
}); 
// Initialize Firebase Auth persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error("Error setting persistence:", error);
    });

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // Check if user data exists in localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            window.location.href = 'dashboard.html';
        } else {
            // If no stored data, fetch and store it
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    localStorage.setItem('userData', JSON.stringify({
                        uid: user.uid,
                        phone: userData.phone,
                        email: userData.email,
                        balance: userData.balance || 0,
                        lastLogin: new Date().toISOString()
                    }));
                    window.location.href = 'dashboard.html';
                }
            });
        }
    }
});

// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        
        try {
            // Show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
            
            // Validate phone number
            if (!phone || phone.length < 10) {
                throw new Error('Please enter a valid phone number');
            }
            
            // Ensure persistence is set to LOCAL
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            // Format phone number to email (remove any non-digit characters)
            const cleanPhone = phone.replace(/\D/g, '');
            const email = `${cleanPhone}@trustnft.live`;
            
            // First check if user exists in Firestore
            const usersSnapshot = await db.collection('users')
                .where('phone', '==', cleanPhone)
                .limit(1)
                .get();
            
            if (usersSnapshot.empty) {
                throw new Error('User not found');
            }
            
            // Sign in with email and password
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            if (userCredential.user) {
                // Get user data from Firestore
                const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
                
                if (userDoc.exists) {
                    // Store user data in localStorage
                    const userData = userDoc.data();
                    localStorage.setItem('userData', JSON.stringify({
                        uid: userCredential.user.uid,
                        phone: userData.phone,
                        email: userData.email,
                        balance: userData.balance || 0,
                        lastLogin: new Date().toISOString()
                    }));
                    
                    // Update last login in Firestore
                    await db.collection('users').doc(userCredential.user.uid).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // User exists, redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // User doesn't exist in Firestore, sign out
                    await auth.signOut();
                    localStorage.removeItem('userData');
                    alert('User not found. Please check your credentials.');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            localStorage.removeItem('userData');
            
            // Show appropriate error message
            if (error.message === 'User not found') {
                alert('User not found. Please check your phone number.');
            } else if (error.message === 'Please enter a valid phone number') {
                alert(error.message);
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                alert('Invalid phone number or password. Please try again.');
            } else if (error.code === 'auth/too-many-requests') {
                alert('Too many failed login attempts. Please try again later.');
            } else if (error.code === 'auth/invalid-credential') {
                alert('Invalid credentials. Please check your phone number and password.');
            } else {
                alert('Login failed. Please try again.');
            }
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

// Handle signup form submission
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        try {
            // Set persistence to LOCAL
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(phone + '@trustnft.live', password);
            
            if (userCredential.user) {
                // Store user data in Firestore
                await db.collection('users').doc(userCredential.user.uid).set({
                    phone: phone,
                    email: phone + '@trustnft.live',
                    balance: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Store user data in localStorage
                localStorage.setItem('userData', JSON.stringify({
                    uid: userCredential.user.uid,
                    phone: phone,
                    email: phone + '@trustnft.live',
                    balance: 0,
                    lastLogin: new Date().toISOString()
                }));
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Signup error:', error);
            localStorage.removeItem('userData');
            alert('Signup failed. Please try again.');
        }
    });
} 
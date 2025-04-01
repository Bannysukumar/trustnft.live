document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be ready
    const checkFirebase = setInterval(() => {
        if (window.db && window.auth) {
            clearInterval(checkFirebase);
            initializeRegistration();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        if (!window.db || !window.auth) {
            clearInterval(checkFirebase);
            alert('Error: Firebase services not available. Please refresh the page.');
            return;
        }
    }, 5000);

    function generateReferralCode(userId) {
        // Generate a code using first 4 chars of userId and 4 random chars
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 4; i++) {
            randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return (userId.substring(0, 4) + randomPart).toUpperCase();
    }

    function initializeRegistration() {
        // Password visibility toggle for both password fields
        const togglePasswords = document.querySelectorAll('.toggle-password');
        const passwordInput = document.querySelector('#password');
        const confirmPasswordInput = document.querySelector('#confirm-password');

        togglePasswords.forEach((toggle, index) => {
            toggle.addEventListener('click', function() {
                const input = index === 0 ? passwordInput : confirmPasswordInput;
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
            });
        });

        // Register button functionality
        const registerButton = document.querySelector('.login-button');
        registerButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                // Get form values
                const phone = document.querySelector('#phone').value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                const invitationCode = document.querySelector('#invitation-code').value.trim();

                // Basic validation
                if (!phone || !password || !confirmPassword || !invitationCode) {
                    throw new Error('Please fill in all fields');
                }

                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }

                // Phone number validation
                if (!/^\d{10}$/.test(phone)) {
                    throw new Error('Please enter a valid 10-digit phone number');
                }

                // Password validation
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters long');
                }

                // First check if invitation code exists
                const inviteRef = await window.db.collection('invitation_codes').doc(invitationCode).get();

                if (!inviteRef.exists) {
                    throw new Error('Invalid invitation code');
                }

                // Check if phone number is already registered
                const email = `${phone}@fedpreferred.com`;
                
                // Create user account
                const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Generate unique referral code for the new user
                const referralCode = generateReferralCode(user.uid);

                // Create user profile in Firestore
                await window.db.collection('users').doc(user.uid).set({
                    phone: phone,
                    referralCode: referralCode,
                    referredBy: invitationCode,
                    referralCount: 0,
                    registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    email: email,
                    balance: 0,
                    vipLevel: 0
                });

                // Create user's invitation code document
                await window.db.collection('invitation_codes').doc(referralCode).set({
                    ownerId: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true,
                    usageCount: 0,
                    usedBy: []
                });

                // Update referrer's stats
                const referrerDoc = await window.db.collection('users').doc(inviteRef.data().ownerId).get();
                if (referrerDoc.exists) {
                    await window.db.collection('users').doc(inviteRef.data().ownerId).update({
                        referralCount: firebase.firestore.FieldValue.increment(1)
                    });
                }

                // Update invitation code usage
                await window.db.collection('invitation_codes').doc(invitationCode).update({
                    usageCount: firebase.firestore.FieldValue.increment(1),
                    usedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
                });

                // Create initial balance document
                await window.db.collection('user_balances').doc(user.uid).set({
                    balance: 0,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update user profile
                await user.updateProfile({
                    displayName: phone
                });

                alert('Registration successful! Redirecting to dashboard...');
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error("Registration error:", error);
                let errorMessage = error.message || 'Registration failed. Please try again.';
                
                // Handle Firebase specific errors
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'This phone number is already registered';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Invalid phone number format';
                            break;
                        case 'auth/operation-not-allowed':
                            errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Password should be at least 6 characters';
                            break;
                    }
                }
                
                alert(errorMessage);
            }
        });
    }
}); 
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is authenticated:', user.uid);
            initializeBankForm(user);
        } else {
            console.log('No user authenticated, redirecting to login');
            window.location.href = 'index.html';
        }
    });

    function initializeBankForm(user) {
        console.log('Bank form initialized for user:', user.uid); // Debug log

        // Get form elements
        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        const bankAccountInput = document.getElementById('bank-account');
        const ifscInput = document.getElementById('ifsc');
        const paymentPasswordInput = document.getElementById('payment-password');
    const submitButton = document.querySelector('.submit-button');

        // Add event listener to the submit button
        submitButton.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Submit button clicked'); // Debug log

            // Get input values
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const bankAccount = bankAccountInput.value.trim();
            const ifsc = ifscInput.value.trim().toUpperCase();
            const paymentPassword = paymentPasswordInput.value.trim();

            console.log('Form values:', { name, phone, bankAccount, ifsc, paymentPassword: '******' }); // Debug log

            // Validate inputs
            if (!name) {
                alert('Please enter your name');
                return;
            }

            if (!phone || !/^\d{10}$/.test(phone)) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }

            if (!bankAccount || !/^\d+$/.test(bankAccount)) {
                alert('Please enter a valid bank account number');
            return;
        }

            if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
                alert('Please enter a valid IFSC code. It should be 11 characters with the 5th character being 0');
            return;
        }

            if (!paymentPassword || !/^\d{6}$/.test(paymentPassword)) {
            alert('Payment password must be 6 digits');
            return;
        }

            try {
                // Disable submit button
                submitButton.disabled = true;
                submitButton.textContent = 'Saving...';

                console.log('Saving bank details to Firestore...'); // Debug log

                // Reference to the user's document
                const userRef = firebase.firestore().collection('users').doc(user.uid);

                // Try to get the user document first
                const userDoc = await userRef.get();

                if (userDoc.exists) {
                    // Update existing document
                    await userRef.update({
                        bankDetails: {
                            name: name,
                            phone: phone,
                            bankAccount: bankAccount,
                            ifsc: ifsc,
                            paymentPassword: paymentPassword,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }
                    });
                } else {
                    // Create new document
                    await userRef.set({
                        bankDetails: {
                            name: name,
                            phone: phone,
                            bankAccount: bankAccount,
                            ifsc: ifsc,
                            paymentPassword: paymentPassword,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }
                    });
                }

                console.log('Bank details saved successfully'); // Debug log
                alert('Bank account added successfully!');
                window.location.href = 'mine.html'; // Redirect to profile page

            } catch (error) {
                console.error('Error saving bank details:', error);
                alert('Failed to save bank details. Please try again.');
            } finally {
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = 'DONE';
            }
        });

        // Add input event listener for payment password
        paymentPasswordInput.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/[^\d]/g, '');
            }
            
            // Limit to 6 digits
            if (value.length > 6) {
                e.target.value = value.slice(0, 6);
            }
        });

        // Add input event listener for IFSC
        ifscInput.addEventListener('input', function(e) {
            let value = e.target.value.toUpperCase();
            e.target.value = value;
        });

        // Add input event listener for phone number
        phoneInput.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/[^\d]/g, '');
            }
            
            // Limit to 10 digits
            if (value.length > 10) {
                e.target.value = value.slice(0, 10);
            }
        });

        // Add input event listener for bank account
        bankAccountInput.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/[^\d]/g, '');
            }
        });

        // Back button functionality
        const backButton = document.querySelector('.back-button');
        backButton.addEventListener('click', function() {
            window.history.back();
        });
    }
}); 
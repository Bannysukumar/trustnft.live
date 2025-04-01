document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is authenticated:', user.uid);
            initializeBankAccountPage(user);
        } else {
            console.log('No user authenticated, redirecting to login');
            window.location.href = 'index.html';
        }
    });

    function initializeBankAccountPage(user) {
        const bankDetailsSection = document.getElementById('bankDetailsSection');
        const actionButtons = document.getElementById('actionButtons');

        // Load user's bank details
        async function loadBankDetails() {
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    console.log('No user document found');
                    showNoBankDetails();
                    return;
                }

                const userData = userDoc.data();
                console.log('User data loaded:', userData);

                if (userData.bankDetails) {
                    // Show existing bank details
                    bankDetailsSection.innerHTML = `
                        <div class="bank-details-card">
                            <div class="detail-row">
                                <span class="detail-label">Account Holder</span>
                                <span class="detail-value">${userData.bankDetails.name}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Phone Number</span>
                                <span class="detail-value">${userData.bankDetails.phone}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Bank Account</span>
                                <span class="detail-value">${maskBankAccount(userData.bankDetails.bankAccount)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">IFSC Code</span>
                                <span class="detail-value">${userData.bankDetails.ifsc}</span>
                            </div>
                        </div>
                    `;

                    // Show edit button
                    actionButtons.innerHTML = `
                        <a href="bind-bank-account.html" class="action-button edit-button">Edit Bank Details</a>
                    `;
                } else {
                    showNoBankDetails();
                }
            } catch (error) {
                console.error('Error loading bank details:', error);
                showError();
            }
        }

        function showNoBankDetails() {
            bankDetailsSection.innerHTML = `
                <div class="no-bank-message">
                    No bank account details found. Add your bank account to enable withdrawals.
                </div>
            `;
            actionButtons.innerHTML = `
                <a href="bind-bank-account.html" class="action-button add-button">Add Bank Account</a>
            `;
        }

        function showError() {
            bankDetailsSection.innerHTML = `
                <div class="no-bank-message">
                    Error loading bank details. Please try again.
                </div>
            `;
            actionButtons.innerHTML = `
                <button onclick="window.location.reload()" class="action-button edit-button">Retry</button>
            `;
        }

        // Helper function to mask bank account number
        function maskBankAccount(accountNumber) {
            if (!accountNumber) return '';
            const length = accountNumber.length;
            if (length <= 4) return accountNumber;
            return '****' + accountNumber.slice(-4);
        }

        // Load initial data
        loadBankDetails();
    }
}); 
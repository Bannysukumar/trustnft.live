document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is authenticated:', user.uid);
            initializeWithdrawPage(user);
        } else {
            console.log('No user authenticated, redirecting to login');
            window.location.href = 'index.html';
        }
    });

    function initializeWithdrawPage(user) {
        const walletDetailsSection = document.getElementById('walletDetailsSection');
        const withdrawForm = document.getElementById('withdrawForm');
        const userBalanceElement = document.getElementById('userBalance');
        const withdrawButton = document.getElementById('withdrawButton');
        const withdrawAmountInput = document.getElementById('withdrawAmount');

        // Load user's wallet details and balance
        async function loadUserData() {
            try {
                const [userDoc, balanceDoc] = await Promise.all([
                    firebase.firestore().collection('users').doc(user.uid).get(),
                    firebase.firestore().collection('user_balances').doc(user.uid).get()
                ]);
                
                if (!userDoc.exists) {
                    console.log('No user document found');
                    return;
                }

                const userData = userDoc.data();
                const balanceData = balanceDoc.exists ? balanceDoc.data() : { balance: 0 };
                console.log('User data loaded:', userData);

                // Update balance display from user_balances collection
                userBalanceElement.textContent = `$${(balanceData.balance || 0).toFixed(2)}`;

                // Check if user has wallet address
                if (userData.walletAddress) {
                    // Show wallet details
                    walletDetailsSection.innerHTML = `
                        <div class="bank-details-card">
                            <div class="detail-row">
                                <span class="detail-label">Wallet Address</span>
                                <span class="detail-value">${maskWalletAddress(userData.walletAddress)}</span>
                            </div>
                            ${userData.walletRemark ? `
                            <div class="detail-row">
                                <span class="detail-label">Remark</span>
                                <span class="detail-value">${userData.walletRemark}</span>
                            </div>
                            ` : ''}
                        </div>
                    `;
                    
                    // Show withdraw form
                    withdrawForm.style.display = 'block';
            } else {
                    // Show message to add wallet address
                    walletDetailsSection.innerHTML = `
                        <div class="no-wallet-message">
                            Please bind your wallet address to withdraw funds
                            <a href="bind-wallet.html" class="bind-wallet-button">Bind Wallet Address</a>
                        </div>
                    `;
                    withdrawForm.style.display = 'none';
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                alert('Error loading your details. Please try again.');
            }
        }

        // Handle withdraw submission
        withdrawButton.addEventListener('click', async function(e) {
            e.preventDefault();

            const amount = parseFloat(withdrawAmountInput.value);
            const paymentMethod = document.getElementById('paymentMethod').value;
            const walletAddress = document.getElementById('walletAddress').value;
            const userId = user.uid;

            if (!amount || amount <= 0) {
                showError('Please enter a valid amount');
                return;
            }

            if (!walletAddress) {
                showError('Please enter your wallet address');
                return;
            }

            // Check user's balance
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            if (!userData || userData.balance < amount) {
                showError('Insufficient balance');
                return;
            }

            try {
                // Disable button while processing
                withdrawButton.disabled = true;
                withdrawButton.textContent = 'Processing...';

                // Start a transaction to ensure data consistency
                await firebase.firestore().runTransaction(async (transaction) => {
                // Create withdrawal request
                    const withdrawRef = firebase.firestore().collection('withdrawals').doc();
                    transaction.set(withdrawRef, {
                        userId: userId,
                    amount: amount,
                        paymentMethod: paymentMethod,
                        walletAddress: walletAddress,
                    status: 'pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Update user's balance in user_balances collection
                    const balanceRef = firebase.firestore().collection('user_balances').doc(userId);
                    transaction.set(balanceRef, {
                        balance: userData.balance - amount,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Add transaction record
                    const transactionRef = firebase.firestore().collection('transactions').doc();
                    transaction.set(transactionRef, {
                        userId: userId,
                    type: 'withdrawal',
                    amount: amount,
                    status: 'pending',
                        description: 'Withdrawal request',
                    date: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

                showSuccess('Withdrawal request submitted successfully');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
        } catch (error) {
                console.error('Error submitting withdrawal:', error);
                showError('Failed to submit withdrawal request');
            } finally {
                withdrawButton.disabled = false;
                withdrawButton.textContent = 'Withdraw';
            }
        });

        // Helper function to mask wallet address
        function maskWalletAddress(address) {
            if (!address) return '';
            if (address.length <= 8) return address;
            return address.slice(0, 4) + '...' + address.slice(-4);
        }

        // Load initial data
        loadUserData();

        // Add input validation for withdraw amount
        withdrawAmountInput.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers and decimal point
            if (!/^\d*\.?\d*$/.test(value)) {
                e.target.value = value.replace(/[^\d.]/g, '');
            }
            
            // Ensure only one decimal point
            if ((value.match(/\./g) || []).length > 1) {
                e.target.value = value.slice(0, value.lastIndexOf('.'));
            }
        });
    }
}); 
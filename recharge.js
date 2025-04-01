document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    let selectedAmount = 1000;
    let selectedPaymentMethod = null;
    const amountGrid = document.querySelector('.amount-grid');
    const submitBtn = document.querySelector('.submit-btn');
    const txnHashInput = document.getElementById('txnHash');
    const paymentAmountDisplay = document.getElementById('paymentAmount');
    const currentBalanceDisplay = document.getElementById('currentBalance');
    const backButton = document.querySelector('.back-button');
    const historyButton = document.querySelector('.history-btn');

    // Recharge History button functionality
    historyButton.addEventListener('click', () => {
        window.location.href = 'transaction-details.html?type=recharge';
    });

    // Back button functionality
    backButton.addEventListener('click', () => {
        window.history.back();
    });

    // Load recharge amounts from Firestore
    async function loadRechargeAmounts() {
        try {
            const doc = await db.collection('settings').doc('recharge_amounts').get();
            const amounts = doc.exists ? doc.data().amounts : [1000, 2500, 5000, 10000, 25000, 50000];
            
            // Clear existing buttons
            amountGrid.innerHTML = '';
            
            // Create buttons for each amount
            amounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'amount-btn';
                button.setAttribute('data-amount', amount);
                button.innerHTML = `<span class="amount">$${amount.toLocaleString()}</span>`;
                amountGrid.appendChild(button);
            });

            // Add click event listeners to new buttons
            setupAmountButtons();
        } catch (error) {
            console.error('Error loading recharge amounts:', error);
        }
    }

    // Setup amount button click handlers
    function setupAmountButtons() {
        const amountBtns = document.querySelectorAll('.amount-btn');
        amountBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                amountBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
            this.classList.add('active');
                // Update selected amount
                selectedAmount = parseInt(this.getAttribute('data-amount'));
                // Update payment amount display
                paymentAmountDisplay.textContent = `$${selectedAmount.toLocaleString()}.00`;
                // Check if transaction hash is entered
                checkSubmitButton();
            });
        });
    }

    // Transaction hash input handler
    txnHashInput.addEventListener('input', checkSubmitButton);

    // Check if submit button should be enabled
    function checkSubmitButton() {
        const hashValue = txnHashInput.value.trim();
        submitBtn.disabled = !selectedAmount || !hashValue;
    }

    // Load payment methods from Firestore
    async function loadPaymentMethods() {
        try {
            const settingsDoc = await db.collection('settings').doc('recharge_settings').get();
            if (!settingsDoc.exists) {
                console.error('Recharge settings not found');
                return;
            }

            const settings = settingsDoc.data();
            const paymentMethods = settings.paymentMethods || [];
            
            // Create payment method options
            const paymentMethodsContainer = document.querySelector('.payment-methods');
            paymentMethodsContainer.innerHTML = '';

            paymentMethods.forEach((method, index) => {
                const methodElement = document.createElement('div');
                methodElement.className = 'payment-method' + (index === 0 ? ' selected' : '');
                
                if (method.type === 'usdt') {
                    methodElement.innerHTML = `
                        <div class="method-header">
                            <span class="material-icons">account_balance_wallet</span>
                            <span class="method-name">${method.name}</span>
                            <span class="network-badge">${method.network}</span>
                        </div>
                        <div class="method-details">
                            <div class="wallet-address">
                                <span class="address-value">${method.usdtAddress}</span>
                                <button class="copy-btn" onclick="copyToClipboard('${method.usdtAddress}')">
                                    <span class="material-icons">content_copy</span>
                                </button>
                            </div>
                            <div class="network-info">${method.network} Network</div>
                            ${method.instructions ? `<div class="instructions">${method.instructions}</div>` : ''}
                        </div>
                    `;
                } else if (method.type === 'qr') {
                    methodElement.innerHTML = `
                        <div class="method-header">
                            <span class="material-icons">qr_code_2</span>
                            <span class="method-name">${method.name}</span>
                        </div>
                        <div class="method-details">
                            <div class="qr-code">
                                <img src="${method.qrImageUrl}" alt="Payment QR Code">
                            </div>
                            ${method.instructions ? `<div class="instructions">${method.instructions}</div>` : ''}
                        </div>
                    `;
                }

                methodElement.addEventListener('click', () => {
                    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
                    methodElement.classList.add('selected');
                    selectedPaymentMethod = method;
                    updatePaymentDetails();
                });

                paymentMethodsContainer.appendChild(methodElement);
            });

            // Select first payment method by default
            if (paymentMethods.length > 0) {
                selectedPaymentMethod = paymentMethods[0];
                updatePaymentDetails();
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
        }
    }

    // Update payment details display
    function updatePaymentDetails() {
        if (!selectedPaymentMethod) return;

        const detailsList = document.querySelector('.details-list');
        detailsList.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Amount to Pay</span>
                <span class="detail-value" id="paymentAmount">$${selectedAmount.toLocaleString()}</span>
            </div>
        `;

        if (selectedPaymentMethod.type === 'usdt') {
            // Get network-specific class
            const networkClass = {
                'BEP20': 'network-bsc',
                'TRC20': 'network-tron',
                'ERC20': 'network-eth'
            }[selectedPaymentMethod.network] || '';

            detailsList.innerHTML += `
                <div class="detail-item">
                    <span class="detail-label">Network</span>
                    <span class="detail-value network-badge ${networkClass}">${selectedPaymentMethod.network}</span>
                </div>
                ${selectedPaymentMethod.instructions ? `
                <div class="detail-item">
                    <span class="detail-label">Instructions</span>
                    <div class="instructions">${selectedPaymentMethod.instructions}</div>
                </div>
                ` : ''}
            `;
        }
    }

    // Load user's current balance
    async function loadUserBalance() {
        try {
            const user = auth.currentUser;
            if (user) {
                const balanceDoc = await db.collection('user_balances')
                    .doc(user.uid)
                    .get();
                
                if (balanceDoc.exists) {
                    const balance = balanceDoc.data().balance || 0;
                    currentBalanceDisplay.textContent = balance.toFixed(2);
                }
            }
        } catch (error) {
            console.error('Error loading user balance:', error);
        }
    }

    // Submit payment handler
    submitBtn.addEventListener('click', async function() {
        if (!selectedAmount || !txnHashInput.value.trim()) {
            alert('Please select an amount and enter transaction hash');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                alert('Please login to continue');
                return;
            }

            // Create recharge request
            await db.collection('recharge_requests').add({
                userId: user.uid,
                amount: selectedAmount,
                transactionHash: txnHashInput.value.trim(),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Recharge request submitted successfully!');
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Error submitting recharge request:', error);
            alert('Failed to submit recharge request: ' + error.message);
        }
    });

    // Initialize
    auth.onAuthStateChanged(function(user) {
        if (user) {
            loadUserBalance();
            loadRechargeAmounts();
            loadPaymentMethods();
        } else {
            window.location.href = 'index.html';
        }
    });
});
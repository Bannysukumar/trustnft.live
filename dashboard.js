document.addEventListener('DOMContentLoaded', function() {
    // Set persistence to LOCAL to keep user logged in
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            // Check authentication state
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    // If not logged in, redirect to login page
                    window.location.href = 'index.html';
                    return;
                }

                try {
                    // Load all necessary data
                    await loadUserData(user.uid);
                    await loadUserBalance(user.uid);
                    await loadInvitationDetails(user.uid);
                    await loadTransactionHistory(user.uid);
                    await loadProfitHistory(user.uid);
                    await loadPopularPlans();
                    await loadPendingWithdrawals(user.uid);

                    // Set up logout functionality
                    setupLogout();

                } catch (error) {
                    console.error("Error loading data:", error);
                    alert('Error loading data');
                }
            });
        })
        .catch((error) => {
            console.error("Error setting persistence:", error);
        });

    async function setupBuyButtons(userId) {
        const buyButtons = document.querySelectorAll('.buy-button');
        
        buyButtons.forEach(button => {
            button.addEventListener('click', async function() {
                try {
                    const planCard = this.closest('.plan-card');
                    const productName = planCard.querySelector('h3').textContent;
                    const priceText = planCard.querySelector('.price').textContent;
                    const price = parseFloat(priceText.replace('$', '').replace(',', '').trim());
                    const durationText = planCard.querySelector('.details span:first-child').textContent;
                    const duration = parseInt(durationText);
                    const totalReturnText = planCard.querySelector('.details span:last-child').textContent;
                    const totalReturn = parseFloat(totalReturnText.replace('Total', '').replace(',', '').trim());

                    // Get user's current balance
                    const balanceDoc = await db.collection('user_balances').doc(userId).get();
                    const currentBalance = balanceDoc.exists ? balanceDoc.data().balance : 0;

                    if (currentBalance < price) {
                        alert('Insufficient balance. Please recharge your wallet.');
                        return;
                    }

                    // Confirm purchase
                    if (!confirm(`Are you sure you want to buy ${productName} for $${price}?`)) {
                        return;
                    }

                    // Process the purchase using a transaction
                    await db.runTransaction(async (transaction) => {
                        // Update user balance
                        const newBalance = currentBalance - price;
                        transaction.update(db.collection('user_balances').doc(userId), {
                            balance: newBalance
                        });

                        // Calculate daily return
                        const dailyReturn = totalReturn / duration;
                        const startDate = new Date();
                        const endDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));

                        // Create investment record
                        const investmentRef = db.collection('investments').doc();
                        transaction.set(investmentRef, {
                            userId: userId,
                            productName: productName,
                            amount: price,
                            duration: duration,
                            dailyReturn: dailyReturn,
                            totalReturn: totalReturn,
                            startDate: firebase.firestore.FieldValue.serverTimestamp(),
                            endDate: endDate,
                            status: 'active',
                            lastProfitDate: null,
                            totalProfitPaid: 0
                        });

                        // Create first profit schedule
                        const nextProfitDate = new Date(startDate);
                        nextProfitDate.setDate(nextProfitDate.getDate() + 1);
                        nextProfitDate.setHours(0, 0, 0, 0);

                        transaction.set(db.collection('profit_schedule').doc(), {
                            userId: userId,
                            investmentId: investmentRef.id,
                            productName: productName,
                            amount: dailyReturn,
                            scheduleDate: nextProfitDate,
                            status: 'pending'
                        });

                        // Add transaction record
                        transaction.set(db.collection('transactions').doc(), {
                            userId: userId,
                            type: 'investment',
                            amount: price,
                            description: `Purchased ${productName}`,
                            date: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });

                    alert('Purchase successful! Your investment has been activated.');
                    location.reload(); // Refresh to update displayed data

                } catch (error) {
                    console.error('Error processing purchase:', error);
                    alert('Failed to process purchase. Please try again.');
                }
            });
        });
    }

    async function loadUserData(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            
            // Set default values if document doesn't exist
            const userData = userDoc.exists ? userDoc.data() : {
                phone: 'Not Set',
                uniqueUserId: 'Not Set',
                vipLevel: 0
            };

            // Update user info
            const phoneElement = document.querySelector('.user-phone');
            if (phoneElement) phoneElement.textContent = userData.phone;

            const userIdElement = document.querySelector('.user-id');
            if (userIdElement) userIdElement.textContent = userData.uniqueUserId;
            
            // Update VIP level if exists
            const vipBadge = document.querySelector('.vip-badge');
            if (vipBadge && userData.vipLevel) {
                vipBadge.textContent = `VIP${userData.vipLevel}`;
            }

        } catch (error) {
            console.error("Error in loadUserData:", error);
            throw error;
        }
    }

    async function loadUserBalance(userId) {
        try {
            const balanceDoc = await db.collection('user_balances').doc(userId).get();
            const balanceElement = document.querySelector('.balance-amount');
            
            if (balanceDoc.exists) {
                const balanceData = balanceDoc.data();
                const balance = balanceData.balance || 0;
                if (balanceElement) {
                    balanceElement.textContent = `$ ${balance.toFixed(2)}`;
                }
            } else {
                // If no balance document exists, create one with 0 balance
                await db.collection('user_balances').doc(userId).set({
                    balance: 0,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (balanceElement) {
                    balanceElement.textContent = '$ 0.00';
                }
            }
        } catch (error) {
            console.error("Error loading user balance:", error);
            const balanceElement = document.querySelector('.balance-amount');
            if (balanceElement) {
                balanceElement.textContent = '$ 0.00';
            }
        }
    }

    async function loadInvitationDetails(userId) {
        try {
            // Get user's referrals
            const referralsSnapshot = await db.collection('referrals')
                .where('referrerId', '==', userId)
                .get();

            // Initialize counters
            let totalInvites = referralsSnapshot.size;
            let activeInvites = 0;
            let totalCommission = 0;

            // Calculate totals from existing referrals
            referralsSnapshot.forEach(doc => {
                const referral = doc.data();
                if (referral.status === 'active') activeInvites++;
                if (referral.commission) totalCommission += referral.commission;
            });

            // Update invitation displays
            const totalInvitesElement = document.querySelector('.total-invites');
            if (totalInvitesElement) totalInvitesElement.textContent = totalInvites;

            const activeInvitesElement = document.querySelector('.active-invites');
            if (activeInvitesElement) activeInvitesElement.textContent = activeInvites;

            const totalCommissionElement = document.querySelector('.total-commission');
            if (totalCommissionElement) {
                totalCommissionElement.textContent = totalCommission.toFixed(2);
            }

        } catch (error) {
            console.error("Error in loadInvitationDetails:", error);
            throw error;
        }
    }

    async function loadTransactionHistory(userId) {
        try {
            // First try the indexed query
            try {
                const transactionsSnapshot = await db.collection('transactions')
                    .where('userId', '==', userId)
                    .orderBy('date', 'desc')
                    .limit(10)
                    .get();

                displayTransactions(transactionsSnapshot);
            } catch (indexError) {
                console.log('Index not ready, falling back to simple query');
                // Fallback to simple query without ordering
                const transactionsSnapshot = await db.collection('transactions')
                    .where('userId', '==', userId)
                    .limit(50)
                    .get();

                // Sort in memory
                const transactions = [];
                transactionsSnapshot.forEach(doc => {
                    transactions.push({ id: doc.id, ...doc.data() });
                });

                transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
                
                // Create a fake snapshot-like object
                const fakeSnapshot = {
                    empty: transactions.length === 0,
                    forEach: (callback) => transactions.slice(0, 10).forEach(t => callback({ data: () => t }))
                };

                displayTransactions(fakeSnapshot);
            }
        } catch (error) {
            console.error("Error in loadTransactionHistory:", error);
            const transactionsList = document.querySelector('.transaction-history');
            if (transactionsList) {
                transactionsList.innerHTML = '<div class="error-message">Failed to load transactions. Please try again later.</div>';
            }
        }
    }

    function displayTransactions(snapshot) {
        const transactionsList = document.querySelector('.transaction-history');
        if (!transactionsList) return;

        transactionsList.innerHTML = ''; // Clear existing transactions

        if (snapshot.empty) {
            transactionsList.innerHTML = '<div class="no-transactions">No transactions yet</div>';
            return;
        }

        snapshot.forEach(doc => {
            const transaction = doc.data();
            const transactionElement = createTransactionElement(transaction);
            transactionsList.appendChild(transactionElement);
        });
    }

    function createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        
        const date = transaction.date.toDate();
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        div.innerHTML = `
            <div class="transaction-type ${transaction.type}">${transaction.type}</div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-date">${formattedDate}</div>
            </div>
            <div class="transaction-amount ${transaction.type === 'profit' ? 'positive' : ''}">${transaction.type === 'profit' ? '+' : ''} $${transaction.amount.toFixed(2)}</div>
        `;
        return div;
    }

    async function loadProfitHistory(userId) {
        try {
            // First try the indexed query
            try {
                const profitsSnapshot = await db.collection('profit_schedule')
                    .where('userId', '==', userId)
                    .where('status', '==', 'completed')
                    .orderBy('scheduleDate', 'desc')
                    .limit(10)
                    .get();

                displayProfits(profitsSnapshot);
            } catch (indexError) {
                console.log('Index not ready, falling back to simple query');
                // Fallback to simple query without complex filtering
                const profitsSnapshot = await db.collection('profit_schedule')
                    .where('userId', '==', userId)
                    .limit(50)
                    .get();

                // Filter and sort in memory
                const profits = [];
                profitsSnapshot.forEach(doc => {
                    const profit = doc.data();
                    if (profit.status === 'completed') {
                        profits.push({ id: doc.id, ...profit });
                    }
                });

                profits.sort((a, b) => b.scheduleDate.toMillis() - a.scheduleDate.toMillis());

                // Create a fake snapshot-like object
                const fakeSnapshot = {
                    empty: profits.length === 0,
                    forEach: (callback) => profits.slice(0, 10).forEach(p => callback({ data: () => p }))
                };

                displayProfits(fakeSnapshot);
            }
        } catch (error) {
            console.error("Error in loadProfitHistory:", error);
            const profitsList = document.querySelector('.profit-history');
            if (profitsList) {
                profitsList.innerHTML = '<div class="error-message">Failed to load profit history. Please try again later.</div>';
            }
        }
    }

    function displayProfits(snapshot) {
        const profitsList = document.querySelector('.profit-history');
        if (!profitsList) return;

        profitsList.innerHTML = ''; // Clear existing profits

        if (snapshot.empty) {
            profitsList.innerHTML = '<div class="no-profits">No profit history yet</div>';
            return;
        }

        snapshot.forEach(doc => {
            const profit = doc.data();
            const profitElement = createProfitElement(profit);
            profitsList.appendChild(profitElement);
        });
    }

    function createProfitElement(profit) {
        const div = document.createElement('div');
        div.className = 'profit-item';
        
        const date = profit.scheduleDate.toDate();
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        div.innerHTML = `
            <div class="profit-details">
                <div class="profit-product">${profit.productName}</div>
                <div class="profit-date">${formattedDate}</div>
            </div>
            <div class="profit-amount">+$${profit.amount.toFixed(2)}</div>
        `;
        return div;
    }

    function setupLogout() {
        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error("Error signing out:", error);
                    alert('Error signing out');
                }
            });
        }
    }

    // Banner rotation functionality
    function initializeBanner() {
        const banners = document.querySelectorAll('.banner');
        const dots = document.querySelectorAll('.dot');
        
        if (!banners.length || !dots.length) return;
        
        let currentSlide = 0;
        const totalSlides = banners.length;

        function showSlide(index) {
            // Remove active class from current banner and dot
            banners[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            
            // Update current slide index
            currentSlide = (index + totalSlides) % totalSlides;
            
            // Add active class to new banner and dot
            banners[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }

        // Add click handlers to dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => showSlide(index));
        });

        // Start automatic rotation
        setInterval(() => showSlide(currentSlide + 1), 3000);
    }

    // Initialize banner when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeBanner);

    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // VIP button handling - with null check
    const vipButton = document.querySelector('.vip-button');
    if (vipButton) {
        vipButton.addEventListener('click', function() {
            alert('VIP feature coming soon!');
        });
    }

    // Notification handling - with null check
    const notification = document.querySelector('.notification');
    if (notification) {
        notification.addEventListener('click', function() {
            alert('Notifications center coming soon!');
        });
    }

    // Refresh data periodically (every 5 minutes)
    setInterval(() => {
        const user = auth.currentUser;
        if (user) {
            loadUserBalance(user.uid);
            loadTransactionHistory(user.uid);
            loadProfitHistory(user.uid);
        }
    }, 300000); // 5 minutes

    // Handle transaction history click
    document.querySelector('[data-action="transaction-history"]').addEventListener('click', () => {
        window.location.href = 'transaction-record.html';
    });

    async function loadPopularPlans() {
        try {
            const plansContainer = document.querySelector('.plans-container');
            if (!plansContainer) return;

            // Get popular plans (limit to 3)
            const plansSnapshot = await db.collection('products')
                .where('status', '==', 'active')
                .limit(3)
                .get();

            plansContainer.innerHTML = ''; // Clear existing plans

            if (plansSnapshot.empty) {
                plansContainer.innerHTML = '<div class="no-plans">No plans available</div>';
                return;
            }

            plansSnapshot.forEach(doc => {
                const plan = doc.data();
                const planCard = createPlanCard(plan, doc.id);
                plansContainer.appendChild(planCard);
            });

            // Set up buy buttons for the loaded plans
            await setupBuyButtons(auth.currentUser.uid);

        } catch (error) {
            console.error("Error loading popular plans:", error);
            const plansContainer = document.querySelector('.plans-container');
            if (plansContainer) {
                plansContainer.innerHTML = '<div class="error-message">Failed to load plans. Please try again later.</div>';
            }
        }
    }

    function createPlanCard(plan, planId) {
        const card = document.createElement('div');
        card.className = 'plan-card';
        
        // Ensure all required fields have default values
        const planData = {
            name: plan.name || 'Unnamed Plan',
            price: plan.price || 0,
            dailyReturn: plan.dailyReturn || 0,
            totalReturn: plan.totalReturn || 0,
            duration: plan.duration || 0,
            image: plan.image || 'placeholder-product.jpg'
        };

        card.innerHTML = `
            <div class="plan-image">
                <img src="${planData.image}" alt="${planData.name}" onerror="this.src='placeholder-product.jpg'">
            </div>
            <div class="plan-content">
                <div class="plan-header">
                    <h3>${planData.name}</h3>
                    <div class="price">$${planData.price.toFixed(2)}</div>
                </div>
                <div class="details">
                    <span>${planData.duration} days</span>
                    <span>Daily Return: ${planData.dailyReturn}%</span>
                    <span>Total Return: ${planData.totalReturn}%</span>
                </div>
                <button class="buy-button" data-plan-id="${planId}">Buy Now</button>
            </div>
        `;
        return card;
    }

    async function loadPendingWithdrawals(userId) {
        try {
            const pendingWithdrawalsList = document.querySelector('.pending-withdrawals');
            if (!pendingWithdrawalsList) return;

            // Get user's wallet information first
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const walletAddress = userData.walletAddress || 'N/A';
            const walletNetwork = userData.walletNetwork || 'N/A';

            // Get pending withdrawals
            const withdrawalsSnapshot = await db.collection('withdrawal_requests')
                .where('userId', '==', userId)
                .where('status', '==', 'pending')
                .orderBy('date', 'desc')
                .limit(5)
                .get();

            pendingWithdrawalsList.innerHTML = ''; // Clear existing withdrawals

            if (withdrawalsSnapshot.empty) {
                pendingWithdrawalsList.innerHTML = '<div class="no-withdrawals">No pending withdrawals</div>';
                return;
            }

            withdrawalsSnapshot.forEach(doc => {
                const withdrawal = doc.data();
                const withdrawalElement = createWithdrawalElement(withdrawal, walletAddress, walletNetwork);
                pendingWithdrawalsList.appendChild(withdrawalElement);
            });

        } catch (error) {
            console.error("Error loading pending withdrawals:", error);
            const pendingWithdrawalsList = document.querySelector('.pending-withdrawals');
            if (pendingWithdrawalsList) {
                pendingWithdrawalsList.innerHTML = '<div class="error-message">Failed to load pending withdrawals. Please try again later.</div>';
            }
        }
    }

    function createWithdrawalElement(withdrawal, walletAddress, walletNetwork) {
        const div = document.createElement('div');
        div.className = 'withdrawal-item';
        
        // Check if date is a Firestore Timestamp
        const date = withdrawal.date && withdrawal.date.toDate ? 
            withdrawal.date.toDate() : 
            new Date(withdrawal.date);
            
        // Format date with proper timezone handling
        const formattedDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC' // Use UTC to avoid timezone issues
        }).format(date);

        // Format wallet address to show only first and last 6 characters
        const formattedWalletAddress = walletAddress !== 'N/A' ? 
            `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}` : 
            'N/A';

        div.innerHTML = `
            <div class="withdrawal-info">
                <div class="withdrawal-header">
                    <span class="withdrawal-amount">$${withdrawal.amount.toFixed(2)}</span>
                    <span class="withdrawal-date">${formattedDate}</span>
                </div>
                <div class="withdrawal-details">
                    <div class="wallet-info">
                        <div class="wallet-address">
                            <span class="label">USDT Address:</span>
                            <span class="value">${formattedWalletAddress}</span>
                        </div>
                        <div class="wallet-network">
                            <span class="label">Network:</span>
                            <span class="value">${walletNetwork}</span>
                        </div>
                    </div>
                    <div class="withdrawal-status pending">Pending</div>
                </div>
            </div>
        `;
        return div;
    }
}); 
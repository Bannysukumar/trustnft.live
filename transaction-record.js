document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            await loadTransactionSummary(user.uid);
        } catch (error) {
            console.error("Error loading transaction data:", error);
            alert('Error loading transaction data');
        }
    });

    async function loadTransactionSummary(userId) {
        try {
            const transactionsList = document.querySelector('.transaction-list');
            transactionsList.innerHTML = ''; // Clear existing items

            // Get all transaction types summary
            const summaries = {
                'Recharge': await getTransactionTypeTotal(userId, 'recharge'),
                'Withdrawal': await getTransactionTypeTotal(userId, 'withdrawal'),
                'Profit': await getTransactionTypeTotal(userId, 'profit'),
                'Commission': await getTransactionTypeTotal(userId, 'commission'),
                'Market': await getTransactionTypeTotal(userId, 'market'),
                'Other Income': await getTransactionTypeTotal(userId, 'other')
            };

            // Create transaction items
            Object.entries(summaries).forEach(([type, amount]) => {
                const transactionItem = createTransactionItem(type, amount);
                transactionsList.appendChild(transactionItem);
            });

        } catch (error) {
            console.error("Error loading transaction summary:", error);
            throw error;
        }
    }

    async function getTransactionTypeTotal(userId, type) {
        try {
            const snapshot = await db.collection('transactions')
                .where('userId', '==', userId)
                .where('type', '==', type)
                .where('status', '==', 'completed')
                .get();

            let total = 0;
            snapshot.forEach(doc => {
                const transaction = doc.data();
                total += transaction.amount || 0;
            });

            return total;
        } catch (error) {
            console.error(`Error getting ${type} total:`, error);
            return 0;
        }
    }

    function createTransactionItem(type, amount) {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div class="transaction-type">${type}</div>
            <div class="transaction-amount">$${amount.toFixed(2)} ›</div>
        `;

        // Add click handler to show transaction details
        div.addEventListener('click', () => {
            showTransactionDetails(type.toLowerCase());
        });

        return div;
    }

    function showTransactionDetails(type) {
        // Store the transaction type in session storage
        sessionStorage.setItem('transactionType', type);
        
        // Navigate to transaction details page
        window.location.href = `transaction-details.html?type=${type}`;
    }

    // Back button handling
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Notification handling
    const notification = document.querySelector('.notification');
    notification.addEventListener('click', function() {
        window.location.href = 'message.html';
    });

    // Add click handlers for transaction items
    const transactionItems = document.querySelectorAll('.transaction-item');
    transactionItems.forEach(item => {
        item.addEventListener('click', () => {
            const type = item.querySelector('.transaction-type').textContent;
            switch (type) {
                case 'Recharge':
                    window.location.href = 'recharge-history.html';
                    break;
                case 'WithDrawal':
                    window.location.href = 'withdrawal-history.html';
                    break;
                case 'Profit':
                    window.location.href = 'profit-history.html';
                    break;
                case 'Commission':
                    window.location.href = 'commission-history.html';
                    break;
                case 'Market':
                    window.location.href = 'market-history.html';
                    break;
                case 'Other Income':
                    window.location.href = 'other-income-history.html';
                    break;
            }
        });
    });
}); 
document.addEventListener('DOMContentLoaded', function() {
    let currentUserId = null;

    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        currentUserId = user.uid;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const type = urlParams.get('type') || 'recharge';
            await loadTransactionDetails(user.uid, type);
            
            // Set active filter button
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                if (btn.dataset.type === type) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } catch (error) {
            console.error("Error loading transaction details:", error);
            showError();
        }
    });

    // Filter button click handlers
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!currentUserId) return;

            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const type = btn.dataset.type;
            try {
                await loadTransactionDetails(currentUserId, type);
                // Update URL without reloading the page
                const url = new URL(window.location);
                url.searchParams.set('type', type);
                window.history.pushState({}, '', url);
            } catch (error) {
                console.error("Error loading transaction details:", error);
                showError();
            }
        });
    });

    function showError() {
        const detailsList = document.querySelector('.transaction-details-list');
        detailsList.innerHTML = `
            <div class="error-message">
                <p>Failed to load transaction details.</p>
                <p>Please try again later.</p>
            </div>`;
    }

    async function loadTransactionDetails(userId, type) {
        try {
            const detailsList = document.querySelector('.transaction-details-list');
            detailsList.innerHTML = `
                <div class="loading-message">
                    <p>Loading transactions...</p>
                </div>`;

            let collection = type === 'recharge' ? 'recharge_requests' : 'withdrawal_requests';
            
            // First get all documents for the user
            const snapshot = await db.collection(collection)
                .where('userId', '==', userId)
                .get();

            if (snapshot.empty) {
                detailsList.innerHTML = `
                    <div class="empty-message">
                        <p>No ${type} transactions found.</p>
                    </div>`;
                return;
            }

            // Sort in memory
            const transactions = [];
            snapshot.forEach(doc => {
                const transaction = doc.data();
                transactions.push({
                    ...transaction,
                    createdAt: transaction.createdAt?.toDate() || new Date(0)
                });
            });

            // Sort by createdAt in descending order
            transactions.sort((a, b) => b.createdAt - a.createdAt);

            // Limit to 50 transactions
            const limitedTransactions = transactions.slice(0, 50);

            detailsList.innerHTML = ''; // Clear loading message
            limitedTransactions.forEach(transaction => {
                const detailItem = createDetailItem(transaction, type);
                detailsList.appendChild(detailItem);
            });

        } catch (error) {
            console.error("Error loading transaction details:", error);
            throw error;
        }
    }

    function createDetailItem(transaction, type) {
        const div = document.createElement('div');
        div.className = 'transaction-detail-item';
        
        // createdAt is already a Date object from loadTransactionDetails
        const date = transaction.createdAt instanceof Date ? transaction.createdAt : new Date();
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const amount = transaction.amount ? transaction.amount.toLocaleString() : '0';
        const status = transaction.status || 'pending';
        const description = transaction.description || `${type.charAt(0).toUpperCase() + type.slice(1)} Request`;
        const txHash = transaction.transactionHash ? 
            `<div class="detail-hash">TxHash: ${transaction.transactionHash}</div>` : '';
        const bankInfo = type === 'withdrawal' && transaction.bankAccount ? 
            `<div class="detail-bank">Bank: ${transaction.bankAccount}</div>` : '';

        div.innerHTML = `
            <div class="detail-header">
                <span class="detail-amount ${status === 'completed' ? 'success' : 'pending'}">
                    ${type === 'withdrawal' ? '-' : '+'}$${amount}
                </span>
                <span class="detail-status ${status}">${status}</span>
            </div>
            <div class="detail-info">
                <div class="detail-description">${description}</div>
                ${txHash}
                ${bankInfo}
                <div class="detail-date">${formattedDate}</div>
            </div>
        `;

        return div;
    }

    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });
}); 
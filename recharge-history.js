document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            await loadRechargeHistory(user.uid);
        } catch (error) {
            console.error("Error loading recharge history:", error);
            handleLoadError(error);
        }
    });

    // Back button handling
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    }
});

function handleLoadError(error) {
    const historyContainer = document.querySelector('.history-container');
    
    // Check if it's a missing index error
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
        historyContainer.innerHTML = `
            <div style="text-align: center; padding: 32px; color: var(--text-secondary);">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">warning</span>
                <p>System is being configured. Please try again in a few minutes.</p>
                <button onclick="location.reload()" class="retry-btn" style="margin-top: 16px; padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <span class="material-icons" style="vertical-align: middle; margin-right: 4px;">refresh</span>
                    Retry
                </button>
            </div>
        `;
    } else {
        historyContainer.innerHTML = `
            <div style="text-align: center; padding: 32px; color: var(--text-secondary);">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                <p>Error loading recharge history. Please try again.</p>
                <button onclick="location.reload()" class="retry-btn" style="margin-top: 16px; padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <span class="material-icons" style="vertical-align: middle; margin-right: 4px;">refresh</span>
                    Retry
                </button>
            </div>
        `;
    }
}

async function loadRechargeHistory(userId) {
    try {
        const db = firebase.firestore();
        const historyContainer = document.querySelector('.history-container');
        
        // Show loading state
        historyContainer.innerHTML = `
            <div style="text-align: center; padding: 32px; color: var(--text-secondary);">
                <div class="loading-spinner" style="margin-bottom: 16px;"></div>
                <p>Loading recharge history...</p>
            </div>
        `;

        // Try to get deposits with compound query first
        try {
            const depositsSnapshot = await db.collection('deposits')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();

            renderTransactions(depositsSnapshot, historyContainer);
        } catch (error) {
            // If compound query fails, fall back to simple query
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                const depositsSnapshot = await db.collection('deposits')
                    .where('userId', '==', userId)
                    .get();

                // Sort manually
                const docs = depositsSnapshot.docs.sort((a, b) => {
                    const timestampA = a.data().timestamp?.toDate() || new Date(0);
                    const timestampB = b.data().timestamp?.toDate() || new Date(0);
                    return timestampB - timestampA;
                });

                renderTransactions({ docs }, historyContainer);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error("Error loading recharge history:", error);
        throw error;
    }
}

function renderTransactions(snapshot, container) {
    if (!snapshot.docs.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px; color: var(--text-secondary);">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">history</span>
                <p>No recharge history found</p>
            </div>
        `;
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Add each transaction to the container
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate() || new Date();
        const formattedDate = formatDate(timestamp);
        const status = data.status || 'pending';

        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        transactionElement.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-type">Recharge</div>
                <div class="transaction-date">${formattedDate}</div>
                <div class="transaction-id">${doc.id}</div>
            </div>
            <div class="transaction-amount">$ ${data.amount.toLocaleString()}.00</div>
            <div class="transaction-status ${status.toLowerCase()}">
                <span class="material-icons">
                    ${getStatusIcon(status)}
                </span>
                ${capitalizeFirstLetter(status)}
            </div>
        `;

        container.appendChild(transactionElement);
    });
}

function formatDate(date) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
}

function getStatusIcon(status) {
    switch (status.toLowerCase()) {
        case 'success':
            return 'check_circle';
        case 'failed':
            return 'cancel';
        case 'pending':
        default:
            return 'schedule';
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
} 
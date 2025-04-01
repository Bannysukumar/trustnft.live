document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // If not logged in, redirect to login page
            window.location.href = 'index.html';
            return;
        }

        try {
            // Load all profit data
            await loadProfitData(user.uid);
            // Load active products
            await loadActiveProducts(user.uid);
        } catch (error) {
            console.error("Error loading data:", error);
            alert('Error loading data');
        }
    });

    async function loadProfitData(userId) {
        try {
            // Get user's profit document
            const profitDoc = await db.collection('user_profits').doc(userId).get();
            
            if (profitDoc.exists) {
                const profitData = profitDoc.data();
                updateProfitSummary(profitData);
            }

            // Load profit history
            await loadProfitHistory(userId);

        } catch (error) {
            console.error("Error loading profit data:", error);
            throw error;
        }
    }

    function updateProfitSummary(profitData) {
        // Update total profit
        document.querySelector('.total-amount').textContent = 
            profitData.totalProfit.toFixed(2);

        // Update today's profit
        document.querySelector('.today-profit').textContent = 
            profitData.todayProfit.toFixed(2);

        // Update yesterday's profit
        document.querySelector('.yesterday-profit').textContent = 
            profitData.yesterdayProfit.toFixed(2);

        // Update this month's profit
        document.querySelector('.month-profit').textContent = 
            profitData.monthProfit.toFixed(2);
    }

    async function loadProfitHistory(userId) {
        try {
            // First try the indexed query
            try {
                const historySnapshot = await db.collection('profit_history')
                    .where('userId', '==', userId)
                    .orderBy('date', 'desc')
                    .limit(30)
                    .get();

                displayProfitHistory(historySnapshot);
            } catch (indexError) {
                console.log('Index not ready, falling back to simple query');
                // Fallback to simple query without ordering
                const historySnapshot = await db.collection('profit_history')
                    .where('userId', '==', userId)
                    .limit(50)
                    .get();

                // Sort in memory
                const profits = [];
                historySnapshot.forEach(doc => {
                    profits.push({ id: doc.id, ...doc.data() });
                });

                profits.sort((a, b) => b.date.toMillis() - a.date.toMillis());
                
                // Create a fake snapshot-like object
                const fakeSnapshot = {
                    empty: profits.length === 0,
                    forEach: (callback) => profits.slice(0, 30).forEach(p => callback({ data: () => p }))
                };

                displayProfitHistory(fakeSnapshot);
            }
        } catch (error) {
            console.error("Error loading profit history:", error);
            const historyList = document.getElementById('profitList');
            if (historyList) {
                historyList.innerHTML = '<div class="error-message">Failed to load profit history. Please try again later.</div>';
            }
        }
    }

    function displayProfitHistory(snapshot) {
        const historyList = document.getElementById('profitList');
        if (!historyList) return;
        
        historyList.innerHTML = ''; // Clear existing content

        if (snapshot.empty) {
            historyList.innerHTML = '<div class="no-history">No profit history yet</div>';
            return;
        }

        snapshot.forEach(doc => {
            const historyData = doc.data();
            const historyElement = createHistoryElement(historyData);
            historyList.appendChild(historyElement);
        });
    }

    function createHistoryElement(historyData) {
        const template = document.getElementById('profitItemTemplate');
        if (!template) {
            // Fallback if template is not available
            const div = document.createElement('div');
            div.className = 'profit-item';
            div.innerHTML = `
                <div class="profit-info">
                    <div class="profit-header">
                        <span class="profit-title">${historyData.deviceName || 'Unknown Device'}</span>
                        <span class="profit-date">${formatDate(historyData.date)}</span>
                    </div>
                    <div class="profit-details">
                        <span class="profit-amount">$${historyData.amount.toFixed(2)}</span>
                        <span class="profit-status">${historyData.status || 'completed'}</span>
                    </div>
                </div>
            `;
            return div;
        }

        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.profit-item');
        
        item.querySelector('.profit-title').textContent = historyData.deviceName || 'Unknown Device';
        item.querySelector('.profit-date').textContent = formatDate(historyData.date);
        item.querySelector('.profit-amount').textContent = `$${historyData.amount.toFixed(2)}`;
        item.querySelector('.profit-status').textContent = historyData.status || 'completed';
        
        return item;
    }

    function formatDate(timestamp) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

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

    async function loadActiveProducts(userId) {
        try {
            console.log('Loading active products for user:', userId);
            const activeProductsSnapshot = await db.collection('investments')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .get();

            console.log('Found active products:', activeProductsSnapshot.size);
            displayActiveProducts(activeProductsSnapshot);
        } catch (error) {
            console.error("Error loading active products:", error);
            const activeProductsList = document.getElementById('activeProducts');
            if (activeProductsList) {
                activeProductsList.innerHTML = '<div class="error-message">Failed to load active products. Please try again later.</div>';
            }
        }
    }

    function displayActiveProducts(snapshot) {
        const activeProductsList = document.getElementById('activeProducts');
        if (!activeProductsList) {
            console.error('Active products list element not found');
            return;
        }
        
        activeProductsList.innerHTML = ''; // Clear existing content

        if (snapshot.empty) {
            activeProductsList.innerHTML = '<div class="no-products">No active products</div>';
            return;
        }

        snapshot.forEach(doc => {
            const productData = doc.data();
            console.log('Processing product:', productData);
            const productElement = createActiveProductElement(productData);
            activeProductsList.appendChild(productElement);
        });
    }

    function createActiveProductElement(productData) {
        const div = document.createElement('div');
        div.className = 'active-product-item';
        div.innerHTML = `
            <div class="product-info">
                <div class="product-header">
                    <span class="product-name">${productData.productName || 'Unknown Product'}</span>
                    <span class="product-category">${productData.category || 'NORMAL'}</span>
                </div>
                <div class="product-details">
                    <div class="product-investment">
                        <span class="label">Investment:</span>
                        <span class="value">$${productData.amount.toFixed(2)}</span>
                    </div>
                    <div class="product-returns">
                        <span class="label">Daily Return:</span>
                        <span class="value">${productData.dailyReturn}%</span>
                    </div>
                    <div class="product-progress">
                        <span class="label">Total Return:</span>
                        <span class="value">${productData.totalReturn}%</span>
                    </div>
                </div>
                <div class="product-status">
                    <span class="status-badge active">Active</span>
                </div>
            </div>
        `;
        return div;
    }
}); 
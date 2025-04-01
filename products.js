document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const productsGrid = document.querySelector('.products-grid');
    const categoryTabs = document.querySelectorAll('.category-tab');
    const backButton = document.querySelector('.back-button');

    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Load initial products
        await loadProducts('Products');

        // Add click event listeners to category tabs
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                // Remove active class from all tabs
                categoryTabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                // Load products for selected category
                await loadProducts(tab.textContent);
            });
        });

        // Back button functionality
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    });

    async function loadProducts(category) {
        try {
            productsGrid.innerHTML = '<div class="loading">Loading products...</div>';
            
            let query = db.collection('products').where('status', '==', 'active');
            
            // Map display names to category values
            const categoryMap = {
                'Products': null, // Show all products
                'Treasure Hunt': 'treasure_hunt',
                'NORMAL': 'normal',
                'SHORT CYCLE': 'short_cycle',
                'VIP': 'vip'
            };

            // Apply category filter if specific category is selected
            if (categoryMap[category] !== null) {
                query = query.where('category', '==', categoryMap[category]);
            }

            const snapshot = await query.get();
            
            if (snapshot.empty) {
                productsGrid.innerHTML = '<div class="no-products">No products found in this category</div>';
                return;
            }

            productsGrid.innerHTML = '';
            
            // Sort products by price for VIP category
            let products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });

            if (category === 'VIP') {
                products.sort((a, b) => b.price - a.price);
            }

            // Create product cards
            products.forEach(product => {
                const card = createProductCard(product, product.id);
                productsGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading products:', error);
            productsGrid.innerHTML = '<div class="error">Error loading products</div>';
        }
    }

    function createProductCard(product, productId) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Add category-specific class
        if (product.category) {
            card.classList.add(`category-${product.category}`);
        }
        
        // Ensure all required fields have default values
        const productData = {
            name: product.name || 'Unnamed Product',
            price: product.price || 0,
            dailyReturn: product.dailyReturn || 0,
            totalReturn: product.totalReturn || 0,
            duration: product.duration || 0,
            image: product.image || 'placeholder-product.jpg',
            category: product.category || 'uncategorized'
        };

        card.innerHTML = `
            <div class="product-image">
                <img src="${productData.image}" alt="${productData.name}" onerror="this.src='placeholder-product.jpg'">
                ${productData.category === 'vip' ? '<div class="vip-badge">VIP</div>' : ''}
            </div>
            <div class="product-info">
                <h3>${productData.name}</h3>
                <div class="product-category">${productData.category.replace('_', ' ').toUpperCase()}</div>
                <div class="product-price">$${productData.price.toLocaleString()}</div>
                <div class="product-details">
                    <div>
                        <span>Daily Return:</span>
                        <span>${productData.dailyReturn}%</span>
                    </div>
                    <div>
                        <span>Total Return:</span>
                        <span>${productData.totalReturn}%</span>
                    </div>
                    <div>
                        <span>Duration:</span>
                        <span>${productData.duration} days</span>
                    </div>
                </div>
                <button class="buy-button" onclick="purchaseProduct('${productId}')">Buy Now</button>
            </div>
        `;
        return card;
    }

    // Make purchaseProduct function globally available
    window.purchaseProduct = async function(productId) {
        try {
            const user = auth.currentUser;
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                alert('Product not found');
                return;
            }

            const product = productDoc.data();
            const userBalanceDoc = await db.collection('user_balances').doc(user.uid).get();
            const userBalance = userBalanceDoc.exists ? userBalanceDoc.data().balance : 0;

            if (userBalance < product.price) {
                alert('Insufficient balance. Please recharge your account.');
                window.location.href = 'recharge.html';
                return;
            }

            // Get user's referral information
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            const uplinerId = userData.referredBy;

            // Calculate commission based on product price and referral commission rate
            const commissionRate = product.referralCommission || 0.05; // Default 5% if not specified
            const commissionAmount = product.price * commissionRate;

            // Start transaction
            await db.runTransaction(async (transaction) => {
                // Update user balance
                const balanceRef = db.collection('user_balances').doc(user.uid);
                transaction.set(balanceRef, {
                    balance: userBalance - product.price
                }, { merge: true });

                // Create investment record
                const investmentRef = db.collection('investments').doc();
                transaction.set(investmentRef, {
                    userId: user.uid,
                    productId: productId,
                    productName: product.name,
                    amount: product.price,
                    dailyReturn: product.dailyReturn,
                    totalReturn: product.totalReturn,
                    startDate: firebase.firestore.FieldValue.serverTimestamp(),
                    lastReturnDate: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                });

                // Add transaction record for the purchase
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    userId: user.uid,
                    type: 'investment',
                    amount: product.price,
                    status: 'completed',
                    description: `Purchased ${product.name}`,
                    date: firebase.firestore.FieldValue.serverTimestamp()
                });

                // If user has an upliner, transfer commission
                if (uplinerId) {
                    // Get upliner's current balance
                    const uplinerBalanceDoc = await transaction.get(db.collection('user_balances').doc(uplinerId));
                    const uplinerBalance = uplinerBalanceDoc.exists ? uplinerBalanceDoc.data().balance : 0;

                    // Update upliner's balance with commission
                    const uplinerBalanceRef = db.collection('user_balances').doc(uplinerId);
                    transaction.set(uplinerBalanceRef, {
                        balance: uplinerBalance + commissionAmount
                    }, { merge: true });

                    // Add commission transaction record for upliner
                    const commissionTransactionRef = db.collection('transactions').doc();
                    transaction.set(commissionTransactionRef, {
                        userId: uplinerId,
                        type: 'commission',
                        amount: commissionAmount,
                        status: 'completed',
                        description: `Commission from ${userData.username || user.uid}'s purchase of ${product.name}`,
                        date: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            alert('Product purchased successfully!');
            loadProducts(document.querySelector('.category-tab.active').textContent);
        } catch (error) {
            console.error('Error purchasing product:', error);
            alert('Failed to purchase product: ' + error.message);
        }
    };
}); 
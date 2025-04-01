document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            // Get product ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            
            if (!productId) {
                alert('Product not found');
                window.history.back();
                return;
            }

            await Promise.all([
                loadProductDetails(productId),
                loadUserBalance(user.uid)
            ]);
        } catch (error) {
            console.error("Error loading data:", error);
            alert('Error loading data');
        }
    });

    async function loadProductDetails(productId) {
        try {
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                alert('Product not found');
                window.history.back();
                return;
            }

            const product = productDoc.data();
            updateProductDisplay(product);
        } catch (error) {
            console.error("Error loading product:", error);
            throw error;
        }
    }

    async function loadUserBalance(userId) {
        try {
            const balanceDoc = await db.collection('user_balances').doc(userId).get();
            if (balanceDoc.exists) {
                const balanceData = balanceDoc.data();
                document.querySelector('.available-balance').textContent = 
                    (balanceData.balance || 0).toFixed(2);
            }
        } catch (error) {
            console.error("Error loading balance:", error);
            throw error;
        }
    }

    function updateProductDisplay(product) {
        document.getElementById('product-image').src = product.image;
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = product.price.toFixed(2);
        document.getElementById('product-duration').textContent = product.duration;
        document.getElementById('product-return').textContent = product.totalReturn.toFixed(2);
        
        // Update investment terms
        document.getElementById('investment-period').textContent = `${product.duration} days`;
        const dailyReturn = product.totalReturn / product.duration;
        document.getElementById('daily-return').textContent = `$${dailyReturn.toFixed(2)}`;
        document.getElementById('total-return').textContent = `$${product.totalReturn.toFixed(2)}`;
    }

    // Purchase confirmation
    const confirmButton = document.querySelector('.confirm-btn');
    confirmButton.addEventListener('click', async () => {
        try {
            const user = auth.currentUser;
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            
            // Get product and balance data
            const productDoc = await db.collection('products').doc(productId).get();
            const balanceDoc = await db.collection('user_balances').doc(user.uid).get();
            
            const product = productDoc.data();
            const balance = balanceDoc.data().balance || 0;

            // Check if user has enough balance
            if (balance < product.price) {
                alert('Insufficient balance. Please recharge.');
                return;
            }

            // Create purchase record and set up daily returns
            await db.runTransaction(async (transaction) => {
                // Update user balance
                const newBalance = balance - product.price;
                transaction.update(db.collection('user_balances').doc(user.uid), {
                    balance: newBalance
                });

                // Calculate daily return
                const dailyReturn = product.totalReturn / product.duration;
                const startDate = new Date();
                const endDate = new Date(startDate.getTime() + (product.duration * 24 * 60 * 60 * 1000));

                // Create investment record
                const investmentRef = db.collection('investments').doc();
                transaction.set(investmentRef, {
                    userId: user.uid,
                    productId: productId,
                    productName: product.name,
                    amount: product.price,
                    duration: product.duration,
                    dailyReturn: dailyReturn,
                    totalReturn: product.totalReturn,
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
                    userId: user.uid,
                    investmentId: investmentRef.id,
                    productName: product.name,
                    amount: dailyReturn,
                    scheduleDate: nextProfitDate,
                    status: 'pending'
                });
            });

            alert('Purchase successful! You will start receiving daily returns from tomorrow.');
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error("Purchase error:", error);
            alert('Error processing purchase');
        }
    });

    // Terms agreement handling
    const termsCheckbox = document.getElementById('terms-agreement');
    termsCheckbox.addEventListener('change', function() {
        confirmButton.disabled = !this.checked;
    });

    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', () => {
        window.history.back();
    });
}); 
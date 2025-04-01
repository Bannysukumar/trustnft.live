document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Check authentication and admin status
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }

        try {
            const adminDoc = await db.collection('admins').doc(user.uid).get();
            if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
                auth.signOut();
                window.location.href = 'admin-login.html';
                return;
            }

            // Load dashboard data
            loadDashboardStats();
            loadWithdrawals();
            loadUsers();
            loadProducts();
            loadDeposits();
            loadBanners();
            loadPaymentMethods();
            loadAdmins();
            loadRechargeAmounts();
        } catch (error) {
            console.error('Error checking admin status:', error);
            window.location.href = 'admin-login.html';
        }
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });

    // Logout handling
    document.getElementById('logoutButton').addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });

    // Load dashboard statistics
    async function loadDashboardStats() {
        try {
            const [users, withdrawals, investments, products, deposits] = await Promise.all([
                db.collection('users').get(),
                db.collection('withdrawals').where('status', '==', 'pending').get(),
                db.collection('investments').where('status', '==', 'active').get(),
                db.collection('products').get(),
                db.collection('deposits').where('status', '==', 'pending').get()
            ]);

            document.getElementById('totalUsers').textContent = users.size;
            document.getElementById('pendingWithdrawals').textContent = withdrawals.size + (deposits.size ? ` (+${deposits.size} deposits)` : '');
            document.getElementById('activeInvestments').textContent = investments.size;
            document.getElementById('totalProducts').textContent = products.size;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    // Load withdrawals
    async function loadWithdrawals() {
        try {
            const withdrawalsRef = firebase.firestore().collection('withdrawals');
            // First get all pending withdrawals without ordering
            const withdrawalsSnapshot = await withdrawalsRef
                .where('status', '==', 'pending')
                .get();
            
            const withdrawalsList = document.getElementById('withdrawalsList');
            withdrawalsList.innerHTML = '';
            
            if (withdrawalsSnapshot.empty) {
                withdrawalsList.innerHTML = '<div class="list-item">No pending withdrawals found</div>';
                return;
            }
            
            // Convert to array and sort in memory
            const withdrawals = [];
            for (const doc of withdrawalsSnapshot.docs) {
                withdrawals.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            // Sort by createdAt in memory
            withdrawals.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                return timeB - timeA; // descending order
            });
            
            // Display sorted withdrawals
            withdrawals.forEach(withdrawal => {
                const withdrawalElement = document.createElement('div');
                withdrawalElement.className = 'withdrawal-item';
                withdrawalElement.innerHTML = `
                    <div class="withdrawal-info">
                        <span class="withdrawal-amount">$${withdrawal.amount.toFixed(2)}</span>
                        <span class="withdrawal-method">${withdrawal.paymentMethod}</span>
                        <span class="withdrawal-address">${withdrawal.walletAddress}</span>
                        <span class="withdrawal-date">${withdrawal.createdAt?.toDate().toLocaleString()}</span>
                    </div>
                    <div class="withdrawal-actions">
                        <button onclick="updateWithdrawalStatus('${withdrawal.id}', 'approved')" class="approve-btn">Approve</button>
                        <button onclick="updateWithdrawalStatus('${withdrawal.id}', 'rejected')" class="reject-btn">Reject</button>
                    </div>
                `;
                withdrawalsList.appendChild(withdrawalElement);
            });
        } catch (error) {
            console.error('Error loading withdrawals:', error);
            const withdrawalsList = document.getElementById('withdrawalsList');
            withdrawalsList.innerHTML = '<div class="list-item error">Error loading withdrawals: ' + error.message + '</div>';
        }
    }

    // Load users with search functionality
    async function loadUsers() {
        try {
            const usersList = document.getElementById('usersList');
            const searchInput = document.getElementById('userSearch');
            usersList.innerHTML = '<div class="list-item">Loading users...</div>';

            // Get all users from Firestore
            const snapshot = await db.collection('users').get();
            
            // Store users data in memory for search
            const users = [];
            snapshot.forEach(doc => {
                const userData = doc.data();
                users.push({
                    id: doc.id,
                    phone: userData.phone || '',
                    status: userData.status || 'active',
                    createdAt: userData.createdAt || userData.registrationDate || null,
                    referralCode: userData.referralCode || '',
                    balance: userData.balance || 0
                });
            });

            function renderUsers(filteredUsers) {
                usersList.innerHTML = '';
                
                if (filteredUsers.length === 0) {
                    usersList.innerHTML = '<div class="list-item">No users found</div>';
                    return;
                }

                filteredUsers.forEach(user => {
                    const joinedDate = user.createdAt ? formatDate(user.createdAt) : 'N/A';
                    const div = document.createElement('div');
                    div.className = 'list-item';
                    div.innerHTML = `
                        <div>
                            <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
                            <div><strong>User ID:</strong> ${user.id}</div>
                            <div><strong>Referral Code:</strong> ${user.referralCode || 'N/A'}</div>
                            <div><strong>Status:</strong> <span class="status-badge status-${user.status}">${user.status}</span></div>
                            <div><strong>Joined:</strong> ${joinedDate}</div>
                            <div><strong>Balance:</strong> $${user.balance?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div class="action-buttons">
                            <button class="action-button approve-button" onclick="editUser('${user.id}')">Edit</button>
                            <button class="action-button approve-button" onclick="viewUserDetails('${user.id}')">View Details</button>
                            ${user.status !== 'blocked' ? 
                                `<button class="action-button reject-button" onclick="blockUser('${user.id}')">Block</button>` :
                                `<button class="action-button approve-button" onclick="unblockUser('${user.id}')">Unblock</button>`
                            }
                        </div>
                    `;
                    usersList.appendChild(div);
                });
            }

            // Initial render of all users
            renderUsers(users);

            // Search functionality
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                
                // If search term is empty, show all users
                if (!searchTerm) {
                    renderUsers(users);
                    return;
                }

                // Filter users based on search term
                const filteredUsers = users.filter(user => 
                    (user.phone && user.phone.toLowerCase().includes(searchTerm)) ||
                    user.id.toLowerCase().includes(searchTerm) ||
                    (user.referralCode && user.referralCode.toLowerCase().includes(searchTerm))
                );
                renderUsers(filteredUsers);
            });

        } catch (error) {
            console.error('Error loading users:', error);
            usersList.innerHTML = '<div class="list-item">Error loading users: ' + error.message + '</div>';
        }
    }

    // View user details
    window.viewUserDetails = async function(userId) {
        try {
            const modal = document.getElementById('userDetailsModal');
            const closeBtn = document.querySelector('.close-modal');
            const userBasicInfo = document.getElementById('userBasicInfo');
            const userFinancialInfo = document.getElementById('userFinancialInfo');
            const userInvestments = document.getElementById('userInvestments');
            const userTransactions = document.getElementById('userTransactions');

            // Get user data
            const [userDoc, balanceDoc, investmentsSnapshot, transactionsSnapshot] = await Promise.all([
                db.collection('users').doc(userId).get(),
                db.collection('user_balances').doc(userId).get(),
                db.collection('investments')
                    .where('userId', '==', userId)
                    .orderBy('startDate', 'desc')
                    .limit(10)
                    .get(),
                db.collection('transactions')
                    .where('userId', '==', userId)
                    .orderBy('date', 'desc')
                    .limit(10)
                    .get()
            ]);

            const userData = userDoc.data();
            const balanceData = balanceDoc.exists ? balanceDoc.data() : { balance: 0 };

            // Display basic information
            userBasicInfo.innerHTML = `
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${userData.phone || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${userData.status || 'active'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Joined:</span>
                    <span class="info-value">${formatDate(userData.createdAt)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Referral Code:</span>
                    <span class="info-value">${userData.referralCode || 'N/A'}</span>
                </div>
            `;

            // Display financial information
            userFinancialInfo.innerHTML = `
                <div class="info-row">
                    <span class="info-label">Current Balance:</span>
                    <span class="info-value">$${balanceData.balance?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Total Invested:</span>
                    <span class="info-value">$${calculateTotalInvested(investmentsSnapshot).toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Total Profit:</span>
                    <span class="info-value">$${calculateTotalProfit(investmentsSnapshot).toFixed(2)}</span>
                </div>
            `;

            // Display investments
            userInvestments.innerHTML = '';
            if (investmentsSnapshot.empty) {
                userInvestments.innerHTML = '<div class="info-row">No investments found</div>';
            } else {
                investmentsSnapshot.forEach(doc => {
                    const investment = doc.data();
                    userInvestments.innerHTML += `
                        <div class="investment-item">
                            <div><strong>${investment.productName}</strong></div>
                            <div>Amount: $${investment.amount.toFixed(2)}</div>
                            <div>Start Date: ${formatDate(investment.startDate)}</div>
                            <div>Status: ${investment.status}</div>
                            <div>Profit Paid: $${(investment.totalProfitPaid || 0).toFixed(2)}</div>
                        </div>
                    `;
                });
            }

            // Display transactions
            userTransactions.innerHTML = '';
            if (transactionsSnapshot.empty) {
                userTransactions.innerHTML = '<div class="info-row">No transactions found</div>';
            } else {
                transactionsSnapshot.forEach(doc => {
                    const transaction = doc.data();
                    const isPositive = ['profit', 'refund', 'commission'].includes(transaction.type);
                    userTransactions.innerHTML += `
                        <div class="transaction-item">
                            <div>
                                <div><strong>${transaction.description || transaction.type}</strong></div>
                                <div>${formatDate(transaction.date)}</div>
                            </div>
                            <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                                ${isPositive ? '+' : '-'}$${transaction.amount.toFixed(2)}
                            </div>
                        </div>
                    `;
                });
            }

            // Show modal
            modal.style.display = 'block';

            // Close modal functionality
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            }

            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Error loading user details:', error);
            alert('Error loading user details');
        }
    };

    function calculateTotalInvested(investmentsSnapshot) {
        let total = 0;
        investmentsSnapshot.forEach(doc => {
            const investment = doc.data();
            total += investment.amount || 0;
        });
        return total;
    }

    function calculateTotalProfit(investmentsSnapshot) {
        let total = 0;
        investmentsSnapshot.forEach(doc => {
            const investment = doc.data();
            total += investment.totalProfitPaid || 0;
        });
        return total;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        try {
            // Handle both Firestore Timestamp and regular Date objects
            const date = timestamp instanceof firebase.firestore.Timestamp ? 
                timestamp.toDate() : 
                (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));

            if (!(date instanceof Date) || isNaN(date)) return 'N/A';

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'N/A';
        }
    }

    // Load products
    async function loadProducts() {
        try {
            const productsContainer = document.getElementById('productsContainer');
            productsContainer.innerHTML = '<div class="loading">Loading products...</div>';

            const snapshot = await db.collection('products').get();
            
            if (snapshot.empty) {
                productsContainer.innerHTML = '<div class="no-data">No products found</div>';
                return;
            }

            // Group products by category
            const productsByCategory = {
                treasure_hunt: [],
                normal: [],
                short_cycle: [],
                vip: [],
                other: [] // Add an "other" category for products that don't match predefined categories
            };

            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                if (productsByCategory.hasOwnProperty(product.category)) {
                    productsByCategory[product.category].push(product);
                } else {
                    productsByCategory.other.push(product);
                }
            });

            // Create HTML for products
            let html = '';
            
            // Order of categories
            const categoryOrder = ['treasure_hunt', 'normal', 'short_cycle', 'vip', 'other'];
            const categoryTitles = {
                treasure_hunt: 'Treasure Hunt',
                normal: 'NORMAL',
                short_cycle: 'SHORT CYCLE',
                vip: 'VIP',
                other: 'Other Products'
            };

            categoryOrder.forEach(category => {
                const products = productsByCategory[category];
                if (products.length > 0) {
                    html += `
                        <div class="category-section">
                            <h3>${categoryTitles[category]}</h3>
                            <div class="products-grid">
                                ${products.map(product => `
                                    <div class="product-card ${product.status === 'inactive' ? 'inactive' : ''}">
                                        <img src="${product.image}" alt="${product.name}">
                                        <div class="product-info">
                                            <h4>${product.name}</h4>
                                            <p class="price">$${product.price.toLocaleString()}</p>
                                            <p class="duration">${product.duration} Days</p>
                                            <p class="return">Daily: ${product.dailyReturn}%</p>
                                            <p class="return">Total: ${product.totalReturn}%</p>
                                            <div class="product-actions">
                                                <button onclick="editProduct('${product.id}')" class="edit-btn">
                                                    <span class="material-icons">edit</span>
                                                </button>
                                                <button onclick="deleteProduct('${product.id}')" class="delete-btn">
                                                    <span class="material-icons">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <button onclick="deleteProduct('${product.id}')" class="delete-product-btn">
                                            <span class="material-icons">delete</span>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            });

            productsContainer.innerHTML = html || '<div class="no-data">No products found</div>';
        } catch (error) {
            console.error('Error loading products:', error);
            productsContainer.innerHTML = '<div class="error">Error loading products</div>';
        }
    }

    // Product form handling
    const productForm = document.getElementById('productForm');
    const productImage = document.getElementById('productImage');
    const previewImg = document.getElementById('previewImg');
    const placeholder = document.querySelector('.upload-placeholder');

    // Image preview - only add listener if elements exist
    if (productImage && previewImg && placeholder) {
        productImage.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    placeholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Form submission - only add listener if form exists
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const productData = {
                    name: document.getElementById('productName').value,
                    category: document.getElementById('productCategory').value,
                    image: document.querySelector('input[name="productImage"]:checked')?.value || '',
                    price: parseFloat(document.getElementById('productPrice').value),
                    duration: parseInt(document.getElementById('productDuration').value),
                    dailyReturn: parseFloat(document.getElementById('productDailyReturn').value),
                    totalReturn: parseFloat(document.getElementById('productTotalReturn').value),
                    referralCommission: parseFloat(document.getElementById('productReferralCommission').value),
                    status: document.getElementById('productStatus').value,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Validate required fields
                if (!productData.name || !productData.category || !productData.image || 
                    isNaN(productData.price) || isNaN(productData.duration) || 
                    isNaN(productData.dailyReturn) || isNaN(productData.totalReturn) || 
                    isNaN(productData.referralCommission)) {
                    alert('Please fill in all required fields');
                    return;
                }

                await firebase.firestore().collection('products').add(productData);
                alert('Product added successfully!');
                productForm.reset();
                closeAddProductModal();
                loadProducts(); // Refresh the products list
            } catch (error) {
                console.error('Error adding product:', error);
                alert('Error adding product. Please try again.');
            }
        });
    }

    // Edit product
    window.editProduct = async function(productId) {
        try {
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                throw new Error('Product not found');
            }

            const product = productDoc.data();
            const modal = document.getElementById('productModal');
            const modalTitle = document.getElementById('productModalTitle');
            const saveBtn = document.getElementById('saveProductBtn');

            // Fill form with product data
            const formElements = {
                'productName': product.name || '',
                'productPrice': product.price || '',
                'productDuration': product.duration || '',
                'productReturn': product.dailyReturn || '',
                'productTotalReturn': product.totalReturn || '',
                'productDescription': product.description || '',
                'productStatus': product.status || 'active',
                'level1Commission': product.referralCommissions?.level1 || '',
                'level2Commission': product.referralCommissions?.level2 || '',
                'level3Commission': product.referralCommissions?.level3 || '',
                'level4Commission': product.referralCommissions?.level4 || ''
            };

            // Set form values safely
            Object.entries(formElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });

            // Handle image preview if elements exist
            const previewImg = document.getElementById('previewImg');
            const placeholder = document.querySelector('.upload-placeholder');
            if (previewImg && placeholder) {
                if (product.imageUrl) {
                    previewImg.src = product.imageUrl;
                    previewImg.style.display = 'block';
                    placeholder.style.display = 'none';
                    saveBtn.setAttribute('data-image-url', product.imageUrl);
                } else {
                    previewImg.src = '';
                    previewImg.style.display = 'none';
                    placeholder.style.display = 'block';
                    saveBtn.removeAttribute('data-image-url');
                }
            }

            // Reset file input if exists
            const imageInput = document.getElementById('productImage');
            if (imageInput) {
                imageInput.value = '';
            }

            // Set modal for editing
            modalTitle.textContent = 'Edit Product';
            saveBtn.setAttribute('data-mode', 'edit');
            saveBtn.setAttribute('data-product-id', productId);

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading product:', error);
            alert('Failed to load product: ' + error.message);
        }
    };

    // Load deposits
    async function loadDeposits() {
        try {
            const depositsList = document.getElementById('depositsList');
            depositsList.innerHTML = '<div class="list-item">Loading deposits...</div>';

            // Get all pending deposits without ordering first
            const depositsSnapshot = await db.collection('deposits')
                .where('status', '==', 'pending')
                .get();

            if (depositsSnapshot.empty) {
                depositsList.innerHTML = '<div class="list-item">No pending deposits found</div>';
                return;
            }

            depositsList.innerHTML = '';
            
            // Convert to array and sort in memory
            const deposits = [];
            for (const doc of depositsSnapshot.docs) {
                deposits.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            // Sort by createdAt in memory
            deposits.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                return timeB - timeA; // descending order
            });
            
            // Process each deposit
            for (const deposit of deposits) {
                // Get user details
                let userDetails = 'Unknown User';
                try {
                    const userDoc = await db.collection('users').doc(deposit.userId).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        userDetails = userData.phone || userData.email || 'Unknown User';
                    }
                } catch (error) {
                    console.error('Error fetching user details:', error);
                }

                const depositElement = document.createElement('div');
                depositElement.className = 'list-item deposit-item';
                
                // Format date
                const date = deposit.createdAt ? new Date(deposit.createdAt.toDate()).toLocaleString() : 'N/A';

                depositElement.innerHTML = `
                    <div class="deposit-info">
                        <div class="deposit-header">
                            <span class="deposit-amount">$${deposit.amount ? deposit.amount.toFixed(2) : '0.00'}</span>
                            <span class="status-badge status-pending">Pending</span>
                        </div>
                        <div class="deposit-details">
                            <div><strong>User:</strong> ${userDetails}</div>
                            <div><strong>Payment Method:</strong> ${deposit.paymentMethod || 'N/A'}</div>
                            <div><strong>Transaction Hash:</strong> ${deposit.transactionHash || 'N/A'}</div>
                            <div><strong>Date:</strong> ${date}</div>
                        </div>
                    </div>
                    <div class="deposit-actions">
                        <button onclick="updateDepositStatus('${deposit.id}', 'approved')" class="approve-btn">
                            <span class="material-icons">check</span> Approve
                        </button>
                        <button onclick="updateDepositStatus('${deposit.id}', 'rejected')" class="reject-btn">
                            <span class="material-icons">close</span> Reject
                        </button>
                    </div>
                `;
                depositsList.appendChild(depositElement);
            }
        } catch (error) {
            console.error('Error loading deposits:', error);
            depositsList.innerHTML = '<div class="list-item error">Error loading deposits: ' + error.message + '</div>';
        }
    }

    // Update deposit status function
    window.updateDepositStatus = async function(depositId, status) {
        if (!confirm(`Are you sure you want to ${status} this deposit?`)) return;

        try {
            await db.runTransaction(async (transaction) => {
                const depositRef = db.collection('deposits').doc(depositId);
                const depositDoc = await transaction.get(depositRef);
                
                if (!depositDoc.exists) throw new Error('Deposit not found');
                
                const deposit = depositDoc.data();
                
                // Check if deposit is still pending
                if (deposit.status !== 'pending') {
                    throw new Error('This deposit has already been processed');
                }

                if (status === 'approved') {
                    // Get user's current balance
                    const balanceRef = db.collection('user_balances').doc(deposit.userId);
                    const balanceDoc = await transaction.get(balanceRef);
                    const currentBalance = balanceDoc.exists ? balanceDoc.data().balance : 0;
                    
                    // Update deposit status
                    transaction.update(depositRef, {
                        status: 'approved',
                        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid
                    });

                    // Update user's balance
                    transaction.set(balanceRef, {
                        balance: currentBalance + deposit.amount,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Add transaction record
                    transaction.set(db.collection('transactions').doc(), {
                        userId: deposit.userId,
                        type: 'deposit',
                        amount: deposit.amount,
                        status: 'completed',
                        description: 'Deposit approved',
                        paymentMethod: deposit.paymentMethod,
                        transactionHash: deposit.transactionHash,
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid
                    });
                } else if (status === 'rejected') {
                    // Update deposit status
                    transaction.update(depositRef, {
                        status: 'rejected',
                        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid,
                        rejectionReason: 'Rejected by admin'
                    });

                    // Add transaction record
                    transaction.set(db.collection('transactions').doc(), {
                        userId: deposit.userId,
                        type: 'deposit_rejected',
                        amount: deposit.amount,
                        status: 'rejected',
                        description: 'Deposit rejected',
                        paymentMethod: deposit.paymentMethod,
                        transactionHash: deposit.transactionHash,
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid
                    });
                }
            });

            // Refresh the dashboard
            loadDashboardStats();
            loadDeposits();
            alert(`Deposit ${status} successfully`);
        } catch (error) {
            console.error(`Error ${status}ing deposit:`, error);
            alert(`Failed to ${status} deposit: ${error.message}`);
        }
    };

    // Approve withdrawal
    window.approveWithdrawal = async function(withdrawalId, userId) {
        if (!confirm('Are you sure you want to approve this withdrawal?')) return;

        try {
            await db.runTransaction(async (transaction) => {
                const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
                const withdrawalDoc = await transaction.get(withdrawalRef);
                
                if (!withdrawalDoc.exists) throw new Error('Withdrawal not found');
                
                const withdrawal = withdrawalDoc.data();
                
                // Check if withdrawal is still pending
                if (withdrawal.status !== 'pending') {
                    throw new Error('This withdrawal has already been processed');
                }

                // Check if user exists
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User not found');
                }

                // Update withdrawal status
                transaction.update(withdrawalRef, {
                    status: 'approved',
                    processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: auth.currentUser.uid
                });

                // Add transaction record
                transaction.set(db.collection('transactions').doc(), {
                    userId: withdrawal.userId,
                    type: 'withdrawal',
                    amount: withdrawal.amount,
                    status: 'completed',
                    description: 'Withdrawal approved',
                    bankDetails: {
                        bankName: withdrawal.bankName,
                        accountNumber: withdrawal.accountNumber,
                        ifscCode: withdrawal.ifscCode,
                        accountHolder: withdrawal.accountHolder
                    },
                    date: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: auth.currentUser.uid
                });
            });

            loadDashboardStats();
            loadWithdrawals();
            alert('Withdrawal approved successfully');
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            alert('Failed to approve withdrawal: ' + error.message);
        }
    };

    // Reject withdrawal
    window.rejectWithdrawal = async function(withdrawalId, userId) {
        if (!confirm('Are you sure you want to reject this withdrawal?')) return;

        try {
            await db.runTransaction(async (transaction) => {
                const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
                const withdrawalDoc = await transaction.get(withdrawalRef);
                
                if (!withdrawalDoc.exists) throw new Error('Withdrawal not found');
                
                const withdrawal = withdrawalDoc.data();
                
                // Check if withdrawal is still pending
                if (withdrawal.status !== 'pending') {
                    throw new Error('This withdrawal has already been processed');
                }

                // Check if user exists
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User not found');
                }
                
                // Get user's current balance
                const balanceRef = db.collection('user_balances').doc(userId);
                const balanceDoc = await transaction.get(balanceRef);
                const currentBalance = balanceDoc.exists ? balanceDoc.data().balance : 0;
                
                // Update withdrawal status
                transaction.update(withdrawalRef, {
                    status: 'rejected',
                    processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: auth.currentUser.uid,
                    rejectionReason: 'Rejected by admin'
                });

                // Refund the amount to user's balance
                transaction.set(balanceRef, {
                    balance: currentBalance + withdrawal.amount
                }, { merge: true });

                // Add transaction record
                transaction.set(db.collection('transactions').doc(), {
                    userId: withdrawal.userId,
                    type: 'withdrawal_rejected',
                    amount: withdrawal.amount,
                    status: 'rejected',
                    description: 'Withdrawal rejected - Amount refunded',
                    date: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: auth.currentUser.uid
                });
            });

            loadDashboardStats();
            loadWithdrawals();
            alert('Withdrawal rejected and amount refunded successfully');
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            alert('Failed to reject withdrawal: ' + error.message);
        }
    };

    window.blockUser = async function(userId) {
        if (!confirm('Are you sure you want to block this user?')) return;

        try {
            await db.collection('users').doc(userId).update({
                status: 'blocked'
            });
            loadUsers();
        } catch (error) {
            console.error('Error blocking user:', error);
            alert('Failed to block user');
        }
    };

    window.unblockUser = async function(userId) {
        if (!confirm('Are you sure you want to unblock this user?')) return;

        try {
            await db.collection('users').doc(userId).update({
                status: 'active'
            });
            loadUsers();
        } catch (error) {
            console.error('Error unblocking user:', error);
            alert('Failed to unblock user');
        }
    };

    window.previewImage = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            const previewImg = document.getElementById('previewImg');
            const placeholder = document.querySelector('.upload-placeholder');

            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
            }

            reader.readAsDataURL(file);
        }
    };

    // Show add product modal
    window.showAddProductModal = function() {
        const modal = document.getElementById('addProductModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');
        
        // Reset form
        form.reset();
        
        // Set modal title
        modalTitle.textContent = 'Add New Product';
        
        // Show modal
        modal.style.display = 'block';
    };

    window.closeProductModal = function() {
        document.getElementById('productModal').style.display = 'none';
    };

    window.saveProduct = async function() {
        try {
            // Get form values
            const name = document.getElementById('productName').value.trim();
            const category = document.getElementById('productCategory').value;
            const price = parseFloat(document.getElementById('productPrice').value);
            const duration = parseInt(document.getElementById('productDuration').value);
            const dailyReturn = parseFloat(document.getElementById('productDailyReturn').value);
            const totalReturn = parseFloat(document.getElementById('productTotalReturn').value);
            const referralCommission = parseFloat(document.getElementById('productReferralCommission').value);
            const status = document.getElementById('productStatus').value;
            
            // Get selected image
            const selectedImage = document.querySelector('input[name="productImage"]:checked');
            if (!selectedImage) {
                alert('Please select a product image');
                return;
            }
            
            // Validate category-specific requirements
            if (category === 'treasure_hunt') {
                if (duration < 30) {
                    alert('Treasure Hunt products must have a minimum duration of 30 days');
                    return;
                }
            } else if (category === 'short_cycle') {
                if (duration > 15) {
                    alert('Short Cycle products must have a maximum duration of 15 days');
                    return;
                }
            } else if (category === 'vip') {
                if (price < 10000) {
                    alert('VIP products must have a minimum price of $10,000');
                    return;
                }
            }

            // Create product data
            const productData = {
                name,
                category,
                image: selectedImage.value,
                price,
                duration,
                dailyReturn,
                totalReturn,
                referralCommission,
                status,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Save to Firestore
            await db.collection('products').add(productData);

            // Close modal and refresh products
            closeAddProductModal();
            loadProducts();
            alert('Product added successfully!');
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product: ' + error.message);
        }
    };

    window.deleteProduct = async function(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            // Get product data to access image URL
            const productDoc = await db.collection('products').doc(productId).get();
            const product = productDoc.data();

            // Delete image from storage if exists
            if (product.imageUrl) {
                try {
                    const storage = firebase.storage();
                    const imageRef = storage.refFromURL(product.imageUrl);
                    await imageRef.delete();
                } catch (error) {
                    console.error('Error deleting product image:', error);
                }
            }

            // Delete product document
            await db.collection('products').doc(productId).delete();
            loadProducts();
            loadDashboardStats();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product');
        }
    };

    // Edit user function
    window.editUser = async function(userId) {
        try {
            const [userDoc, balanceDoc, usdtDetailsDoc] = await Promise.all([
                db.collection('users').doc(userId).get(),
                db.collection('user_balances').doc(userId).get(),
                db.collection('usdt_details').doc(userId).get()
            ]);

            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const balanceData = balanceDoc.exists ? balanceDoc.data() : { balance: 0 };
            const usdtData = usdtDetailsDoc.exists ? usdtDetailsDoc.data() : {};

            // Fill form with user data
            document.getElementById('editUserPhone').value = userData.phone || '';
            document.getElementById('editUserReferralCode').value = userData.referralCode || '';
            document.getElementById('editUserBalance').value = balanceData.balance || 0;
            document.getElementById('editUserStatus').value = userData.status || 'active';
            document.getElementById('editUserUsdtAddress').value = usdtData.usdtAddress || '';
            document.getElementById('editUserNetwork').value = usdtData.network || 'BEP20';

            // Store user ID for save operation
            document.getElementById('saveUserBtn').setAttribute('data-user-id', userId);

            // Show modal
            document.getElementById('userEditModal').style.display = 'block';
        } catch (error) {
            console.error('Error loading user data:', error);
            alert('Failed to load user data: ' + error.message);
        }
    };

    // Close user edit modal
    window.closeUserEditModal = function() {
        document.getElementById('userEditModal').style.display = 'none';
    };

    // Save user changes
    window.saveUserChanges = async function() {
        const userId = document.getElementById('saveUserBtn').getAttribute('data-user-id');
        if (!userId) {
            alert('User ID not found');
            return;
        }

        try {
            await db.runTransaction(async (transaction) => {
                // Get form values
                const phone = document.getElementById('editUserPhone').value.trim();
                const referralCode = document.getElementById('editUserReferralCode').value.trim();
                const balance = parseFloat(document.getElementById('editUserBalance').value);
                const status = document.getElementById('editUserStatus').value;
                const usdtAddress = document.getElementById('editUserUsdtAddress').value.trim();
                const network = document.getElementById('editUserNetwork').value;

                // FIRST: Perform all reads
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);

                const balanceRef = db.collection('user_balances').doc(userId);
                const balanceDoc = await transaction.get(balanceRef);
                const oldBalance = balanceDoc.exists ? balanceDoc.data().balance : 0;

                const usdtRef = db.collection('usdt_details').doc(userId);
                const usdtDoc = await transaction.get(usdtRef);

                // SECOND: Perform all writes
                // Update user document
                transaction.update(userRef, {
                    phone,
                    referralCode,
                    status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update balance
                transaction.set(balanceRef, {
                    balance,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Update USDT details if any field is provided
                if (usdtAddress || network) {
                    transaction.set(usdtRef, {
                        usdtAddress,
                        network,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                // Add transaction record if balance was changed
                if (balance !== oldBalance) {
                    const changeAmount = balance - oldBalance;
                    const transactionRef = db.collection('transactions').doc();
                    transaction.set(transactionRef, {
                        userId,
                        type: 'balance_adjustment',
                        amount: Math.abs(changeAmount),
                        status: 'completed',
                        description: `Balance ${changeAmount >= 0 ? 'increased' : 'decreased'} by admin`,
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid,
                        oldBalance: oldBalance,
                        newBalance: balance
                    });

                    // Also log this admin action
                    const adminActionRef = db.collection('admin_actions').doc();
                    transaction.set(adminActionRef, {
                        adminId: auth.currentUser.uid,
                        action: 'balance_adjustment',
                        targetUserId: userId,
                        details: {
                            oldBalance: oldBalance,
                            newBalance: balance,
                            changeAmount: changeAmount
                        },
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            closeUserEditModal();
            loadUsers();
            loadDashboardStats();
            alert('User data updated successfully');
        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Failed to update user data: ' + error.message);
        }
    };

    // Add click outside modal to close
    window.onclick = function(event) {
        const userEditModal = document.getElementById('userEditModal');
        if (event.target == userEditModal) {
            userEditModal.style.display = 'none';
        }
    };

    // Refresh data periodically
    setInterval(loadDashboardStats, 300000); // Every 5 minutes
    setInterval(loadWithdrawals, 60000); // Every minute
    setInterval(loadDeposits, 60000); // Every minute

    // Load banners
    async function loadBanners() {
        try {
            const bannersList = document.getElementById('bannersList');
            bannersList.innerHTML = '<div class="list-item">Loading banners...</div>';

            const snapshot = await db.collection('banners')
                .orderBy('order', 'asc')
                .get();

            if (snapshot.empty) {
                bannersList.innerHTML = '<div class="list-item">No banners found</div>';
                return;
            }

            bannersList.innerHTML = '';
            snapshot.forEach(doc => {
                const banner = doc.data();
                const div = document.createElement('div');
                div.className = 'list-item banner-item';
                div.innerHTML = `
                    <img src="${banner.imageUrl}" alt="${banner.title}" class="banner-image" onerror="this.src='placeholder-banner.jpg'">
                    <div class="banner-info">
                        <div><strong>Title:</strong> ${banner.title}</div>
                        <div><strong>Order:</strong> ${banner.order}</div>
                        <div><strong>Status:</strong> <span class="status-badge status-${banner.status}">${banner.status}</span></div>
                        ${banner.link ? `<div><strong>Link:</strong> ${banner.link}</div>` : ''}
                    </div>
                    <div class="banner-actions">
                        <div class="order-buttons">
                            <button class="order-button" onclick="moveBanner('${doc.id}', 'up')" title="Move Up">↑</button>
                            <button class="order-button" onclick="moveBanner('${doc.id}', 'down')" title="Move Down">↓</button>
                        </div>
                        <button class="action-button approve-button" onclick="editBanner('${doc.id}')">Edit</button>
                        <button class="action-button reject-button" onclick="deleteBanner('${doc.id}')">Delete</button>
                    </div>
                `;
                bannersList.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading banners:', error);
            bannersList.innerHTML = '<div class="list-item">Error loading banners: ' + error.message + '</div>';
        }
    }

    // Preview banner image
    window.previewBannerImage = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            const previewImg = document.getElementById('previewBannerImg');
            const placeholder = document.querySelector('#bannerImagePreview .upload-placeholder');

            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
            }

            reader.readAsDataURL(file);
        }
    };

    // Add new banner - global function
    window.addNewBanner = function() {
        const modal = document.getElementById('bannerModal');
        const modalTitle = document.getElementById('bannerModalTitle');
        const bannerForm = document.getElementById('bannerForm');
        const saveBtn = document.getElementById('saveBannerBtn');
        
        // Reset form if it exists
        if (bannerForm) {
            bannerForm.reset();
        }
        
        // Reset image preview
        const previewImg = document.getElementById('previewBannerImg');
        const previewPlaceholder = document.querySelector('.upload-placeholder');
        if (previewImg) {
            previewImg.style.display = 'none';
        }
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'block';
        }
        
        // Reset selected image
        document.querySelectorAll('.banner-image-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Set modal title and save button attributes
        if (modalTitle) {
            modalTitle.textContent = 'Add New Banner';
        }
        if (saveBtn) {
            saveBtn.setAttribute('data-mode', 'add');
            saveBtn.removeAttribute('data-banner-id');
        }
        
        // Show modal
        if (modal) {
            modal.style.display = 'block';
        }
    };

    // Select banner image - global function
    window.selectBannerImage = function(imagePath) {
        const previewImg = document.getElementById('previewBannerImg');
        const previewPlaceholder = document.querySelector('.upload-placeholder');
        
        // Update preview
        if (previewImg) {
            previewImg.src = imagePath;
            previewImg.style.display = 'block';
        }
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'none';
        }
        
        // Update selected state
        document.querySelectorAll('.banner-image-option').forEach(option => {
            option.classList.remove('selected');
            if (option.querySelector('img').src.includes(imagePath)) {
                option.classList.add('selected');
            }
        });
    };

    // Select QR code image
    window.selectQRImage = function(imagePath) {
        const previewImg = document.getElementById('previewQRImg');
        const placeholder = document.querySelector('#qrImagePreview .upload-placeholder');
        const qrOptions = document.querySelectorAll('.qr-image-option');
        
        // Update preview
        if (previewImg) {
            previewImg.src = imagePath;
            previewImg.style.display = 'block';
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Update selected state
        qrOptions.forEach(option => {
            const optionImg = option.querySelector('img');
            if (optionImg && optionImg.src.includes(imagePath)) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        // Clear file input
        const fileInput = document.getElementById('qrImage');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    // Preview uploaded QR image
    window.previewQRImage = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            const previewImg = document.getElementById('previewQRImg');
            const placeholder = document.querySelector('#qrImagePreview .upload-placeholder');
            
            reader.onload = function(e) {
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                }
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            };
            
            reader.readAsDataURL(file);
            
            // Remove selected state from predefined options
            document.querySelectorAll('.qr-image-option').forEach(option => {
                option.classList.remove('selected');
            });
        }
    };

    // Toggle payment fields based on payment type
    window.togglePaymentFields = function() {
        const paymentType = document.getElementById('paymentType').value;
        const usdtSection = document.getElementById('usdtSection');
        const qrCodeSection = document.getElementById('qrCodeSection');
        
        if (usdtSection && qrCodeSection) {
            if (paymentType === 'usdt') {
                usdtSection.style.display = 'block';
                qrCodeSection.style.display = 'none';
            } else if (paymentType === 'qr') {
                usdtSection.style.display = 'none';
                qrCodeSection.style.display = 'block';
            }
        }
    };

    // Load payment methods
    async function loadPaymentMethods() {
        try {
            const paymentMethodsList = document.getElementById('paymentMethodsList');
            paymentMethodsList.innerHTML = '<div class="list-item">Loading payment methods...</div>';

            const snapshot = await db.collection('payment_methods')
                .orderBy('createdAt', 'desc')
                .get();

            if (snapshot.empty) {
                paymentMethodsList.innerHTML = '<div class="list-item">No payment methods found</div>';
                return;
            }

            paymentMethodsList.innerHTML = '';
            snapshot.forEach(doc => {
                const method = doc.data();
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div class="payment-info">
                        <div><strong>${method.name}</strong></div>
                        <div>Type: ${method.type.toUpperCase()}</div>
                        ${method.type === 'qr' && method.qrImageUrl ? 
                            `<div><img src="${method.qrImageUrl}" alt="QR Code" style="width: 100px; height: 100px; object-fit: contain;"></div>` : ''}
                        ${method.type === 'usdt' ? `
                            <div>USDT Address: ${method.usdtAddress}</div>
                            <div>Network: ${method.network}</div>
                        ` : ''}
                        <div>Status: <span class="status-badge status-${method.status}">${method.status}</span></div>
                    </div>
                    <div class="action-buttons">
                        <button class="action-button approve-button" onclick="editPaymentMethod('${doc.id}')">Edit</button>
                        <button class="action-button reject-button" onclick="deletePaymentMethod('${doc.id}')">Delete</button>
                    </div>
                `;
                paymentMethodsList.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading payment methods:', error);
            paymentMethodsList.innerHTML = '<div class="list-item">Error loading payment methods: ' + error.message + '</div>';
        }
    }

    // Add new payment method
    window.addPaymentMethod = function() {
        try {
            const modal = document.getElementById('paymentMethodModal');
            const modalTitle = document.getElementById('paymentModalTitle');
            const saveBtn = document.getElementById('savePaymentBtn');
            
            if (!modal || !modalTitle || !saveBtn) {
                throw new Error('Required modal elements not found');
            }

            // Reset form fields if they exist
            const formFields = {
                'paymentName': '',
                'paymentType': 'usdt',
                'paymentInstructions': '',
                'paymentStatus': 'active',
                'usdtAddress': '',
                'network': 'TRC20' // Set default to TRC20
            };

            Object.entries(formFields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });
            
            // Reset QR preview if exists
            const previewImg = document.getElementById('previewQRImg');
            const placeholder = document.querySelector('#qrImagePreview .upload-placeholder');
            if (previewImg && placeholder) {
                previewImg.src = '';
                previewImg.style.display = 'none';
                placeholder.style.display = 'block';
            }
            
            // Reset file input if exists
            const qrImageInput = document.getElementById('qrImage');
            if (qrImageInput) {
                qrImageInput.value = '';
            }
            
            // Show/hide appropriate sections
            togglePaymentFields();
            
            // Set modal for new payment method
            modalTitle.textContent = 'Add Payment Method';
            saveBtn.setAttribute('data-mode', 'add');
            saveBtn.removeAttribute('data-payment-id');
            saveBtn.removeAttribute('data-qr-url');
            
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error in addPaymentMethod:', error);
            alert('Failed to open payment method form: ' + error.message);
        }
    };

    // Edit payment method
    window.editPaymentMethod = async function(paymentId) {
        try {
            const methodDoc = await db.collection('payment_methods').doc(paymentId).get();
            if (!methodDoc.exists) {
                alert('Payment method not found');
                return;
            }

            const method = methodDoc.data();
            const modal = document.getElementById('paymentMethodModal');
            const modalTitle = document.getElementById('paymentModalTitle');
            const saveBtn = document.getElementById('savePaymentBtn');

            // Fill form with payment method data
            document.getElementById('paymentName').value = method.name || '';
            document.getElementById('paymentType').value = method.type || 'usdt';
            document.getElementById('paymentInstructions').value = method.instructions || '';
            document.getElementById('paymentStatus').value = method.status || 'active';

            // Fill type-specific fields
            if (method.type === 'usdt') {
                document.getElementById('usdtAddress').value = method.usdtAddress || '';
                document.getElementById('network').value = method.network || 'BEP20';
            } else if (method.type === 'qr' && method.qrImageUrl) {
                const previewImg = document.getElementById('previewQRImg');
                const placeholder = document.querySelector('#qrImagePreview .upload-placeholder');
                previewImg.src = method.qrImageUrl;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
                saveBtn.setAttribute('data-qr-url', method.qrImageUrl);
            }

            // Show/hide appropriate sections
            togglePaymentFields();

            // Reset file input
            document.getElementById('qrImage').value = '';

            // Set modal for editing
            modalTitle.textContent = 'Edit Payment Method';
            saveBtn.setAttribute('data-mode', 'edit');
            saveBtn.setAttribute('data-payment-id', paymentId);

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading payment method:', error);
            alert('Failed to load payment method details');
        }
    };

    // Close payment modal
    window.closePaymentModal = function() {
        document.getElementById('paymentMethodModal').style.display = 'none';
    };

    // Save payment method
    window.savePaymentMethod = async function() {
        try {
            const saveBtn = document.getElementById('savePaymentBtn');
            const mode = saveBtn.getAttribute('data-mode');
            const paymentId = saveBtn.getAttribute('data-payment-id');
            const existingQRUrl = saveBtn.getAttribute('data-qr-url');

            // Get form values
            const name = document.getElementById('paymentName').value.trim();
            const type = document.getElementById('paymentType').value;
            const instructions = document.getElementById('paymentInstructions').value.trim();
            const status = document.getElementById('paymentStatus').value;

            // Validate name
            if (!name) {
                alert('Please enter a payment method name');
                return;
            }

            let paymentData = {
                name,
                type,
                instructions,
                status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add type-specific data
            if (type === 'usdt') {
                const usdtAddress = document.getElementById('usdtAddress').value.trim();
                const network = document.getElementById('network').value;

                if (!usdtAddress) {
                    alert('Please enter USDT address');
                    return;
                }

                Object.assign(paymentData, {
                    usdtAddress,
                    network
                });
            } else if (type === 'qr') {
                // Get selected QR image
                const selectedOption = document.querySelector('.qr-image-option.selected');
                const qrImage = document.getElementById('qrImage').files[0];
                
                if (!qrImage && !selectedOption && !existingQRUrl) {
                    alert('Please select or upload a QR code image');
                    return;
                }

                let qrImageUrl = existingQRUrl;

                if (selectedOption) {
                    // Use the selected predefined QR code
                    qrImageUrl = selectedOption.querySelector('img').src;
                } else if (qrImage) {
                    // Upload new QR code
                    const storage = firebase.storage();
                    const storageRef = storage.ref();
                    const imageRef = storageRef.child(`payment_qr/${Date.now()}_${qrImage.name}`);
                    
                    await imageRef.put(qrImage);
                    qrImageUrl = await imageRef.getDownloadURL();

                    // Delete old QR image if exists
                    if (existingQRUrl) {
                        try {
                            const oldImageRef = storage.refFromURL(existingQRUrl);
                            await oldImageRef.delete();
                        } catch (error) {
                            console.error('Error deleting old QR image:', error);
                        }
                    }
                }

                paymentData.qrImageUrl = qrImageUrl;
            }

            if (mode === 'add') {
                paymentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('payment_methods').add(paymentData);
            } else {
                await db.collection('payment_methods').doc(paymentId).update(paymentData);
            }

            // Update payment details in recharge.html
            try {
                // Get all active payment methods
                const paymentMethodsSnapshot = await db.collection('payment_methods')
                    .where('status', '==', 'active')
                    .get();

                const activePaymentMethods = [];
                paymentMethodsSnapshot.forEach(doc => {
                    const method = doc.data();
                    activePaymentMethods.push({
                        name: method.name,
                        type: method.type,
                        instructions: method.instructions,
                        ...(method.type === 'usdt' ? {
                            usdtAddress: method.usdtAddress,
                            network: method.network
                        } : {}),
                        ...(method.type === 'qr' ? {
                            qrImageUrl: method.qrImageUrl
                        } : {})
                    });
                });

                // Update recharge settings
                await db.collection('settings').doc('recharge_settings').set({
                    paymentMethods: activePaymentMethods,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: auth.currentUser.uid
                }, { merge: true });

            } catch (error) {
                console.error('Error updating recharge settings:', error);
            }

            closePaymentModal();
            loadPaymentMethods();
            alert('Payment method saved successfully');
        } catch (error) {
            console.error('Error saving payment method:', error);
            alert('Failed to save payment method: ' + error.message);
        }
    };

    // Delete payment method
    window.deletePaymentMethod = async function(paymentId) {
        if (!confirm('Are you sure you want to delete this payment method?')) return;

        try {
            const methodDoc = await db.collection('payment_methods').doc(paymentId).get();
            const method = methodDoc.data();

            // Delete QR image from storage if exists
            if (method.type === 'qr' && method.qrImageUrl) {
                try {
                    const storage = firebase.storage();
                    const imageRef = storage.refFromURL(method.qrImageUrl);
                    await imageRef.delete();
                } catch (error) {
                    console.error('Error deleting QR image:', error);
                }
            }

            // Delete payment method document
            await db.collection('payment_methods').doc(paymentId).delete();
            loadPaymentMethods();
            alert('Payment method deleted successfully');
        } catch (error) {
            console.error('Error deleting payment method:', error);
            alert('Failed to delete payment method: ' + error.message);
        }
    };

    // Add loadPaymentMethods to periodic refresh
    setInterval(loadPaymentMethods, 300000); // Every 5 minutes

    // Load admins
    async function loadAdmins() {
        try {
            const adminsList = document.getElementById('adminsList');
            adminsList.innerHTML = '<div class="list-item">Loading admins...</div>';

            const currentAdminDoc = await db.collection('admins').doc(auth.currentUser.uid).get();
            const currentAdminRole = currentAdminDoc.data().role;

            // Only super_admin can see all admins
            const snapshot = await db.collection('admins').get();

            if (snapshot.empty) {
                adminsList.innerHTML = '<div class="list-item">No admins found</div>';
                return;
            }

            adminsList.innerHTML = '';
            snapshot.forEach(doc => {
                const admin = doc.data();
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div class="admin-info">
                        <div><strong>Name:</strong> ${admin.name || 'N/A'}</div>
                        <div><strong>Email:</strong> ${admin.email}</div>
                        <div><strong>Phone:</strong> ${admin.phone || 'N/A'}</div>
                        <div><strong>Role:</strong> ${admin.role}</div>
                        <div><strong>Status:</strong> <span class="status-badge status-${admin.status}">${admin.status}</span></div>
                        <div><strong>Created:</strong> ${formatDate(admin.createdAt)}</div>
                    </div>
                    ${currentAdminRole === 'super_admin' && doc.id !== auth.currentUser.uid ? `
                        <div class="action-buttons">
                            <button class="action-button approve-button" onclick="editAdmin('${doc.id}')">Edit</button>
                            <button class="action-button reject-button" onclick="deleteAdmin('${doc.id}')">Delete</button>
                        </div>
                    ` : ''}
                `;
                adminsList.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading admins:', error);
            adminsList.innerHTML = '<div class="list-item">Error loading admins: ' + error.message + '</div>';
        }
    }

    // Add new admin
    window.addNewAdmin = async function() {
        try {
            // Check if current user is super_admin
            const adminDoc = await db.collection('admins').doc(auth.currentUser.uid).get();
            if (!adminDoc.exists || adminDoc.data().role !== 'super_admin') {
                alert('Only super admins can add new admins');
                return;
            }

            const modal = document.getElementById('adminModal');
            const modalTitle = document.getElementById('adminModalTitle');
            const saveBtn = document.getElementById('saveAdminBtn');
            
            // Reset form
            document.getElementById('adminEmail').value = '';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminName').value = '';
            document.getElementById('adminPhone').value = '';
            document.getElementById('adminRole').value = 'admin';
            document.getElementById('adminStatus').value = 'active';
            
            // Enable email and password fields for new admin
            document.getElementById('adminEmail').disabled = false;
            document.getElementById('adminPassword').style.display = 'block';
            document.getElementById('adminPassword').previousElementSibling.style.display = 'block';
            
            // Set modal for new admin
            modalTitle.textContent = 'Add New Admin';
            saveBtn.setAttribute('data-mode', 'add');
            saveBtn.removeAttribute('data-admin-id');
            
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error checking admin role:', error);
            alert('Failed to open admin form');
        }
    };

    // Edit admin
    window.editAdmin = async function(adminId) {
        try {
            // Check if current user is super_admin
            const currentAdminDoc = await db.collection('admins').doc(auth.currentUser.uid).get();
            if (!currentAdminDoc.exists || currentAdminDoc.data().role !== 'super_admin') {
                alert('Only super admins can edit other admins');
                return;
            }

            const adminDoc = await db.collection('admins').doc(adminId).get();
            if (!adminDoc.exists) {
                alert('Admin not found');
                return;
            }

            const admin = adminDoc.data();
            const modal = document.getElementById('adminModal');
            const modalTitle = document.getElementById('adminModalTitle');
            const saveBtn = document.getElementById('saveAdminBtn');

            // Fill form with admin data
            document.getElementById('adminEmail').value = admin.email || '';
            document.getElementById('adminName').value = admin.name || '';
            document.getElementById('adminPhone').value = admin.phone || '';
            document.getElementById('adminRole').value = admin.role || 'admin';
            document.getElementById('adminStatus').value = admin.status || 'active';

            // Disable email field and hide password field for editing
            document.getElementById('adminEmail').disabled = true;
            document.getElementById('adminPassword').style.display = 'none';
            document.getElementById('adminPassword').previousElementSibling.style.display = 'none';

            // Set modal for editing
            modalTitle.textContent = 'Edit Admin';
            saveBtn.setAttribute('data-mode', 'edit');
            saveBtn.setAttribute('data-admin-id', adminId);

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading admin:', error);
            alert('Failed to load admin details');
        }
    };

    // Close admin modal
    window.closeAdminModal = function() {
        document.getElementById('adminModal').style.display = 'none';
    };

    // Save admin
    window.saveAdmin = async function() {
        try {
            const saveBtn = document.getElementById('saveAdminBtn');
            const mode = saveBtn.getAttribute('data-mode');
            const adminId = saveBtn.getAttribute('data-admin-id');

            // Get form values
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value.trim();
            const name = document.getElementById('adminName').value.trim();
            const phone = document.getElementById('adminPhone').value.trim();
            const role = document.getElementById('adminRole').value;
            const status = document.getElementById('adminStatus').value;

            // Validate inputs
            if (!email || (!adminId && !password) || !name || !phone) {
                alert('Please fill in all required fields');
                return;
            }

            if (mode === 'add') {
                // Create new admin account in Authentication
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const uid = userCredential.user.uid;

                // Add admin document to Firestore
                await db.collection('admins').doc(uid).set({
                    email,
                    name,
                    phone,
                    role,
                    status,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser.uid
                });

                // Send email verification
                await userCredential.user.sendEmailVerification();
            } else {
                // Update existing admin
                await db.collection('admins').doc(adminId).update({
                    name,
                    phone,
                    role,
                    status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: auth.currentUser.uid
                });
            }

            closeAdminModal();
            loadAdmins();
            alert('Admin ' + (mode === 'add' ? 'created' : 'updated') + ' successfully');
        } catch (error) {
            console.error('Error saving admin:', error);
            alert('Failed to save admin: ' + error.message);
        }
    };

    // Delete admin
    window.deleteAdmin = async function(adminId) {
        try {
            // Check if current user is super_admin
            const currentAdminDoc = await db.collection('admins').doc(auth.currentUser.uid).get();
            if (!currentAdminDoc.exists || currentAdminDoc.data().role !== 'super_admin') {
                alert('Only super admins can delete other admins');
                return;
            }

            if (!confirm('Are you sure you want to delete this admin?')) return;

            // Get admin data
            const adminDoc = await db.collection('admins').doc(adminId).get();
            if (!adminDoc.exists) {
                alert('Admin not found');
                return;
            }

            // Delete admin document from Firestore
            await db.collection('admins').doc(adminId).delete();

            // Note: The Authentication account is not deleted to prevent potential issues
            // The admin will no longer have access due to the deleted admin document

            loadAdmins();
            alert('Admin deleted successfully');
        } catch (error) {
            console.error('Error deleting admin:', error);
            alert('Failed to delete admin: ' + error.message);
        }
    };

    // Add loadAdmins to periodic refresh
    setInterval(loadAdmins, 300000); // Every 5 minutes

    // Load recharge amounts
    async function loadRechargeAmounts() {
        try {
            const amountsList = document.getElementById('rechargeAmountsList');
            amountsList.innerHTML = '<div class="list-item">Loading amounts...</div>';

            // Get recharge amounts from Firestore
            const doc = await db.collection('settings').doc('recharge_amounts').get();
            const amounts = doc.exists ? doc.data().amounts : [1000, 2500, 5000, 10000, 25000, 50000];

            // Display amounts
            amountsList.innerHTML = '';
            amounts.forEach((amount, index) => {
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div class="amount-item">
                        <span class="amount-label">Amount ${index + 1}</span>
                        <span class="amount-value">$${amount.toLocaleString()}</span>
                    </div>
                `;
                amountsList.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading recharge amounts:', error);
            amountsList.innerHTML = '<div class="list-item">Error loading amounts: ' + error.message + '</div>';
        }
    }

    // Edit recharge amounts
    window.editRechargeAmounts = async function() {
        try {
            const doc = await db.collection('settings').doc('recharge_amounts').get();
            const amounts = doc.exists ? doc.data().amounts : [1000, 2500, 5000, 10000, 25000, 50000];
            
            const inputsContainer = document.getElementById('amountInputs');
            inputsContainer.innerHTML = '';
            
            amounts.forEach((amount, index) => {
                const div = document.createElement('div');
                div.className = 'form-group';
                div.innerHTML = `
                    <label for="amount${index}">Amount ${index + 1}</label>
                    <div class="input-group">
                        <span class="currency-symbol">$</span>
                        <input type="number" id="amount${index}" value="${amount}" min="0" step="100">
                    </div>
                `;
                inputsContainer.appendChild(div);
            });

            document.getElementById('rechargeAmountsModal').style.display = 'block';
        } catch (error) {
            console.error('Error loading amounts for edit:', error);
            alert('Failed to load amounts: ' + error.message);
        }
    };

    // Close recharge amounts modal
    window.closeRechargeAmountsModal = function() {
        document.getElementById('rechargeAmountsModal').style.display = 'none';
    };

    // Save recharge amounts
    window.saveRechargeAmounts = async function() {
        try {
            const inputs = document.querySelectorAll('#amountInputs input[type="number"]');
            const amounts = Array.from(inputs).map(input => parseInt(input.value));

            // Validate amounts
            if (amounts.some(amount => isNaN(amount) || amount <= 0)) {
                alert('All amounts must be valid positive numbers');
                return;
            }

            // Sort amounts in ascending order
            amounts.sort((a, b) => a - b);

            // Save to Firestore
            await db.collection('settings').doc('recharge_amounts').set({
                amounts: amounts,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser.uid
            });

            // Update recharge.html amounts
            const rechargeDoc = await db.collection('settings').doc('recharge_amounts').get();
            
            closeRechargeAmountsModal();
            loadRechargeAmounts();
            alert('Recharge amounts updated successfully');
        } catch (error) {
            console.error('Error saving recharge amounts:', error);
            alert('Failed to save amounts: ' + error.message);
        }
    };

    // Function to show the add product modal
    window.showAddProductModal = function() {
        const modal = document.getElementById('addProductModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');
        
        // Reset form
        form.reset();
        
        // Set modal title
        modalTitle.textContent = 'Add New Product';
        
        // Show modal
        modal.style.display = 'block';
    };

    // Function to close the add product modal
    window.closeAddProductModal = function() {
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.style.display = 'none';
            // Reset form
            const form = document.getElementById('productForm');
            if (form) {
                form.reset();
            }
            // Reset image selection
            document.querySelectorAll('.image-option').forEach(opt => opt.classList.remove('selected'));
        }
    };

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modals = document.getElementsByClassName('modal');
        for (let modal of modals) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    };

    // Initialize image selection functionality
    document.addEventListener('DOMContentLoaded', function() {
        const imageOptions = document.querySelectorAll('.image-option');
        const radioButtons = document.querySelectorAll('input[name="productImage"]');

        imageOptions.forEach((option, index) => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                imageOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                option.classList.add('selected');
                // Check the corresponding radio button
                radioButtons[index].checked = true;
            });
        });

        // Handle form submission
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                try {
                    const productData = {
                        name: document.getElementById('productName').value,
                        category: document.getElementById('productCategory').value,
                        image: document.querySelector('input[name="productImage"]:checked')?.value || '',
                        price: parseFloat(document.getElementById('productPrice').value),
                        duration: parseInt(document.getElementById('productDuration').value),
                        dailyReturn: parseFloat(document.getElementById('productDailyReturn').value),
                        totalReturn: parseFloat(document.getElementById('productTotalReturn').value),
                        referralCommission: parseFloat(document.getElementById('productReferralCommission').value),
                        status: document.getElementById('productStatus').value,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Validate required fields
                    if (!productData.name || !productData.category || !productData.image || 
                        isNaN(productData.price) || isNaN(productData.duration) || 
                        isNaN(productData.dailyReturn) || isNaN(productData.totalReturn) || 
                        isNaN(productData.referralCommission)) {
                        alert('Please fill in all required fields');
                        return;
                    }

                    await firebase.firestore().collection('products').add(productData);
                    alert('Product added successfully!');
                    productForm.reset();
                    closeAddProductModal();
                    loadProducts(); // Refresh the products list
                } catch (error) {
                    console.error('Error adding product:', error);
                    alert('Error adding product. Please try again.');
                }
            });
        }
    });

    let selectedBannerImage = '';

    function selectBannerImage(imagePath) {
        selectedBannerImage = imagePath;
        const previewImg = document.getElementById('previewBannerImg');
        const previewContainer = document.getElementById('bannerImagePreview');
        
        // Update preview
        previewImg.src = imagePath;
        previewImg.style.display = 'block';
        previewContainer.querySelector('.upload-placeholder').style.display = 'none';
        
        // Update selected state
        document.querySelectorAll('.banner-image-option').forEach(option => {
            option.classList.remove('selected');
            if (option.querySelector('img').src.includes(imagePath)) {
                option.classList.add('selected');
            }
        });
    }

    // Save banner - global function
    window.saveBanner = async function() {
        try {
            const saveBtn = document.getElementById('saveBannerBtn');
            const mode = saveBtn.getAttribute('data-mode');
            const bannerId = saveBtn.getAttribute('data-banner-id');

            // Get form values
            const title = document.getElementById('bannerTitle').value.trim();
            const link = document.getElementById('bannerLink').value.trim();
            const order = parseInt(document.getElementById('bannerOrder').value);
            const status = document.getElementById('bannerStatus').value;

            // Get selected image
            const selectedOption = document.querySelector('.banner-image-option.selected');
            if (!selectedOption) {
                alert('Please select a banner image');
                return;
            }
            const imageUrl = selectedOption.querySelector('img').src;

            // Validate inputs
            if (!title || !order) {
                alert('Please fill in all required fields');
                return;
            }

            const bannerData = {
                title,
                link,
                order,
                status,
                imageUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (mode === 'add') {
                bannerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await firebase.firestore().collection('banners').add(bannerData);
            } else if (mode === 'edit' && bannerId) {
                await firebase.firestore().collection('banners').doc(bannerId).update(bannerData);
            } else {
                throw new Error('Invalid mode or missing banner ID');
            }

            closeBannerModal();
            loadBanners();
            alert('Banner saved successfully');
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('Failed to save banner: ' + error.message);
        }
    };

    // Close banner modal - global function
    window.closeBannerModal = function() {
        const modal = document.getElementById('bannerModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset form
        const bannerForm = document.getElementById('bannerForm');
        if (bannerForm) {
            bannerForm.reset();
        }
        
        // Reset image preview
        const previewImg = document.getElementById('previewBannerImg');
        const previewPlaceholder = document.querySelector('.upload-placeholder');
        if (previewImg) {
            previewImg.style.display = 'none';
        }
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'block';
        }
        
        // Reset selected image
        document.querySelectorAll('.banner-image-option').forEach(option => {
            option.classList.remove('selected');
        });
    };

    // Update withdrawal status
    window.updateWithdrawalStatus = async function(withdrawalId, status) {
        if (!confirm(`Are you sure you want to ${status} this withdrawal?`)) return;

        try {
            await db.runTransaction(async (transaction) => {
                const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
                const withdrawalDoc = await transaction.get(withdrawalRef);
                
                if (!withdrawalDoc.exists) throw new Error('Withdrawal not found');
                
                const withdrawal = withdrawalDoc.data();
                
                // Check if withdrawal is still pending
                if (withdrawal.status !== 'pending') {
                    throw new Error('This withdrawal has already been processed');
                }

                // Check if user exists
                const userRef = db.collection('users').doc(withdrawal.userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User not found');
                }

                if (status === 'approved') {
                    // Update withdrawal status
                    transaction.update(withdrawalRef, {
                        status: 'approved',
                        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid
                    });

                    // Add transaction record
                    transaction.set(db.collection('transactions').doc(), {
                        userId: withdrawal.userId,
                        type: 'withdrawal',
                        amount: withdrawal.amount,
                        status: 'completed',
                        description: 'Withdrawal approved',
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid
                    });
                } else if (status === 'rejected') {
                    // Get user's current balance
                    const balanceRef = db.collection('user_balances').doc(withdrawal.userId);
                    const balanceDoc = await transaction.get(balanceRef);
                    const currentBalance = balanceDoc.exists ? balanceDoc.data().balance : 0;
                    
                    // Update withdrawal status
                    transaction.update(withdrawalRef, {
                        status: 'rejected',
                        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid,
                        rejectionReason: 'Rejected by admin'
                    });

                    // Refund the amount to user's balance
                    transaction.set(balanceRef, {
                        balance: currentBalance + withdrawal.amount
                    }, { merge: true });

                    // Add transaction record
                    transaction.set(db.collection('transactions').doc(), {
                        userId: withdrawal.userId,
                        type: 'withdrawal_rejected',
                        amount: withdrawal.amount,
                        status: 'rejected',
                        description: 'Withdrawal rejected - Amount refunded',
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        processedBy: auth.currentUser.uid
                    });
                }
            });

            loadDashboardStats();
            loadWithdrawals();
            alert(`Withdrawal ${status} successfully`);
        } catch (error) {
            console.error(`Error ${status}ing withdrawal:`, error);
            alert(`Failed to ${status} withdrawal: ${error.message}`);
        }
    };
}); 
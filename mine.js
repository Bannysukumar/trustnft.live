document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            // Load user data
            const [userDoc, balanceDoc] = await Promise.all([
                db.collection('users').doc(user.uid).get(),
                db.collection('user_balances').doc(user.uid).get()
            ]);

            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Update user info
                document.querySelector('.user-phone').textContent = userData.phone || '';
                document.querySelector('.user-id').textContent = `ID: ${user.uid.slice(0, 8)}`;
                
                // Update balance from user_balances collection
                const balanceData = balanceDoc.exists ? balanceDoc.data() : { balance: 0 };
                document.querySelector('.total-balance').textContent = 
                    (balanceData.balance || 0).toFixed(2);
                
                // Update today's profit
                document.querySelector('.today-profit').textContent = 
                    (balanceData.todayProfit || 0).toFixed(2);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    });

    // Handle transaction history click
    const transactionHistoryItem = document.querySelector('[data-action="transaction-history"]');
    if (transactionHistoryItem) {
        transactionHistoryItem.addEventListener('click', function() {
            window.location.href = 'transaction-record.html';
        });
    }

    // Handle logout
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function() {
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error signing out. Please try again.');
            }
        });
    }

    // Menu item click handlers
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            switch(action) {
                case 'transaction-history':
                    window.location.href = 'transaction-record.html';
                    break;
                case 'bank-account':
                    window.location.href = 'bank-account.html';
                    break;
                case 'recharge':
                    window.location.href = 'recharge.html';
                    break;
                case 'withdraw':
                    window.location.href = 'withdraw.html';
                    break;
                case 'change-password':
                    window.location.href = 'change-password.html';
                    break;
                case 'shipping-address':
                    window.location.href = 'shipping-address.html';
                    break;
                case 'about-us':
                    window.location.href = 'about-us.html';
                    break;
                case 'faq':
                    window.location.href = 'faq.html';
                    break;
                case 'settings':
                    window.location.href = 'settings.html';
                    break;
            }
        });
    });

    // Back button handling
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.history.back();
        });
    }

    // Notification handling
    const notification = document.querySelector('.notification');
    if (notification) {
        notification.addEventListener('click', function() {
            window.location.href = 'message.html';
        });
    }
}); 
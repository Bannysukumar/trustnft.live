document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // If not logged in, redirect to login page
            window.location.href = 'index.html';
            return;
        }

        try {
            // Load friends data
            await loadFriendsData(user.uid);
        } catch (error) {
            console.error("Error loading friends data:", error);
            alert('Error loading friends data');
        }
    });

    async function loadFriendsData(userId) {
        try {
            // Get user's referrals
            const referralsSnapshot = await db.collection('referrals')
                .where('referrerId', '==', userId)
                .get();

            const friendsData = [];
            let activeCount = 0;
            let totalCommission = 0;

            // Process each referral
            referralsSnapshot.forEach(doc => {
                const data = doc.data();
                friendsData.push(data);
                if (data.status === 'active') activeCount++;
                totalCommission += data.commission || 0;
            });

            // Update statistics
            updateStats(friendsData.length, activeCount, totalCommission);

            // Display friends list
            displayFriends(friendsData);

        } catch (error) {
            console.error("Error loading friends data:", error);
            throw error;
        }
    }

    function updateStats(totalFriends, activeFriends, totalCommission) {
        document.querySelector('.friends-count').textContent = totalFriends;
        document.querySelector('.active-friends').textContent = activeFriends;
        document.querySelector('.total-commission').textContent = 
            totalCommission.toFixed(2);
    }

    function displayFriends(friendsData, filter = 'all') {
        const container = document.querySelector('.friends-container');
        container.innerHTML = ''; // Clear existing content

        friendsData
            .filter(friend => {
                if (filter === 'all') return true;
                return filter === friend.status;
            })
            .forEach(friend => {
                const friendElement = createFriendElement(friend);
                container.appendChild(friendElement);
            });
    }

    function createFriendElement(friend) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <div class="friend-avatar">👤</div>
            <div class="friend-info">
                <div class="friend-phone">${maskPhoneNumber(friend.phone)}</div>
                <div class="friend-date">Joined: ${formatDate(friend.date)}</div>
            </div>
            <div class="friend-status ${friend.status}">
                ${friend.status.charAt(0).toUpperCase() + friend.status.slice(1)}
            </div>
        `;
        return div;
    }

    function maskPhoneNumber(phone) {
        return phone.slice(0, 3) + '****' + phone.slice(7);
    }

    function formatDate(timestamp) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Filter button functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Apply filter
            const filter = this.dataset.filter;
            loadFriendsData(auth.currentUser.uid, filter);
        });
    });

    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });
}); 
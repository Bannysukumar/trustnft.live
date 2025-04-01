document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be ready
    const checkFirebase = setInterval(() => {
        if (window.db && window.auth) {
            clearInterval(checkFirebase);
            initializeInvitePage();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        if (!window.db || !window.auth) {
            clearInterval(checkFirebase);
            alert('Error: Firebase services not available. Please refresh the page.');
            return;
        }
    }, 5000);

    function initializeInvitePage() {
        // Elements
        const referralCodeElement = document.getElementById('referralCode');
        const totalInvitesElement = document.getElementById('totalInvites');
        const totalRewardsElement = document.getElementById('totalRewards');
        const referralsListElement = document.getElementById('referralsList');
        const copyBtn = document.getElementById('copyBtn');
        const whatsappShare = document.getElementById('whatsappShare');
        const telegramShare = document.getElementById('telegramShare');

        // Check authentication
        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    console.log('Current user:', user.uid); // Debug log

                    // Get user data
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    
                    if (!userDoc.exists) {
                        console.error('User document not found');
                        return;
                    }

                    const userData = userDoc.data();
                    console.log('User data:', userData); // Debug log

                    if (userData && userData.referralCode) {
                        // Display referral code
                        referralCodeElement.textContent = userData.referralCode;
                        console.log('Referral code:', userData.referralCode); // Debug log

                        // Display total invites
                        const inviteCount = userData.referralCount || 0;
                        totalInvitesElement.textContent = inviteCount;

                        // Calculate and display total rewards
                        const rewardsPerReferral = 50; // $50 per referral
                        const totalRewards = inviteCount * rewardsPerReferral;
                        totalRewardsElement.textContent = `$${totalRewards}`;

                        // Fetch and display referrals
                        const inviteDoc = await window.db.collection('invitation_codes')
                            .doc(userData.referralCode)
                            .get();

                        if (inviteDoc.exists) {
                            const inviteData = inviteDoc.data();
                            console.log('Invite data:', inviteData); // Debug log

                            if (inviteData.usedBy && inviteData.usedBy.length > 0) {
                                // Get referral details
                                const referralPromises = inviteData.usedBy.map(async (userId) => {
                                    try {
                                        const referralDoc = await window.db.collection('users').doc(userId).get();
                                        if (referralDoc.exists) {
                                            const referralData = referralDoc.data();
                                            return {
                                                phone: referralData.phone,
                                                date: referralData.registrationDate
                                            };
                                        }
                                        return null;
        } catch (error) {
                                        console.error('Error fetching referral:', error);
                                        return null;
                                    }
                                });

                                const referrals = (await Promise.all(referralPromises))
                                    .filter(ref => ref !== null);

                                if (referrals.length > 0) {
                                    // Display referrals
                                    referralsListElement.innerHTML = referrals.map(referral => `
                                        <div class="referral-item">
                                            <div class="referral-phone">${maskPhone(referral.phone)}</div>
                                            <div class="referral-date">${formatDate(referral.date)}</div>
                                        </div>
                                    `).join('');
                                } else {
                                    referralsListElement.innerHTML = '<div class="referral-item">No referrals yet</div>';
                                }
                            } else {
                                referralsListElement.innerHTML = '<div class="referral-item">No referrals yet</div>';
                            }
                        }
                    } else {
                        console.error('No referral code found for user');
                        referralCodeElement.textContent = 'Error loading code';
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    referralCodeElement.textContent = 'Error loading code';
                    alert('Error loading referral data. Please try again.');
                }
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'index.html';
            }
        });

        // Copy button functionality
        copyBtn.addEventListener('click', async () => {
            const code = referralCodeElement.textContent;
            if (code && code !== 'Loading...' && code !== 'Error loading code') {
                try {
                    await navigator.clipboard.writeText(code);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Code';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy code. Please try again.');
                }
            }
        });

        // Share buttons functionality
        whatsappShare.addEventListener('click', () => {
            const code = referralCodeElement.textContent;
            if (code && code !== 'Loading...' && code !== 'Error loading code') {
                const message = `Join FE Preferred using my invitation code: ${code}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        });

        telegramShare.addEventListener('click', () => {
            const code = referralCodeElement.textContent;
            if (code && code !== 'Loading...' && code !== 'Error loading code') {
                const message = `Join FE Preferred using my invitation code: ${code}`;
                const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(message)}`;
                window.open(telegramUrl, '_blank');
            }
        });
    }

    // Helper function to mask phone number
    function maskPhone(phone) {
        if (!phone) return 'Unknown';
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1****$3');
    }

    // Helper function to format date
    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        try {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Unknown date';
        }
    }

    // Function to generate a referral code
    function generateReferralCode(userId) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return code;
    }

    // Function to ensure user has a referral code
    async function ensureReferralCode(userId) {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(userId);
        
        try {
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                throw new Error('User document not found');
            }

            const userData = userDoc.data();
            if (!userData.referralCode) {
                const referralCode = generateReferralCode(userId);
                await userRef.update({
                    referralCode: referralCode
                });
                return referralCode;
            }
            return userData.referralCode;
        } catch (error) {
            console.error('Error ensuring referral code:', error);
            throw error;
        }
    }

    // Initialize invite page
    async function initializeInvitePage() {
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            try {
                // Ensure user has a referral code
                const referralCode = await ensureReferralCode(user.uid);
                
                // Get user's referral data
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                
                // Update UI with referral code
                const referralCodeElement = document.getElementById('referralCode');
                if (referralCodeElement) {
                    referralCodeElement.textContent = referralCode;
                }

                // Get referral statistics
                const referralsSnapshot = await db.collection('users')
                    .where('referredBy', '==', user.uid)
                    .get();

                const totalReferrals = referralsSnapshot.size;
                const activeReferrals = referralsSnapshot.docs.filter(doc => 
                    doc.data().status === 'active'
                ).length;

                // Calculate total rewards (assuming $50 per active referral)
                const rewardsPerReferral = 50;
                const totalRewards = activeReferrals * rewardsPerReferral;

                // Update statistics in UI
                const totalInvitesElement = document.getElementById('totalInvites');
                const totalRewardsElement = document.getElementById('totalRewards');
                const referralsListElement = document.getElementById('referralsList');
                
                if (totalInvitesElement) {
                    totalInvitesElement.textContent = totalReferrals;
                }
                if (totalRewardsElement) {
                    totalRewardsElement.textContent = `$${totalRewards.toLocaleString()}`;
                }

                // Display referrals list
                if (referralsListElement) {
                    if (totalReferrals > 0) {
                        const referralsList = referralsSnapshot.docs.map(doc => {
                            const referralData = doc.data();
                            return `
                                <div class="referral-item">
                                    <div class="referral-info">
                                        <div class="referral-phone">${maskPhone(referralData.phone)}</div>
                                        <div class="referral-date">${formatDate(referralData.registrationDate)}</div>
                                        <div class="referral-status ${referralData.status === 'active' ? 'active' : 'inactive'}">
                                            ${referralData.status === 'active' ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                        referralsListElement.innerHTML = referralsList;
                    } else {
                        referralsListElement.innerHTML = '<div class="referral-item">No referrals yet</div>';
                    }
                }

                // Generate and display referral link
                const referralLink = `${window.location.origin}/register.html?ref=${referralCode}`;
                const referralLinkElement = document.getElementById('referralLink');
                if (referralLinkElement) {
                    referralLinkElement.value = referralLink;
                }

            } catch (error) {
                console.error('Error initializing invite page:', error);
                // Show error message to user
                const errorElement = document.getElementById('errorMessage');
                if (errorElement) {
                    errorElement.textContent = 'Error loading referral information. Please try again.';
                    errorElement.style.display = 'block';
                }
            }
        });
    }

    // Function to copy referral link
    function copyReferralLink() {
        const referralLink = document.getElementById('referralLink');
        if (referralLink) {
            referralLink.select();
            document.execCommand('copy');
            
            // Show success message
            const copyMessage = document.getElementById('copyMessage');
            if (copyMessage) {
                copyMessage.style.display = 'block';
                setTimeout(() => {
                    copyMessage.style.display = 'none';
                }, 2000);
            }
        }
    }

    // Start the page initialization
    initializeInvitePage();
}); 
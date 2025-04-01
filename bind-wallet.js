document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase (assuming firebase-config.js is already loaded)
    const walletAddressInput = document.getElementById('walletAddress');
    const walletNetworkSelect = document.getElementById('walletNetwork');
    const remarkInput = document.getElementById('remark');
    const confirmButton = document.getElementById('confirmButton');

    // Function to validate wallet address based on network
    function validateWalletAddress(address, network) {
        if (!address) return false;
        
        // Basic validation patterns for different networks
        const patterns = {
            'TRC20': /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
            'BEP20': /^0x[a-fA-F0-9]{40}$/,
            'ERC20': /^0x[a-fA-F0-9]{40}$/
        };

        return patterns[network] ? patterns[network].test(address) : false;
    }

    // Function to update confirm button state
    function updateConfirmButton() {
        const address = walletAddressInput.value.trim();
        const network = walletNetworkSelect.value;
        const isValid = validateWalletAddress(address, network);
        confirmButton.disabled = !isValid;
    }

    // Add event listeners for validation
    walletAddressInput.addEventListener('input', updateConfirmButton);
    walletNetworkSelect.addEventListener('change', updateConfirmButton);

    // Handle form submission
    confirmButton.addEventListener('click', async function() {
        const address = walletAddressInput.value.trim();
        const network = walletNetworkSelect.value;
        const remark = remarkInput.value.trim();

        if (!validateWalletAddress(address, network)) {
            alert('Please enter a valid wallet address for the selected network');
            return;
        }

        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            // Update user's wallet information
            await firebase.firestore().collection('users').doc(user.uid).update({
                walletAddress: address,
                walletNetwork: network,
                walletRemark: remark,
                walletUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Wallet address bound successfully!');
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Error binding wallet:', error);
            alert('Failed to bind wallet address. Please try again.');
        }
    });

    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Load existing wallet information if any
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.walletAddress) {
                        walletAddressInput.value = data.walletAddress;
                        walletNetworkSelect.value = data.walletNetwork || '';
                        remarkInput.value = data.walletRemark || '';
                        updateConfirmButton();
                    }
                }
            })
            .catch(error => {
                console.error('Error loading wallet information:', error);
            });
    });
}); 
async function handleDepositSubmit() {
    try {
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const transactionHash = document.getElementById('transactionHash').value;
        const userId = firebase.auth().currentUser.uid;

        if (!amount || amount <= 0) {
            showError('Please enter a valid amount');
            return;
        }

        if (!transactionHash) {
            showError('Please enter your transaction hash');
            return;
        }

        const depositRef = firebase.firestore().collection('deposits').doc();
        await depositRef.set({
            userId: userId,
            amount: amount,
            paymentMethod: paymentMethod,
            transactionHash: transactionHash,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccess('Deposit request submitted successfully');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    } catch (error) {
        console.error('Error submitting deposit:', error);
        showError('Failed to submit deposit request');
    }
} 
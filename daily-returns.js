// Function to calculate daily return amount
function calculateDailyReturn(investment) {
    const dailyReturnRate = investment.dailyReturn / 100;
    return investment.amount * dailyReturnRate;
}

// Function to process daily returns for an investment
async function processDailyReturn(investment) {
    const db = firebase.firestore();
    const dailyReturnAmount = calculateDailyReturn(investment);

    try {
        await db.runTransaction(async (transaction) => {
            // Get user's current balance
            const balanceRef = db.collection('user_balances').doc(investment.userId);
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.exists ? balanceDoc.data().balance : 0;

            // Update user's balance with daily return
            transaction.set(balanceRef, {
                balance: currentBalance + dailyReturnAmount
            }, { merge: true });

            // Add transaction record for daily return
            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId: investment.userId,
                type: 'daily_return',
                amount: dailyReturnAmount,
                status: 'completed',
                description: `Daily return from ${investment.productName}`,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update last return date
            const investmentRef = db.collection('investments').doc(investment.id);
            transaction.update(investmentRef, {
                lastReturnDate: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        console.log(`Processed daily return of $${dailyReturnAmount.toFixed(2)} for investment ${investment.id}`);
    } catch (error) {
        console.error('Error processing daily return:', error);
    }
}

// Function to check and process all active investments
async function checkAndProcessDailyReturns() {
    const db = firebase.firestore();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
        // Get all active investments
        const investmentsSnapshot = await db.collection('investments')
            .where('status', '==', 'active')
            .get();

        const processingPromises = [];

        investmentsSnapshot.forEach(doc => {
            const investment = { id: doc.id, ...doc.data() };
            const lastReturnDate = investment.lastReturnDate ? investment.lastReturnDate.toDate() : null;

            // Process if no last return date or if 24 hours have passed
            if (!lastReturnDate || lastReturnDate < oneDayAgo) {
                processingPromises.push(processDailyReturn(investment));
            }
        });

        // Wait for all processing to complete
        await Promise.all(processingPromises);
        console.log('Daily returns processing completed');
    } catch (error) {
        console.error('Error checking daily returns:', error);
    }
}

// Function to start the daily returns processing system
function startDailyReturnsSystem() {
    // Process immediately on start
    checkAndProcessDailyReturns();

    // Then process every hour to ensure we don't miss any returns
    setInterval(checkAndProcessDailyReturns, 60 * 60 * 1000);
}

// Start the system when the script loads
startDailyReturnsSystem(); 
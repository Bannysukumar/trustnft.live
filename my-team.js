document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Stats update handling (for demo purposes)
    const updateStats = () => {
        const teamSize = document.querySelector('.stat-value').textContent;
        const newMembers = document.querySelector('.stat-value.positive').textContent;
        console.log(`Team size: ${teamSize}, New members: ${newMembers}`);
    };

    // Table row click handling
    const tableRows = document.querySelectorAll('.ranking-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('click', function() {
            const phoneNumber = this.querySelector('td:nth-child(2)').textContent;
            alert(`Member details for ${phoneNumber} coming soon!`);
        });
    });

    // Initial stats update
    updateStats();
}); 
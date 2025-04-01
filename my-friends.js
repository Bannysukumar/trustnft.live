document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Invitation code button handling
    const invitationButton = document.querySelector('.invitation-button');
    invitationButton.addEventListener('click', function() {
        const code = document.querySelector('.invitation-code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            alert('Invitation code copied to clipboard!');
        }).catch(err => {
            alert('Failed to copy invitation code');
        });
    });

    // Level item click handling
    const levelItems = document.querySelectorAll('.level-item');
    levelItems.forEach(item => {
        item.addEventListener('click', function() {
            const level = this.querySelector('.level-info span').textContent;
            alert(`${level} details coming soon!`);
        });
    });
}); 
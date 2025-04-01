document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });
});

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        // Add logout logic here
        window.location.href = 'login.html';
    }
} 
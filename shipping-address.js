document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Add shipping address button
    const addButton = document.querySelector('.add-button');
    addButton.addEventListener('click', function() {
        window.location.href = 'add-shipping-address.html';
    });
}); 
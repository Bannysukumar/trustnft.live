// Global variables
let recaptchaVerifier;
let verificationId = null;
let userPhone = null;

// Function to initialize reCAPTCHA
function initializeRecaptcha() {
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: function() {
            // reCAPTCHA solved
        }
    });
}

// Show message function
function showMessage(message, isError = false) {
    // Remove any existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;

    // Insert at the top of the container
    const container = document.querySelector('.forgot-password-container');
    container.insertBefore(messageDiv, container.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => messageDiv.remove(), 5000);
}

// Format phone number to international format
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add India country code if not present
    if (!cleaned.startsWith('91')) {
        cleaned = '91' + cleaned;
    }
    
    return '+' + cleaned;
}

// Function to send verification code
window.sendVerificationCode = async function() {
    try {
        const phoneNumber = document.getElementById('phone').value.trim();
        
        // Validate phone number format
        if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
            alert('Please enter a valid phone number with country code (e.g., +1234567890)');
            return;
        }

        // Initialize reCAPTCHA if not already initialized
        if (!recaptchaVerifier) {
            initializeRecaptcha();
        }

        // Show loading state
        const submitButton = document.querySelector('.submit-button');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        // Send verification code
        const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
        
        // Store the confirmation result
        window.confirmationResult = confirmationResult;

        // Show verification section
        document.getElementById('phoneSection').style.display = 'none';
        document.getElementById('verificationSection').style.display = 'block';
        
        // Show success message
        showMessage('Verification code sent successfully!', 'success');
        
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;

    } catch (error) {
        console.error('Error sending verification code:', error);
        
        // Show error message
        let errorMessage = 'Error sending verification code. Please try again.';
        if (error.code === 'auth/invalid-phone-number') {
            errorMessage = 'Invalid phone number format. Please include country code.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Please try again later.';
        }
        showMessage(errorMessage, 'error');

        // Reset button state
        const submitButton = document.querySelector('.submit-button');
        submitButton.textContent = 'Send Code';
        submitButton.disabled = false;
    }
};

// Function to verify code
window.verifyCode = async function() {
    try {
        const verificationCode = document.getElementById('verificationCode').value.trim();
        
        if (!verificationCode) {
            showMessage('Please enter the verification code', 'error');
            return;
        }

        // Show loading state
        const submitButton = document.querySelector('.submit-button');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Verifying...';
        submitButton.disabled = true;

        // Verify the code
        const result = await window.confirmationResult.confirm(verificationCode);
        
        // Show new password section
        document.getElementById('verificationSection').style.display = 'none';
        document.getElementById('newPasswordSection').style.display = 'block';
        
        // Show success message
        showMessage('Code verified successfully!', 'success');

        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;

    } catch (error) {
        console.error('Error verifying code:', error);
        
        // Show error message
        let errorMessage = 'Error verifying code. Please try again.';
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = 'Invalid verification code. Please try again.';
        }
        showMessage(errorMessage, 'error');

        // Reset button state
        const submitButton = document.querySelector('.submit-button');
        submitButton.textContent = 'Verify Code';
        submitButton.disabled = false;
    }
};

// Function to reset password
window.resetPassword = async function() {
    try {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords
        if (!newPassword || !confirmPassword) {
            showMessage('Please enter both passwords', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        // Show loading state
        const submitButton = document.querySelector('.submit-button');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Resetting...';
        submitButton.disabled = true;

        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('No user found');
        }

        // Update password
        await user.updatePassword(newPassword);

        // Show success message
        showMessage('Password reset successfully!', 'success');

        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Error resetting password:', error);
        
        // Show error message
        let errorMessage = 'Error resetting password. Please try again.';
        if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
        showMessage(errorMessage, 'error');

        // Reset button state
        const submitButton = document.querySelector('.submit-button');
        submitButton.textContent = 'Reset Password';
        submitButton.disabled = false;
    }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeRecaptcha();
}); 
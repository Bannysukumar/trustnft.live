// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCPtS5SCfykfe9RMA_You8r34JqCg8S3pE",
    authDomain: "trustnft-a9753.firebaseapp.com",
    projectId: "trustnft-a9753",
    storageBucket: "trustnft-a9753.firebasestorage.app",
    messagingSenderId: "1020424008186",
    appId: "1:1020424008186:web:342913658ddd7fa2de3443",
    measurementId: "G-6MEKX72Z0B"
};

// Initialize Firebase
try {
    // Initialize Firebase app if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Make services available globally
    window.auth = auth;
    window.db = db;
    window.firebase = firebase;

    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

// Make sure Firebase is initialized before using it
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        alert('Error: Firebase SDK not loaded. Please check your internet connection and refresh the page.');
        return;
    }

    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        alert('Error: Firebase not initialized. Please refresh the page.');
        return;
    }

    console.log('Firebase is ready to use');
}); 
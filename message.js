document.addEventListener('DOMContentLoaded', function() {
    // Back button handling
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Tab switching and content loading
    const tabs = document.querySelectorAll('.tab');
    const messageList = document.querySelector('.message-list');

    // Function to load messages based on type
    async function loadMessages(type) {
        try {
            const messagesRef = db.collection('messages')
                .where('type', '==', type.toLowerCase())
                .orderBy('date', 'desc');
            
            const snapshot = await messagesRef.get();
            messageList.innerHTML = ''; // Clear existing messages

            snapshot.forEach(doc => {
                const message = doc.data();
                const messageHtml = createMessageElement(message);
                messageList.innerHTML += messageHtml;
            });

            // Add click handlers to new messages
            addMessageClickHandlers();
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    }

    // Function to create message HTML
    function createMessageElement(message) {
        const imagesHtml = message.images ? 
            `<div class="message-images">
                ${message.images.map(img => `<img src="${img}" alt="Message image">`).join('')}
            </div>` :
            message.image ? 
            `<img src="${message.image}" alt="Message image" class="single-image">` : '';

        return `
            <div class="message-item" data-id="${message.id}">
                ${imagesHtml}
                <div class="message-content">
                    <h3>${message.title}</h3>
                    <p>${message.preview}</p>
                    <span class="date">${formatDate(message.date)}</span>
                </div>
            </div>
        `;
    }

    // Format date function
    function formatDate(timestamp) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }

    // Add click handlers to messages
    function addMessageClickHandlers() {
        const messageItems = document.querySelectorAll('.message-item');
        messageItems.forEach(item => {
            item.addEventListener('click', async function() {
                const messageId = this.dataset.id;
                try {
                    const messageDoc = await db.collection('messages').doc(messageId).get();
                    if (messageDoc.exists) {
                        const messageData = messageDoc.data();
                        // Handle message click - could navigate to detail view
                        console.log('Message clicked:', messageData);
                    }
                } catch (error) {
                    console.error("Error fetching message details:", error);
                }
            });
        });
    }

    // Tab click handlers
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const type = this.textContent; // "Information" or "Notice"
            loadMessages(type);
        });
    });

    // Load initial messages (Information tab)
    loadMessages('information');
}); 
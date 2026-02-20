class ChatBot {
    constructor() {
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        this.fileInput = document.getElementById('fileInput');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        this.uploadedFiles = document.getElementById('uploadedFiles');

        // New UI Elements
        this.mainContent = document.getElementById('mainContent');
        this.chatMessages = document.getElementById('chatMessages');
        this.loadingContainer = document.getElementById('loadingContainer');
        this.loadingText = document.getElementById('loadingText');
        this.outlineContainer = document.getElementById('outlineContainer');
        this.outlineList = document.getElementById('outlineList');
        this.btnBuildPPT = document.getElementById('btnBuildPPT');

        this.uploadedFilesList = [];
        this.isProcessing = false;
        this.conversationContext = [];

        // Dynamic loading messages
        this.loadingMessages = [
            "Analyzing prompt...",
            "Structuring outline...",
            "Fetching custom graphics...",
            "Rendering slides..."
        ];
        this.loadingInterval = null;

        // Store LLM outline response
        this.currentOutlineData = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSendButton();
    }


    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.generateOutline();
        });

        // Enter key in textarea
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.generateOutline();
            }
        });

        // Text input changes
        this.textInput.addEventListener('input', () => {
            this.updateSendButton();
        });

        // Slide Count toggle Custom
        const lengthSelect = document.getElementById('lengthSelect');
        const customContainer = document.getElementById('customLengthContainer');
        if (lengthSelect && customContainer) {
            lengthSelect.addEventListener('change', (e) => {
                if (e.target.value === 'Custom') {
                    customContainer.classList.remove('hidden');
                } else {
                    customContainer.classList.add('hidden');
                }
            });
        }

        // Build PPT Button
        if (this.btnBuildPPT) {
            this.btnBuildPPT.addEventListener('click', (e) => {
                e.preventDefault();
                this.buildPPT();
            });
        }

        // File upload area click
        this.fileUploadArea.addEventListener('click', (e) => {
            // e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files);
            }
        });

        // Drag and drop events
        this.fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.fileUploadArea.classList.add('drag-over');
        });

        this.fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.fileUploadArea.contains(e.relatedTarget)) {
                this.fileUploadArea.classList.remove('drag-over');
            }
        });

        this.fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.fileUploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files);
            }
        });

        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    // Removed adjustTextareaHeight and showWelcomeMessage as they are not needed in Bento Box

    updateSendButton() {
        const hasText = this.textInput.value.trim().length > 0;
        const hasFiles = this.uploadedFilesList.length > 0;
        const canSend = (hasText || hasFiles) && !this.isProcessing;

        this.sendButton.disabled = !canSend;

        if (canSend) {
            this.sendButton.style.opacity = '1';
            this.sendButton.style.cursor = 'pointer';
        } else {
            this.sendButton.style.opacity = '0.5';
            this.sendButton.style.cursor = 'not-allowed';
        }
    }

    handleFileSelect(files) {
        const validFiles = [];

        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        });

        if (validFiles.length > 0) {
            validFiles.forEach(file => {
                this.uploadedFilesList.push(file);
                this.displayUploadedFile(file);
            });
            this.updateSendButton();
        }

        // Reset file input
        this.fileInput.value = '';
    }

    validateFile(file) {
        const validExtensions = ['.ppt', '.pptx'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        const hasValidExtension = validExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
            this.showError('Please upload only PowerPoint files (.ppt, .pptx)');
            return false;
        }

        if (file.size > maxSize) {
            this.showError('File size must be less than 50MB');
            return false;
        }

        // Check for duplicates
        if (this.uploadedFilesList.some(f => f.name === file.name && f.size === file.size)) {
            this.showError('This file has already been uploaded');
            return false;
        }

        return true;
    }

    displayUploadedFile(file) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'uploaded-file';
        fileDiv.setAttribute('data-file-name', file.name);
        fileDiv.setAttribute('data-file-size', file.size);
        fileDiv.innerHTML = `
            <div class="file-details">
                <div class="file-icon">
                    <i class="ph-fill ph-file-ppt" style="font-size: 24px; color: var(--primary);"></i>
                </div>
                <div>
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <button class="remove-file" type="button">
                <i class="ph-bold ph-x"></i>
            </button>
        `;

        const removeButton = fileDiv.querySelector('.remove-file');
        removeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.removeFile(file.name, file.size);
        });

        this.uploadedFiles.appendChild(fileDiv);
    }

    removeFile(fileName, fileSize) {
        this.uploadedFilesList = this.uploadedFilesList.filter(f =>
            !(f.name === fileName && f.size === fileSize)
        );

        const fileElement = this.uploadedFiles.querySelector(
            `[data-file-name="${fileName}"][data-file-size="${fileSize}"]`
        );
        if (fileElement) {
            fileElement.remove();
        }

        this.updateSendButton();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    startLoading() {
        this.mainContent.classList.add('hidden');
        this.loadingContainer.classList.remove('hidden');
        this.outlineContainer.classList.add('hidden');

        let msgIndex = 0;
        this.loadingText.textContent = this.loadingMessages[0];

        this.loadingInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % this.loadingMessages.length;
            this.loadingText.textContent = this.loadingMessages[msgIndex];
        }, 2500);
    }

    stopLoading() {
        clearInterval(this.loadingInterval);
        this.loadingContainer.classList.add('hidden');
    }

    async generateOutline() {
        if (this.isProcessing) return;

        const text = this.textInput.value.trim();
        const hasFiles = this.uploadedFilesList.length > 0;

        if (!text && !hasFiles) return;

        this.isProcessing = true;
        this.updateSendButton();

        if (text) {
            this.addUserMessage(text);
            this.conversationContext.push({ role: "User", content: text });
        }

        if (hasFiles) {
            const fileMessage = `📎 Uploaded ${this.uploadedFilesList.length} file(s): ${this.uploadedFilesList.map(f => f.name).join(', ')}`;
            this.addUserMessage(fileMessage);
        }

        this.textInput.value = '';
        this.showTypingIndicator();

        try {
            const formData = new FormData();

            let fullPrompt = "";
            if (this.conversationContext.length > 0) {
                fullPrompt = this.conversationContext.map(msg => `${msg.role}: ${msg.content}`).join("\n\n");
            } else if (text) {
                fullPrompt = text;
            }

            if (fullPrompt) formData.append("text", fullPrompt);

            this.uploadedFilesList.forEach((file) => formData.append("files[]", file));

            const apiKey = document.getElementById("apiKeyInput")?.value || "";
            let slideLength = document.getElementById("lengthSelect")?.value || "Medium (6-10)";

            if (slideLength === 'Custom') {
                const customVal = document.getElementById("customLengthInput")?.value;
                if (customVal && parseInt(customVal) > 0) {
                    slideLength = customVal.trim();
                } else {
                    throw new Error("Please enter a valid number for custom slide count.");
                }
            }

            formData.append("slide_length", slideLength);
            formData.append("api_key", apiKey);

            const response = await fetch("/api/generate_outline", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Failed to process request.");

            const data = await response.json();

            this.hideTypingIndicator();

            if (data.type === "presentation" && data.data && data.data.slides) {
                this.conversationContext = [];
                this.chatMessages.innerHTML = ''; // Keep it clean for next time 
                this.currentOutlineData = data.data;
                this.renderOutlineUI(data.data.slides);
            } else if (data.type === "question") {
                const msgContainer = this.addBotMessage("I need a bit more detail to create the perfect presentation. Could you clarify?");

                let botQuestionText = "I need a bit more detail. ";
                if (data.questions && data.questions.length > 0) {
                    botQuestionText += data.questions.join("\n");
                }
                this.conversationContext.push({ role: "Assistant", content: botQuestionText });

                // Add suggestion chips
                if (data.questions && data.questions.length > 0) {
                    const chipsContainer = document.createElement("div");
                    chipsContainer.className = "suggestion-chips";

                    data.questions.forEach(q => {
                        const btn = document.createElement("button");
                        btn.className = "suggestion-btn";
                        btn.textContent = q;
                        btn.onclick = () => {
                            this.textInput.value = q;
                            this.generateOutline();
                        };
                        chipsContainer.appendChild(btn);
                    });

                    msgContainer.querySelector('.message.bot-message').appendChild(chipsContainer);
                }
                this.scrollToBottom();
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error("Unknown response from server");
            }

        } catch (err) {
            this.hideTypingIndicator();
            if (err.message.includes("Failed to fetch")) {
                this.showError("Network Error: Could not connect to the server. If you are running locally, ensure 'python app.py' is running. If hosted, the server might have timed out (e.g. YouTube fetching took too long).");
            } else {
                this.showError(err.message || "An error occurred");
            }
        }

        this.isProcessing = false;
        this.updateSendButton();
    }

    renderOutlineUI(slides) {
        this.mainContent.classList.add('hidden');
        this.outlineContainer.classList.remove('hidden');
        this.outlineList.innerHTML = '';

        slides.forEach((slide, index) => {
            const card = document.createElement('div');
            card.className = 'outline-card';
            card.dataset.index = index;

            card.innerHTML = `
                <div class="drag-handle"><i class="ph ph-dots-six-vertical"></i></div>
                <div class="card-content">
                    <span class="slide-number">Slide ${index + 1} - ${slide.layout}</span>
                    <input type="text" class="slide-title-input" value="${this.escapeHtml(slide.title)}" />
                </div>
            `;
            this.outlineList.appendChild(card);
        });

        // Initialize SortableJS
        if (window.Sortable) {
            new Sortable(this.outlineList, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    this.updateSlideNumbers();
                }
            });
        }
    }

    updateSlideNumbers() {
        const cards = this.outlineList.querySelectorAll('.outline-card');
        cards.forEach((card, index) => {
            const numSpan = card.querySelector('.slide-number');
            // Assuming layout text is preserved in the span text... simple extraction for now
            const parts = numSpan.textContent.split('-');
            const layoutText = parts.length > 1 ? parts[1].trim() : "content";
            numSpan.textContent = `Slide ${index + 1} - ${layoutText}`;
        });
    }

    async buildPPT() {
        if (!this.currentOutlineData) return;

        // Rebuild slides array based on DOM order and edited titles
        const newSlides = [];
        const cards = this.outlineList.querySelectorAll('.outline-card');

        cards.forEach(card => {
            const originalIndex = parseInt(card.dataset.index);
            const titleInput = card.querySelector('.slide-title-input').value;

            // Clone original slide data
            const slideData = JSON.parse(JSON.stringify(this.currentOutlineData.slides[originalIndex]));
            slideData.title = titleInput;
            newSlides.push(slideData);
        });

        this.currentOutlineData.slides = newSlides;

        this.startLoading();
        this.loadingText.textContent = "Compiling PPTX File...";

        try {
            const formData = new FormData();
            formData.append("data", JSON.stringify(this.currentOutlineData));

            const themeColor = document.getElementById("themeSelect")?.value || "2980b9";
            formData.append("theme_color", themeColor);

            const response = await fetch("/api/generate_ppt", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Failed to generate PPT.");

            const blob = await response.blob();
            this.downloadFile(blob);

            // Reset UI
            this.stopLoading();
            this.outlineContainer.classList.add('hidden');
            this.mainContent.classList.remove('hidden');
            this.textInput.value = '';
            this.clearUploadedFiles();

        } catch (err) {
            this.stopLoading();
            alert(err.message || "Failed to generate PPT");
        }
    }

    showTypingIndicator() {
        if (!this.typingIndicatorElement) {
            this.typingIndicatorElement = document.createElement('div');
            this.typingIndicatorElement.className = 'typing-indicator';
            this.typingIndicatorElement.innerHTML = `
                <div class="bot-avatar glass-avatar" style="background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px var(--primary-glow);">
                    <i class="ph-fill ph-robot" style="font-size: 18px;"></i>
                </div>
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            `;
        }
        this.chatMessages.appendChild(this.typingIndicatorElement);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicatorElement && this.typingIndicatorElement.parentNode) {
            this.typingIndicatorElement.parentNode.removeChild(this.typingIndicatorElement);
        }
    }

    addUserMessage(text) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container user-message-container';

        messageContainer.innerHTML = `
            <div class="message-wrapper">
                <div class="message-avatar user-avatar" style="background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
                    <i class="ph-fill ph-user" style="font-size: 18px;"></i>
                </div>
                <div class="message user-message">${this.escapeHtml(text)}</div>
            </div>
            <div class="timestamp">${this.formatTime(new Date())}</div>
        `;

        this.chatMessages.appendChild(messageContainer);
        this.scrollToBottom();
    }

    addBotMessage(text) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container bot-message-container';

        messageContainer.innerHTML = `
        <div class="message-wrapper">
            <div class="bot-avatar glass-avatar" style="background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px var(--primary-glow);">
                <i class="ph-fill ph-robot" style="font-size: 18px;"></i>
            </div>
            <div class="message bot-message">
                ${this.escapeHtml(text)}
            </div>
        </div>
        <div class="timestamp">${this.formatTime(new Date())}</div>
        `;

        this.chatMessages.appendChild(messageContainer);
        this.scrollToBottom();
        return messageContainer;
    }

    showError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'message-container bot-message-container';
        errorContainer.innerHTML = `
            <div class="message-wrapper">
                <div class="bot-avatar glass-avatar" style="background: var(--accent); color: white; display: flex; align-items: center; justify-content: center;">
                    <i class="ph-fill ph-warning-circle" style="font-size: 18px;"></i>
                </div>
                <div class="message bot-message" style="color: var(--color-error); border-color: rgba(var(--color-error-rgb), 0.3);">
                    ${this.escapeHtml(message)}
                </div>
            </div>
            <div class="timestamp">${this.formatTime(new Date())}</div>
        `;

        this.chatMessages.appendChild(errorContainer);
        this.scrollToBottom();

        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.remove();
            }
        }, 5000);
    }

    downloadFile(blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "presentation.pptx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }

    clearUploadedFiles() {
        this.uploadedFilesList = [];
        if (this.uploadedFiles) {
            this.uploadedFiles.innerHTML = '';
        }
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            if (this.chatMessages) {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }, 50);
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    delay(ms) {
        // return new Promise(resolve => setTimeout(resolve, ms));
    }
}

let chatBot;
document.addEventListener('DOMContentLoaded', () => {
    chatBot = new ChatBot();
});
class ChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        this.fileInput = document.getElementById('fileInput');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        this.uploadedFiles = document.getElementById('uploadedFiles');
        this.typingIndicator = document.getElementById('typingIndicator');

        this.uploadedFilesList = [];
        this.isProcessing = false;
        this.conversationContext = [];

        this.botResponses = [
            "I've received your request. Let me process your presentation...",
            "Working on enhancing your PowerPoint presentation...",
            "Almost done! Applying final touches to your slides...",
            "Your presentation is ready! Click the download button below to get your enhanced PowerPoint file."
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showWelcomeMessage();
        this.updateSendButton();
    }


    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Enter key in textarea
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Text input changes
        this.textInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
            this.updateSendButton();
        });

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

    showWelcomeMessage() {
        const welcomeMessage = "Hello! I'm your PowerPoint assistant. I can help you create or enhance presentations. You can upload an existing PPT file, provide text instructions, or both. How can I help you today?";
        this.addBotMessage(null, welcomeMessage);
    }

    adjustTextareaHeight() {
        this.textInput.style.height = 'auto';
        const newHeight = Math.min(this.textInput.scrollHeight, 120);
        this.textInput.style.height = newHeight + 'px';
    }

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

    async sendMessage() {
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
            const fileMessage = `📎 Uploaded ${this.uploadedFilesList.length} file(s): ${this.uploadedFilesList.map(f => f.name).join(', ')
                }`;
            this.addUserMessage(fileMessage);
        }

        this.textInput.value = '';
        this.adjustTextareaHeight();

        await this.processRequest(text, this.uploadedFilesList);

        this.isProcessing = false;
        this.updateSendButton();
    }

    async processRequest(text, files) {
        this.showTypingIndicator();

        try {
            const formData = new FormData();

            // Construct context-aware prompt
            // Join all previous context + current file info if needed
            let fullPrompt = "";

            if (this.conversationContext.length > 0) {
                fullPrompt = this.conversationContext.map(msg => `${msg.role}: ${msg.content}`).join("\n\n");
            } else if (text) {
                fullPrompt = text;
            }

            if (fullPrompt) formData.append("text", fullPrompt);

            files.forEach((file) => formData.append("files[]", file));
            const apiKey = document.getElementById("apiKeyInput")?.value || "";

            // Get theme color from selector
            const themeColor = document.getElementById("themeSelect")?.value || "2980b9";
            formData.append("theme_color", themeColor);

            // Get slide length from selector
            const slideLength = document.getElementById("lengthSelect")?.value || "Medium (6-10)";
            formData.append("slide_length", slideLength);

            formData.append("api_key", apiKey);
            const response = await fetch("/process", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Failed to process request. Please try again.");

            const contentType = response.headers.get("content-type");
            // Check if response is JSON (question) or blob (PPT file)
            if (contentType && contentType.includes("application/json")) {
                // LLM is asking a question or error
                const data = await response.json();
                this.hideTypingIndicator();

                if (data.type === "question") {
                    this.addBotMessage(null, "I need a bit more detail to create the perfect presentation. Could you clarify?", false);

                    // Add bot question to context
                    let botQuestionText = "I need a bit more detail. ";
                    if (data.questions && data.questions.length > 0) {
                        botQuestionText += data.questions.join("\n");
                    }
                    this.conversationContext.push({ role: "Assistant", content: botQuestionText });

                    // Add suggestion chips
                    if (data.questions && data.questions.length > 0) {
                        const chipsContainer = document.createElement("div");
                        chipsContainer.className = "suggestion-chips";
                        chipsContainer.style.display = "flex";
                        chipsContainer.style.flexWrap = "wrap";
                        chipsContainer.style.gap = "8px";
                        chipsContainer.style.marginTop = "12px";

                        data.questions.forEach(q => {
                            const btn = document.createElement("button");
                            btn.className = "suggestion-btn";
                            btn.textContent = q;
                            btn.style.padding = "8px 16px";
                            btn.style.borderRadius = "20px";
                            btn.style.border = "1px solid var(--primary)";
                            btn.style.background = "rgba(41, 128, 185, 0.1)";
                            btn.style.color = "var(--primary)";
                            btn.style.cursor = "pointer";
                            btn.style.fontSize = "13px";
                            btn.style.transition = "all 0.2s";

                            btn.onmouseover = () => {
                                btn.style.background = "var(--primary)";
                                btn.style.color = "white";
                            };
                            btn.onmouseout = () => {
                                btn.style.background = "rgba(41, 128, 185, 0.1)";
                                btn.style.color = "var(--primary)";
                            };

                            btn.onclick = () => {
                                this.textInput.value = q;
                                this.sendMessage();
                            };
                            chipsContainer.appendChild(btn);
                        });

                        // Append to the last bot message
                        const lastMsg = this.chatMessages.lastElementChild.querySelector('.message.bot-message');
                        if (lastMsg) lastMsg.appendChild(chipsContainer);
                    }

                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error("Unknown response from server");
                }
            } else {
                // Normal PPT download
                const result = await response.blob();
                this.hideTypingIndicator();
                this.addBotMessage(result, "Your presentation has been processed!", true);
                // Clear context on successful generation
                this.conversationContext = [];
            }

        } catch (err) {
            this.hideTypingIndicator();
            this.showError(err.message || "An error occurred");
        }

        this.clearUploadedFiles();
    }

    showTypingIndicator() {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
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

    addBotMessage(result, text, includeDownload = false) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container bot-message-container';

        // Main message HTML
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

        // Add download button if needed
        if (includeDownload && result) {
            const btn = document.createElement('button');
            btn.className = 'download-button';
            btn.type = 'button';
            btn.innerHTML = `
            <i class="ph-bold ph-download-simple" style="font-size: 18px;"></i>
            Download Enhanced PPT
        `;
            btn.addEventListener('click', () => this.downloadFile(result));
            messageContainer.querySelector('.message.bot-message').appendChild(btn);
        }
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
        this.uploadedFiles.innerHTML = '';
        this.fileInput.value = '';
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

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
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
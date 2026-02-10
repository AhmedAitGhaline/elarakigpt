class ElarakiGPT {
    constructor() {
        this.conversation = [];
        this.isLoading = false;
        this.captchaVerified = false;
        this.captchaText = '';
        
        // Éléments DOM
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.aboutBtn = document.getElementById('about-btn');
        this.contactBtn = document.getElementById('contact-btn');
        this.aboutModal = document.getElementById('about-modal');
        this.contactModal = document.getElementById('contact-modal');
        this.captchaModal = document.getElementById('captcha-modal');
        this.closeAboutModal = document.getElementById('close-about-modal');
        this.closeContactModal = document.getElementById('close-contact-modal');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.welcomeSection = document.getElementById('welcome-section');
        this.chatContainer = document.getElementById('chat-container');
        this.quickActions = document.getElementById('quick-actions');
        this.statusText = document.getElementById('status-text');
        
        // Sidebar
        this.conversationsSidebar = document.getElementById('conversations-sidebar');
        this.conversationsList = document.getElementById('conversations-list');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.toggleSidebar = document.getElementById('toggle-sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.menuToggleBtn = document.getElementById('menu-toggle-btn');
        
        // Mode Sombre
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        
        // CAPTCHA
        this.captchaTextElement = document.getElementById('captcha-text');
        this.captchaInput = document.getElementById('captcha-input');
        this.refreshCaptchaBtn = document.getElementById('refresh-captcha');
        this.submitCaptchaBtn = document.getElementById('submit-captcha');
        this.captchaError = document.getElementById('captcha-error');
        
        // 🚀 APIS QUI MARCHENT VRAIMENT
        this.apiConfigs = [
            {
                name: "Groq",
                url: "https://api.groq.com/openai/v1/chat/completions",
                key: "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",
                models: ["llama-3.3-70b-versatile"],
                priority: 10,
                usage: 0,
                lastUsed: 0,
                status: 'untested'
            },
            {
                name: "Mistral AI",
                url: "https://api.mistral.ai/v1/chat/completions",
                key: "L24VRJ7c2wjX50xYdqxDG8UXPSFeO1mM",
                models: ["mistral-small-latest"],
                priority: 9,
                usage: 0,
                lastUsed: 0,
                status: 'untested'
            },
            {
                name: "OpenRouter",
                url: "https://openrouter.ai/api/v1/chat/completions",
                key: "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",
                models: ["openai/gpt-3.5-turbo"],
                priority: 8,
                usage: 0,
                lastUsed: 0,
                status: 'untested',
                headers: {
                    'HTTP-Referer': 'https://elaraki.ac.ma',
                    'X-Title': 'Elaraki GPT'
                }
            },
            {
                name: "Google Gemini",
                url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
                key: "AIzaSyAcxlOoyo3EHT3rvKl1TtVHyPAAheI8CUw",
                models: ["gemini-2.0-flash-exp"],
                priority: 7,
                usage: 0,
                lastUsed: 0,
                status: 'untested'
            }
        ];
        
        this.currentApiIndex = 0;
        this.currentConfig = this.apiConfigs[this.currentApiIndex];
        this.apiKey = this.currentConfig.key;
        this.apiUrl = this.currentConfig.url;
        this.model = this.currentConfig.models[0];
        
        this.workingAPIs = new Set();
        this.failedAPIs = new Set();
        
        this.currentConversationId = null;
        this.conversations = new Map();
        this.conversationTitles = new Map();
        
        this.init();
    }
    
    init() {
        // Écouteurs d'événements de base
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        this.clearBtn.addEventListener('click', () => this.clearConversation());
        this.aboutBtn.addEventListener('click', () => this.showModal(this.aboutModal));
        this.contactBtn.addEventListener('click', () => this.showModal(this.contactModal));
        this.closeAboutModal.addEventListener('click', () => this.hideModal(this.aboutModal));
        this.closeContactModal.addEventListener('click', () => this.hideModal(this.contactModal));
        
        // Fermer les modales en cliquant sur le fond (sauf CAPTCHA)
        [this.aboutModal, this.contactModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });
        
        // Empêcher la fermeture du CAPTCHA par clic sur le fond
        this.captchaModal.addEventListener('click', (e) => {
            if (e.target === this.captchaModal || e.target.classList.contains('modal-backdrop')) {
                e.preventDefault();
                e.stopPropagation();
                // Animation pour indiquer que c'est obligatoire
                this.captchaModal.classList.add('shake');
                setTimeout(() => this.captchaModal.classList.remove('shake'), 500);
            }
        });
        
        // Boutons d'actions rapides
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt') || 
                             e.target.closest('.quick-action-btn').getAttribute('data-prompt');
                this.messageInput.value = prompt;
                this.handleSendMessage();
            });
        });
        
        // Redimensionnement automatique du textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // Sidebar
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.toggleSidebar.addEventListener('click', () => this.toggleSidebarVisibility());
        this.sidebarOverlay.addEventListener('click', () => this.hideSidebarMobile());
        this.menuToggleBtn.addEventListener('click', () => this.toggleSidebarVisibility());
        
        // Mode Sombre
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // CAPTCHA
        this.refreshCaptchaBtn.addEventListener('click', () => this.generateCaptcha());
        this.submitCaptchaBtn.addEventListener('click', () => this.verifyCaptcha());
        this.captchaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.verifyCaptcha();
            }
        });
        
        // Charger l'état initial
        this.loadSavedConversations();
        this.loadThemePreference();
        this.generateCaptcha();
        
        // Vérifier CAPTCHA au démarrage (obligatoire)
        this.checkCaptchaOnStart();
        
        // Créer une nouvelle conversation
        this.startNewChat();
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        
        // Tester les APIs
        setTimeout(() => this.testAPIsSequentially(), 1500);
        
        // Animation des actions rapides
        setTimeout(() => {
            this.quickActions.classList.add('show');
        }, 1000);
    }
    
    // 🔐 GESTION CAPTCHA OBLIGATOIRE
    checkCaptchaOnStart() {
        // Vérifier si le CAPTCHA a déjà été validé dans cette session
        const captchaVerified = sessionStorage.getItem('captchaVerified');
        
        if (captchaVerified === 'true') {
            this.captchaVerified = true;
            this.updateStatus("CAPTCHA vérifié - Prêt à discuter");
        } else {
            // Afficher le CAPTCHA obligatoire
            setTimeout(() => {
                this.showModal(this.captchaModal);
                this.captchaInput.focus();
            }, 1000);
        }
    }
    
    generateCaptcha() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let captcha = '';
        for (let i = 0; i < 6; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.captchaText = captcha;
        this.captchaTextElement.textContent = captcha;
        this.captchaInput.value = '';
        this.captchaError.style.display = 'none';
    }
    
    verifyCaptcha() {
        const userInput = this.captchaInput.value.trim().toUpperCase();
        
        if (userInput === this.captchaText) {
            this.captchaVerified = true;
            // Sauvegarder en session pour éviter de redemander
            sessionStorage.setItem('captchaVerified', 'true');
            this.hideModal(this.captchaModal);
            this.updateStatus("CAPTCHA vérifié - Prêt à discuter");
            
            // Activer l'interface
            this.enableChatInterface();
        } else {
            this.captchaError.style.display = 'block';
            this.generateCaptcha();
            this.captchaInput.focus();
        }
    }
    
    enableChatInterface() {
        // Activer le champ de saisie
        this.messageInput.disabled = false;
        this.messageInput.placeholder = "Posez votre question à Elaraki GPT...";
        this.sendBtn.disabled = false;
        
        // Mettre à jour le statut
        this.updateStatus("Elaraki GPT est prêt");
    }
    
    handleSendMessage() {
        if (!this.captchaVerified) {
            this.showModal(this.captchaModal);
            this.captchaInput.focus();
            return;
        }
        this.sendMessage();
    }
    
    // 🌙 MODE SOMBRE
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    loadThemePreference() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // 🚀 ENVOYER MESSAGE
    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isLoading) return;
        
        this.saveCurrentConversation();
        
        if (this.conversation.length === 0) {
            this.hideWelcomeSection();
        }
        
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        this.setLoading(true);
        
        try {
            const apiIndex = this.getBestAPI();
            this.currentApiIndex = apiIndex;
            this.currentConfig = this.apiConfigs[apiIndex];
            this.apiKey = this.currentConfig.key;
            this.apiUrl = this.currentConfig.url;
            this.model = this.currentConfig.models[0];
            
            console.log(`🎯 Utilisation: ${this.currentConfig.name} - ${this.model}`);
            
            let response;
            let attempts = 0;
            const maxAttempts = 2;
            
            while (attempts < maxAttempts) {
                try {
                    const startTime = Date.now();
                    response = await this.getAIResponseAPI(message);
                    const responseTime = Date.now() - startTime;
                    
                    console.log(`✅ Succès en ${responseTime}ms`);
                    break;
                    
                } catch (apiError) {
                    attempts++;
                    console.log(`❌ Tentative ${attempts} échouée: ${apiError.message}`);
                    
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        const newApiIndex = this.getBestAPI();
                        if (newApiIndex !== apiIndex) {
                            this.currentApiIndex = newApiIndex;
                            this.currentConfig = this.apiConfigs[newApiIndex];
                            this.apiKey = this.currentConfig.key;
                            this.apiUrl = this.currentConfig.url;
                            this.model = this.currentConfig.models[0];
                            console.log(`🔄 Changement vers: ${this.currentConfig.name}`);
                        }
                    }
                }
            }
            
            if (!response) {
                console.log("⚠️ Toutes les APIs échouées, mode local");
                response = await this.getLocalResponse(message);
            }
            
            this.addMessage('assistant', response);
            this.conversation.push({ role: "user", content: message });
            this.conversation.push({ role: "assistant", content: response });
            
            this.saveCurrentConversation();
            
        } catch (error) {
            console.error('Erreur finale:', error);
            this.addMessage('assistant', '⚠️ Problème technique. Contactez-nous au +212 543-05544');
        } finally {
            this.setLoading(false);
            const workingCount = this.workingAPIs.size;
            this.updateStatus(`${workingCount} APIs actives - ${this.currentConfig.name}`);
        }
    }
    
    async getAIResponseAPI(userMessage) {
        const config = this.currentConfig;
        
        let requestBody;
        let headers = {
            'Content-Type': 'application/json'
        };
        
        this.conversation.push({ role: "user", content: userMessage });
        
        if (config.name === "Google Gemini") {
            const url = `${config.url}?key=${config.key}`;
            
            const contents = this.conversation.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            
            requestBody = { contents };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Réponse invalide');
            }
            
            const assistantMessage = data.candidates[0].content.parts[0].text;
            this.conversation.push({ role: "assistant", content: assistantMessage });
            return assistantMessage;
            
        } else {
            if (config.key) {
                headers['Authorization'] = `Bearer ${config.key}`;
            }
            
            if (config.headers) {
                Object.assign(headers, config.headers);
            }
            
            requestBody = {
                model: this.model,
                messages: this.conversation,
                max_tokens: 800,
                temperature: 0.7
            };
            
            const response = await fetch(config.url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            let assistantMessage;
            
            if (data.choices?.[0]?.message?.content) {
                assistantMessage = data.choices[0].message.content;
            } else if (data.content?.[0]?.text) {
                assistantMessage = data.content[0].text;
            } else {
                throw new Error('Format de réponse non reconnu');
            }
            
            this.conversation.push({ role: "assistant", content: assistantMessage });
            return assistantMessage;
        }
    }
    
    async getLocalResponse(userMessage) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const lowerMessage = userMessage.toLowerCase();
        
        const knowledgeBase = {
            "bonjour|salut|hello": "Bonjour ! Je suis Elaraki GPT, l'assistant de l'École Internationale El Araki. Comment puis-je vous aider ?",
            "école|el araki": "**École Internationale El Araki**\n📍 Riad Ennakhil, route de casa - Marrakech\n📞 +212 543-05544\n📧 info@elaraki.ac.ma",
            "programme|cours": "**Programmes :**\n• Programme Français\n• Programme International\n• Baccalauréat\n• Langues étrangères\n• STEM et Technologie",
            "inscription|admission": "**Processus d'inscription :**\n1. Formulaire en ligne\n2. Entretien avec la direction\n3. Tests d'évaluation\n4. Dossier complet\n\n📞 Contactez-nous pour débuter !",
            "contact|téléphone": "**Contactez-nous :**\n📞 Téléphone: +212 543-05544\n📧 Email: info@elaraki.ac.ma\n🌐 Site: elaraki.ac.ma",
            "valeur|mission": "**Nos Valeurs :**\n🎓 Excellence académique\n🌍 Ouverture internationale\n🤝 Respect et citoyenneté\n💡 Innovation pédagogique"
        };
        
        for (const [keywords, answer] of Object.entries(knowledgeBase)) {
            const keywordArray = keywords.split('|');
            if (keywordArray.some(keyword => lowerMessage.includes(keyword))) {
                return answer;
            }
        }
        
        return "Je suis l'assistant Elaraki GPT spécialisé sur notre école. Pour des informations précises :\n\n📞 **Téléphone:** +212 543-05544\n📧 **Email:** info@elaraki.ac.ma\n🌐 **Site:** elaraki.ac.ma\n\nPosez-moi une question spécifique sur notre établissement !";
    }
    
    // 🧪 TESTER LES APIS
    async testAPIsSequentially() {
        console.log('🔍 Test des APIs...');
        this.updateStatus("Initialisation...");
        
        for (let i = 0; i < this.apiConfigs.length; i++) {
            await this.testAPI(i);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const workingCount = this.workingAPIs.size;
        console.log(`✅ ${workingCount}/${this.apiConfigs.length} APIs fonctionnent`);
        
        if (workingCount > 0) {
            this.updateStatus(`${workingCount} APIs actives`);
        } else {
            this.updateStatus("Mode local activé");
        }
    }
    
    async testAPI(apiIndex) {
        const config = this.apiConfigs[apiIndex];
        const startTime = Date.now();
        
        try {
            console.log(`🧪 Test ${config.name}...`);
            
            if (config.name === "Free GPT") {
                this.workingAPIs.add(apiIndex);
                config.status = 'working';
                console.log(`✅ ${config.name} (proxy présumé fonctionnel)`);
                return;
            }
            
            let testUrl = config.url;
            let testBody = {};
            let headers = {
                'Content-Type': 'application/json'
            };
            
            if (config.name === "Google Gemini") {
                testUrl = `${config.url}?key=${config.key}`;
                testBody = {
                    contents: [{
                        parts: [{ text: "test" }]
                    }]
                };
            } else {
                headers['Authorization'] = `Bearer ${config.key}`;
                if (config.headers) {
                    Object.assign(headers, config.headers);
                }
                testBody = {
                    model: config.models[0],
                    messages: [{ role: "user", content: "test" }],
                    max_tokens: 1
                };
            }
            
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(testBody),
                signal: AbortSignal.timeout(8000)
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok || response.status === 400 || response.status === 422 || response.status === 429) {
                this.workingAPIs.add(apiIndex);
                config.status = 'working';
                console.log(`✅ ${config.name} fonctionne (${responseTime}ms)`);
            } else {
                this.failedAPIs.add(apiIndex);
                config.status = 'failed';
                console.log(`❌ ${config.name} échoué: HTTP ${response.status}`);
            }
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.failedAPIs.add(apiIndex);
            config.status = 'failed';
            console.log(`⚠️ ${config.name} erreur: ${error.message} (${responseTime}ms)`);
        }
    }
    
    getBestAPI() {
        const availableAPIs = Array.from(this.workingAPIs);
        
        if (availableAPIs.length === 0) {
            return 0;
        }
        
        let bestApiIndex = availableAPIs[0];
        let minUsage = this.apiConfigs[bestApiIndex].usage;
        
        for (const apiIndex of availableAPIs) {
            const config = this.apiConfigs[apiIndex];
            if (config.usage < minUsage) {
                minUsage = config.usage;
                bestApiIndex = apiIndex;
            }
        }
        
        return bestApiIndex;
    }
    
    // 💾 GESTION CONVERSATIONS
    startNewChat() {
        this.currentConversationId = 'chat_' + Date.now();
        this.conversation = [];
        this.chatMessages.innerHTML = '';
        this.showWelcomeSection();
        this.saveCurrentConversation();
        this.updateConversationsList();
        this.hideSidebarMobile();
    }
    
    saveCurrentConversation() {
        if (this.currentConversationId && this.conversation.length > 0) {
            if (!this.conversationTitles.has(this.currentConversationId)) {
                const firstUserMessage = this.conversation.find(msg => msg.role === 'user');
                const title = firstUserMessage 
                    ? this.generateConversationTitle(firstUserMessage.content)
                    : 'Nouvelle conversation';
                this.conversationTitles.set(this.currentConversationId, title);
            }
            
            this.conversations.set(this.currentConversationId, {
                messages: [...this.conversation],
                title: this.conversationTitles.get(this.currentConversationId),
                lastUpdated: Date.now(),
                model: this.model,
                api: this.currentConfig.name
            });
            
            this.saveToLocalStorage();
        }
    }
    
    generateConversationTitle(firstMessage) {
        const words = firstMessage.trim().split(/\s+/);
        let title = words.slice(0, 6).join(' ');
        if (words.length > 6) title += '...';
        return title || 'Nouvelle conversation';
    }
    
    loadConversation(conversationId) {
        const conversationData = this.conversations.get(conversationId);
        if (conversationData) {
            this.currentConversationId = conversationId;
            this.conversation = [...conversationData.messages];
            this.chatMessages.innerHTML = '';
            this.conversation.forEach(message => {
                this.addMessage(message.role, message.content);
            });
            this.hideWelcomeSection();
            this.scrollToBottom();
            this.updateConversationsList();
            this.hideSidebarMobile();
        }
    }
    
    loadSavedConversations() {
        const saved = localStorage.getItem('elarakiGPTConversations');
        const savedTitles = localStorage.getItem('elarakiGPTConversationTitles');
        
        if (saved) {
            try {
                this.conversations = new Map(Object.entries(JSON.parse(saved)));
            } catch (error) {
                this.conversations = new Map();
            }
        }
        
        if (savedTitles) {
            try {
                this.conversationTitles = new Map(Object.entries(JSON.parse(savedTitles)));
            } catch (error) {
                this.conversationTitles = new Map();
            }
        }
        
        this.updateConversationsList();
    }
    
    saveToLocalStorage() {
        const conversationsObj = Object.fromEntries(this.conversations);
        localStorage.setItem('elarakiGPTConversations', JSON.stringify(conversationsObj));
        const titlesObj = Object.fromEntries(this.conversationTitles);
        localStorage.setItem('elarakiGPTConversationTitles', JSON.stringify(titlesObj));
    }
    
    updateConversationsList() {
        if (!this.conversationsList) return;
        this.conversationsList.innerHTML = '';
        
        const today = new Date().setHours(0, 0, 0, 0);
        const lastWeek = today - (7 * 24 * 60 * 60 * 1000);
        const last30Days = today - (30 * 24 * 60 * 60 * 1000);
        
        const todayConversations = [];
        const weekConversations = [];
        const monthConversations = [];
        const olderConversations = [];
        
        const sortedConversations = Array.from(this.conversations.entries())
            .sort(([,a], [,b]) => b.lastUpdated - a.lastUpdated);
        
        sortedConversations.forEach(([id, data]) => {
            const conversationDay = new Date(data.lastUpdated).setHours(0, 0, 0, 0);
            if (conversationDay === today) todayConversations.push({id, data});
            else if (conversationDay >= lastWeek) weekConversations.push({id, data});
            else if (conversationDay >= last30Days) monthConversations.push({id, data});
            else olderConversations.push({id, data});
        });
        
        if (todayConversations.length > 0) this.createConversationGroup('Aujourd\'hui', todayConversations);
        if (weekConversations.length > 0) this.createConversationGroup('7 derniers jours', weekConversations);
        if (monthConversations.length > 0) this.createConversationGroup('30 derniers jours', monthConversations);
        if (olderConversations.length > 0) this.createConversationGroup('Plus ancien', olderConversations);
        
        if (sortedConversations.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                    <div style="font-size: 48px; margin-bottom: 10px;">💬</div>
                    <p>Aucune conversation</p>
                </div>
            `;
            this.conversationsList.appendChild(emptyState);
        }
    }
    
    createConversationGroup(title, conversations) {
        const group = document.createElement('div');
        group.className = 'conversation-group';
        const groupTitle = document.createElement('div');
        groupTitle.className = 'conversation-group-title';
        groupTitle.textContent = title;
        group.appendChild(groupTitle);
        
        conversations.forEach(({id, data}) => {
            const conversationItem = document.createElement('div');
            conversationItem.className = `conversation-item ${id === this.currentConversationId ? 'active' : ''}`;
            conversationItem.innerHTML = `
                <div class="conversation-icon">💬</div>
                <div class="conversation-text">${data.title}</div>
            `;
            conversationItem.addEventListener('click', () => this.loadConversation(id));
            group.appendChild(conversationItem);
        });
        
        this.conversationsList.appendChild(group);
    }
    
    // 📱 SIDEBAR
    toggleSidebarVisibility() {
        if (window.innerWidth <= 768) {
            this.conversationsSidebar.classList.toggle('mobile-open');
            this.sidebarOverlay.classList.toggle('mobile-open');
            document.body.style.overflow = this.conversationsSidebar.classList.contains('mobile-open') ? 'hidden' : 'auto';
        } else {
            this.conversationsSidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-open', !this.conversationsSidebar.classList.contains('collapsed'));
            const icon = this.toggleSidebar.querySelector('svg path');
            if (this.conversationsSidebar.classList.contains('collapsed')) {
                icon.setAttribute('d', 'M5 12h14M12 5l7 7-7 7');
            } else {
                icon.setAttribute('d', 'M19 12H5M12 19l-7-7 7-7');
            }
        }
    }
    
    hideSidebarMobile() {
        this.conversationsSidebar.classList.remove('mobile-open');
        this.sidebarOverlay.classList.remove('mobile-open');
        document.body.style.overflow = 'auto';
    }
    
    handleResize() {
        if (window.innerWidth > 768) {
            this.conversationsSidebar.classList.remove('collapsed', 'mobile-open');
            this.sidebarOverlay.classList.remove('mobile-open');
            document.body.classList.add('sidebar-open');
            document.body.style.overflow = 'auto';
        } else {
            this.conversationsSidebar.classList.add('collapsed');
            document.body.classList.remove('sidebar-open');
        }
    }
    
    // 🎯 MÉTHODES UTILITAIRES
    updateStatus(status) {
        if (this.statusText) {
            this.statusText.textContent = status;
        }
    }
    
    addMessage(role, content) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.formatMarkdown(content);
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        messageContent.appendChild(timestamp);
        messageElement.appendChild(messageContent);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    formatMarkdown(text) {
        if (!text) return '';
        let formatted = text.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return formatted;
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;
        if (loading) {
            this.loadingIndicator.classList.add('show');
            this.updateStatus(`Connexion à ${this.currentConfig.name}...`);
        } else {
            this.loadingIndicator.classList.remove('show');
            const workingCount = this.workingAPIs.size;
            this.updateStatus(`${workingCount} APIs actives - ${this.currentConfig.name}`);
        }
    }
    
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    hideWelcomeSection() {
        this.welcomeSection.classList.add('hidden');
        this.chatContainer.classList.remove('hidden');
    }
    
    showWelcomeSection() {
        this.welcomeSection.classList.remove('hidden');
        this.chatContainer.classList.add('hidden');
    }
    
    clearConversation() {
        this.conversation = [];
        this.chatMessages.innerHTML = '';
        this.showWelcomeSection();
        if (this.currentConversationId) {
            this.conversations.delete(this.currentConversationId);
            this.conversationTitles.delete(this.currentConversationId);
            this.saveToLocalStorage();
            this.updateConversationsList();
        }
    }
    
    showModal(modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
    
    hideModal(modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.elarakiGPT = new ElarakiGPT();
});

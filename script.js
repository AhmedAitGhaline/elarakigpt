class UserManager {
    constructor() {
        this.currentUser = null;
        this.users = new Map();
        this.userConversations = new Map(); // userId -> conversations Map
        this.loadUsers();
    }
    
    loadUsers() {
        // Charger les utilisateurs depuis localStorage
        const savedUsers = localStorage.getItem('elarakiGPTUsers');
        const savedUserConversations = localStorage.getItem('elarakiGPTUserConversations');
        
        if (savedUsers) {
            try {
                const usersArray = JSON.parse(savedUsers);
                usersArray.forEach(user => {
                    this.users.set(user.email, {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        password: user.password,
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin,
                        totalMessages: user.totalMessages || 0
                    });
                });
            } catch (error) {
                console.error('Erreur chargement utilisateurs:', error);
            }
        }
        
        if (savedUserConversations) {
            try {
                const conversationsObj = JSON.parse(savedUserConversations);
                Object.entries(conversationsObj).forEach(([userId, convData]) => {
                    this.userConversations.set(userId, new Map(Object.entries(convData)));
                });
            } catch (error) {
                console.error('Erreur chargement conversations:', error);
            }
        }
        
        // Vérifier si un utilisateur est déjà connecté
        const loggedInUser = localStorage.getItem('elarakiGPTLoggedInUser');
        if (loggedInUser) {
            try {
                this.currentUser = JSON.parse(loggedInUser);
            } catch (error) {
                console.error('Erreur chargement utilisateur connecté:', error);
            }
        }
    }
    
    saveUsers() {
        // Sauvegarder les utilisateurs dans localStorage
        const usersArray = Array.from(this.users.values());
        localStorage.setItem('elarakiGPTUsers', JSON.stringify(usersArray));
        
        // Sauvegarder les conversations par utilisateur
        const conversationsObj = {};
        this.userConversations.forEach((conversations, userId) => {
            conversationsObj[userId] = Object.fromEntries(conversations);
        });
        localStorage.setItem('elarakiGPTUserConversations', JSON.stringify(conversationsObj));
        
        // Sauvegarder l'utilisateur connecté
        if (this.currentUser) {
            localStorage.setItem('elarakiGPTLoggedInUser', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('elarakiGPTLoggedInUser');
        }
    }
    
    register(name, email, password) {
        // Validation
        if (!name || !email || !password) {
            return { success: false, message: 'Tous les champs sont obligatoires' };
        }
        
        if (password.length < 6) {
            return { success: false, message: 'Le mot de passe doit faire au moins 6 caractères' };
        }
        
        if (this.users.has(email)) {
            return { success: false, message: 'Cet email est déjà utilisé' };
        }
        
        // Créer l'utilisateur
        const userId = 'user_' + Date.now();
        const user = {
            id: userId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            totalMessages: 0
        };
        
        this.users.set(email, user);
        this.userConversations.set(userId, new Map());
        this.saveUsers();
        
        return { success: true, user };
    }
    
    login(email, password) {
        // Validation
        if (!email || !password) {
            return { success: false, message: 'Email et mot de passe requis' };
        }
        
        const user = this.users.get(email.toLowerCase().trim());
        
        if (!user) {
            return { success: false, message: 'Utilisateur non trouvé' };
        }
        
        if (user.password !== this.hashPassword(password)) {
            return { success: false, message: 'Mot de passe incorrect' };
        }
        
        // Mettre à jour la dernière connexion
        user.lastLogin = new Date().toISOString();
        this.currentUser = { ...user };
        this.saveUsers();
        
        return { success: true, user: this.currentUser };
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('elarakiGPTLoggedInUser');
        return { success: true };
    }
    
    changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, message: 'Non connecté' };
        }
        
        if (this.currentUser.password !== this.hashPassword(currentPassword)) {
            return { success: false, message: 'Mot de passe actuel incorrect' };
        }
        
        if (newPassword.length < 6) {
            return { success: false, message: 'Le nouveau mot de passe doit faire au moins 6 caractères' };
        }
        
        // Mettre à jour le mot de passe
        const user = this.users.get(this.currentUser.email);
        user.password = this.hashPassword(newPassword);
        this.currentUser.password = user.password;
        this.saveUsers();
        
        return { success: true, message: 'Mot de passe mis à jour' };
    }
    
    getUserConversations() {
        if (!this.currentUser) return new Map();
        return this.userConversations.get(this.currentUser.id) || new Map();
    }
    
    saveUserConversation(conversationId, conversationData) {
        if (!this.currentUser) return;
        
        let userConvs = this.userConversations.get(this.currentUser.id);
        if (!userConvs) {
            userConvs = new Map();
            this.userConversations.set(this.currentUser.id, userConvs);
        }
        
        userConvs.set(conversationId, conversationData);
        this.saveUsers();
    }
    
    deleteUserConversation(conversationId) {
        if (!this.currentUser) return;
        
        const userConvs = this.userConversations.get(this.currentUser.id);
        if (userConvs) {
            userConvs.delete(conversationId);
            this.saveUsers();
        }
    }
    
    incrementUserMessageCount() {
        if (!this.currentUser) return;
        
        const user = this.users.get(this.currentUser.email);
        if (user) {
            user.totalMessages = (user.totalMessages || 0) + 1;
            this.currentUser.totalMessages = user.totalMessages;
            this.saveUsers();
        }
    }
    
    getUserStats() {
        if (!this.currentUser) return null;
        
        const userConvs = this.userConversations.get(this.currentUser.id);
        const conversationCount = userConvs ? userConvs.size : 0;
        
        return {
            name: this.currentUser.name,
            email: this.currentUser.email,
            conversationCount: conversationCount,
            totalMessages: this.currentUser.totalMessages || 0,
            createdAt: this.currentUser.createdAt,
            lastLogin: this.currentUser.lastLogin
        };
    }
    
    exportUserData() {
        if (!this.currentUser) return null;
        
        const userConvs = this.userConversations.get(this.currentUser.id);
        const conversations = userConvs ? Array.from(userConvs.values()) : [];
        
        return {
            user: {
                name: this.currentUser.name,
                email: this.currentUser.email,
                createdAt: this.currentUser.createdAt,
                lastLogin: this.currentUser.lastLogin,
                totalMessages: this.currentUser.totalMessages || 0
            },
            conversations: conversations,
            exportedAt: new Date().toISOString()
        };
    }
    
    hashPassword(password) {
        // Hash simple pour démo (dans un cas réel, utiliser bcrypt ou équivalent)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    getFirstName(name) {
        if (!name) return '';
        return name.split(' ')[0];
    }
    
    getFirstLetter(name) {
        if (!name) return 'E';
        return name.trim().charAt(0).toUpperCase();
    }
}

class ElarakiGPT {
    constructor() {
        this.conversation = [];
        this.isLoading = false;
        this.captchaVerified = false;
        this.captchaText = '';
        
        // Gestionnaire d'utilisateurs
        this.userManager = new UserManager();
        
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
        
        // Authentification
        this.loginModal = document.getElementById('login-modal');
        this.profileModal = document.getElementById('profile-modal');
        this.changePasswordModal = document.getElementById('change-password-modal');
        this.closeLoginModal = document.getElementById('close-login-modal');
        this.closeProfileModal = document.getElementById('close-profile-modal');
        this.closeChangePasswordModal = document.getElementById('close-change-password-modal');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginEmail = document.getElementById('login-email');
        this.loginPassword = document.getElementById('login-password');
        this.loginError = document.getElementById('login-error');
        this.registerName = document.getElementById('register-name');
        this.registerEmail = document.getElementById('register-email');
        this.registerPassword = document.getElementById('register-password');
        this.registerConfirm = document.getElementById('register-confirm');
        this.registerError = document.getElementById('register-error');
        this.loginSubmit = document.getElementById('login-submit');
        this.registerSubmit = document.getElementById('register-submit');
        this.switchToRegister = document.getElementById('switch-to-register');
        this.switchToLogin = document.getElementById('switch-to-login');
        this.changePasswordBtn = document.getElementById('change-password-btn');
        this.exportDataBtn = document.getElementById('export-data-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.updatePasswordBtn = document.getElementById('update-password-btn');
        this.currentPassword = document.getElementById('current-password');
        this.newPassword = document.getElementById('new-password');
        this.confirmNewPassword = document.getElementById('confirm-new-password');
        this.passwordError = document.getElementById('password-error');
        
        // Header authentication elements
        this.headerControls = document.querySelector('.header-controls');
        
        // Éléments sidebar user (nouveaux)
        this.sidebarUserSection = document.getElementById('sidebar-user-section');
        this.sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
        this.sidebarUserName = document.getElementById('sidebar-user-name');
        this.welcomeUserMessage = document.getElementById('welcome-user-message');
        
        this.createAuthButtons();
        
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
    
    createAuthButtons() {
        // Créer le bouton de connexion/profil
        this.authButtonContainer = document.querySelector('.auth-button-container');
        this.authButtonContainer.innerHTML = '';
        
        if (this.userManager.currentUser) {
            this.createProfileButton();
        } else {
            this.createLoginButton();
        }
        
        // Mettre à jour la sidebar
        this.updateSidebarUserInfo();
        
        // Mettre à jour le message de bienvenue
        this.updateWelcomeMessage();
    }
    
    createLoginButton() {
        this.authButtonContainer.innerHTML = '';
        const loginBtn = document.createElement('button');
        loginBtn.className = 'action-btn login-btn';
        loginBtn.innerHTML = '<span>Se connecter</span>';
        loginBtn.addEventListener('click', () => this.showModal(this.loginModal));
        this.authButtonContainer.appendChild(loginBtn);
    }
    
    createProfileButton() {
        this.authButtonContainer.innerHTML = '';
        const profileBtn = document.createElement('button');
        profileBtn.className = 'user-profile-btn';
        profileBtn.innerHTML = `
            <div class="user-avatar-small">${this.userManager.getInitials(this.userManager.currentUser.name)}</div>
            <span class="user-name">${this.userManager.getFirstName(this.userManager.currentUser.name)}</span>
        `;
        profileBtn.addEventListener('click', () => this.showProfileModal());
        this.authButtonContainer.appendChild(profileBtn);
    }
    
    updateSidebarUserInfo() {
        if (this.userManager.currentUser) {
            // Mettre à jour l'icône avec la première lettre du prénom
            this.sidebarUserAvatar.textContent = this.userManager.getFirstLetter(this.userManager.currentUser.name);
            
            // Mettre à jour le nom et prénom
            this.sidebarUserName.textContent = this.userManager.currentUser.name;
            
            // Ajouter une classe pour conserver la couleur
            this.sidebarUserAvatar.style.background = 'var(--gradient-primary)';
            this.sidebarUserName.style.color = 'var(--text-dark)';
        } else {
            // Réinitialiser à Elaraki GPT par défaut
            this.sidebarUserAvatar.textContent = 'E';
            this.sidebarUserName.textContent = 'Elaraki GPT';
            
            // Conserver la même couleur
            this.sidebarUserAvatar.style.background = 'var(--gradient-primary)';
            this.sidebarUserName.style.color = 'var(--text-dark)';
        }
    }
    
    showProfileModal() {
        const stats = this.userManager.getUserStats();
        if (stats) {
            document.getElementById('profile-avatar').textContent = 
                this.userManager.getInitials(stats.name);
            document.getElementById('profile-name').textContent = stats.name;
            document.getElementById('profile-email').textContent = stats.email;
            document.getElementById('profile-conversations').textContent = stats.conversationCount;
            document.getElementById('profile-messages').textContent = stats.totalMessages;
            document.getElementById('profile-created').textContent = 
                new Date(stats.createdAt).toLocaleDateString('fr-FR');
        }
        this.showModal(this.profileModal);
    }
    
    init() {
        // Vérifier l'authentification au démarrage
        if (this.userManager.currentUser) {
            this.loadUserConversations();
            this.updateWelcomeMessage();
            this.updateSidebarUserInfo();
        } else {
            // Afficher le modal de connexion après le CAPTCHA
            setTimeout(() => {
                if (!this.userManager.currentUser) {
                    this.showModal(this.loginModal);
                }
            }, 1500);
        }
        
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
        [this.aboutModal, this.contactModal, this.loginModal, this.profileModal, this.changePasswordModal].forEach(modal => {
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
        
        // Authentification
        this.closeLoginModal.addEventListener('click', () => this.hideModal(this.loginModal));
        this.closeProfileModal.addEventListener('click', () => this.hideModal(this.profileModal));
        this.closeChangePasswordModal.addEventListener('click', () => this.hideModal(this.changePasswordModal));
        
        // Login/Register forms
        this.switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            this.loginForm.classList.remove('active');
            this.registerForm.classList.add('active');
        });
        
        this.switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            this.registerForm.classList.remove('active');
            this.loginForm.classList.add('active');
        });
        
        this.loginSubmit.addEventListener('click', () => this.handleLogin());
        this.registerSubmit.addEventListener('click', () => this.handleRegister());
        
        // Profile actions
        this.changePasswordBtn.addEventListener('click', () => {
            this.hideModal(this.profileModal);
            this.showModal(this.changePasswordModal);
        });
        
        this.exportDataBtn.addEventListener('click', () => this.exportUserData());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.updatePasswordBtn.addEventListener('click', () => this.handleChangePassword());
        
        // Charger l'état initial
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
        const captchaVerified = sessionStorage.getItem('captchaVerified');
        
        if (captchaVerified === 'true') {
            this.captchaVerified = true;
            this.updateStatus("CAPTCHA vérifié - Prêt à discuter");
        } else {
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
            sessionStorage.setItem('captchaVerified', 'true');
            this.hideModal(this.captchaModal);
            this.updateStatus("CAPTCHA vérifié - Prêt à discuter");
            
            this.enableChatInterface();
            
            // Si non connecté, montrer la modale de connexion
            if (!this.userManager.currentUser) {
                setTimeout(() => {
                    this.showModal(this.loginModal);
                }, 500);
            }
        } else {
            this.captchaError.style.display = 'block';
            this.generateCaptcha();
            this.captchaInput.focus();
        }
    }
    
    enableChatInterface() {
        this.messageInput.disabled = false;
        this.messageInput.placeholder = "Posez votre question à Elaraki GPT...";
        this.sendBtn.disabled = false;
        this.updateStatus("Elaraki GPT est prêt");
    }
    
    // 👤 GESTION AUTHENTIFICATION
    handleLogin() {
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value.trim();
        
        this.loginError.textContent = '';
        
        if (!email || !password) {
            this.loginError.textContent = 'Veuillez remplir tous les champs';
            return;
        }
        
        const result = this.userManager.login(email, password);
        
        if (result.success) {
            this.hideModal(this.loginModal);
            this.createProfileButton();
            this.loadUserConversations();
            this.updateWelcomeMessage();
            this.updateSidebarUserInfo();
            this.showNotification(`Bienvenue ${result.user.name} !`);
        } else {
            this.loginError.textContent = result.message;
        }
    }
    
    handleRegister() {
        const name = this.registerName.value.trim();
        const email = this.registerEmail.value.trim();
        const password = this.registerPassword.value.trim();
        const confirm = this.registerConfirm.value.trim();
        
        this.registerError.textContent = '';
        
        // Validation
        if (!name || !email || !password || !confirm) {
            this.registerError.textContent = 'Tous les champs sont obligatoires';
            return;
        }
        
        if (password.length < 6) {
            this.registerError.textContent = 'Le mot de passe doit faire au moins 6 caractères';
            return;
        }
        
        if (password !== confirm) {
            this.registerError.textContent = 'Les mots de passe ne correspondent pas';
            return;
        }
        
        const result = this.userManager.register(name, email, password);
        
        if (result.success) {
            // Se connecter automatiquement après inscription
            this.userManager.currentUser = result.user;
            this.userManager.saveUsers();
            
            this.hideModal(this.loginModal);
            this.createProfileButton();
            this.loadUserConversations();
            this.updateWelcomeMessage();
            this.updateSidebarUserInfo();
            this.showNotification(`Compte créé avec succès ! Bienvenue ${result.user.name}`);
            
            // Réinitialiser le formulaire
            this.registerForm.classList.remove('active');
            this.loginForm.classList.add('active');
            this.registerName.value = '';
            this.registerEmail.value = '';
            this.registerPassword.value = '';
            this.registerConfirm.value = '';
        } else {
            this.registerError.textContent = result.message;
        }
    }
    
    handleLogout() {
        const result = this.userManager.logout();
        
        if (result.success) {
            this.hideModal(this.profileModal);
            this.createLoginButton();
            this.conversations = new Map();
            this.conversationTitles = new Map();
            this.currentConversationId = null;
            this.conversation = [];
            this.chatMessages.innerHTML = '';
            this.showWelcomeSection();
            this.updateConversationsList();
            this.updateWelcomeMessage();
            this.updateSidebarUserInfo();
            this.showNotification('Déconnexion réussie');
        }
    }
    
    handleChangePassword() {
        const current = this.currentPassword.value.trim();
        const newPass = this.newPassword.value.trim();
        const confirm = this.confirmNewPassword.value.trim();
        
        this.passwordError.textContent = '';
        
        if (!current || !newPass || !confirm) {
            this.passwordError.textContent = 'Tous les champs sont obligatoires';
            return;
        }
        
        if (newPass.length < 6) {
            this.passwordError.textContent = 'Le nouveau mot de passe doit faire au moins 6 caractères';
            return;
        }
        
        if (newPass !== confirm) {
            this.passwordError.textContent = 'Les nouveaux mots de passe ne correspondent pas';
            return;
        }
        
        const result = this.userManager.changePassword(current, newPass);
        
        if (result.success) {
            this.hideModal(this.changePasswordModal);
            this.showNotification('Mot de passe mis à jour avec succès');
            
            // Réinitialiser les champs
            this.currentPassword.value = '';
            this.newPassword.value = '';
            this.confirmNewPassword.value = '';
        } else {
            this.passwordError.textContent = result.message;
        }
    }
    
    exportUserData() {
        const data = this.userManager.exportUserData();
        
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `elaraki-gpt-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Données exportées avec succès');
        }
    }
    
    loadUserConversations() {
        if (this.userManager.currentUser) {
            this.conversations = this.userManager.getUserConversations();
            
            // Extraire les titres
            this.conversationTitles = new Map();
            this.conversations.forEach((data, id) => {
                this.conversationTitles.set(id, data.title);
            });
            
            this.updateConversationsList();
        }
    }
    
    updateWelcomeMessage() {
        if (!this.welcomeUserMessage) return;
        
        if (this.userManager.currentUser) {
            this.welcomeUserMessage.innerHTML = `
                <h3>Bonjour ${this.userManager.currentUser.name} ! 👋</h3>
                <p>Vos conversations sont sauvegardées sur votre compte.</p>
            `;
            this.welcomeUserMessage.style.display = 'block';
        } else {
            this.welcomeUserMessage.innerHTML = '';
            this.welcomeUserMessage.style.display = 'none';
        }
    }
    
    showNotification(message, type = 'success') {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: var(--shadow-strong);
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Ajouter les animations CSS
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    handleSendMessage() {
        if (!this.captchaVerified) {
            this.showModal(this.captchaModal);
            this.captchaInput.focus();
            return;
        }
        
        if (!this.userManager.currentUser) {
            this.showModal(this.loginModal);
            this.showNotification('Veuillez vous connecter pour utiliser le chat', 'error');
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
        
        // Mettre à jour la couleur de l'avatar après changement de thème
        this.updateSidebarUserInfo();
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
            
            // Incrémenter le compteur de messages
            this.userManager.incrementUserMessageCount();
            
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
            
            const conversationData = {
                messages: [...this.conversation],
                title: this.conversationTitles.get(this.currentConversationId),
                lastUpdated: Date.now(),
                model: this.model,
                api: this.currentConfig.name
            };
            
            this.conversations.set(this.currentConversationId, conversationData);
            
            // Sauvegarder dans le compte utilisateur si connecté
            if (this.userManager.currentUser) {
                this.userManager.saveUserConversation(this.currentConversationId, conversationData);
            } else {
                // Sauvegarde locale temporaire (sera perdue à la déconnexion)
                this.saveToLocalStorage();
            }
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
        // Charger depuis le compte utilisateur
        if (this.userManager.currentUser) {
            this.conversations = this.userManager.getUserConversations();
            
            // Extraire les titres
            this.conversationTitles = new Map();
            this.conversations.forEach((data, id) => {
                this.conversationTitles.set(id, data.title);
            });
        } else {
            // Charger depuis localStorage (temporaire)
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
        }
        
        this.updateConversationsList();
    }
    
    saveToLocalStorage() {
        // Sauvegarde locale temporaire (seulement si non connecté)
        if (!this.userManager.currentUser) {
            const conversationsObj = Object.fromEntries(this.conversations);
            localStorage.setItem('elarakiGPTConversations', JSON.stringify(conversationsObj));
            const titlesObj = Object.fromEntries(this.conversationTitles);
            localStorage.setItem('elarakiGPTConversationTitles', JSON.stringify(titlesObj));
        }
    }
    
    updateConversationsList() {
        if (!this.conversationsList) return;
        this.conversationsList.innerHTML = '';
        
        // Ajouter un indicateur si connecté
        if (this.userManager.currentUser) {
            const userInfo = document.createElement('div');
            userInfo.className = 'conversation-group-title';
            userInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%;"></div>
                    <span>${this.userManager.currentUser.name} - Conversations sauvegardées</span>
                </div>
            `;
            this.conversationsList.appendChild(userInfo);
        }
        
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
                    ${!this.userManager.currentUser ? '<p style="margin-top: 10px; font-size: 0.9rem;">Connectez-vous pour sauvegarder vos conversations</p>' : ''}
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
                ${this.userManager.currentUser ? '<div class="conversation-saved" title="Sauvegardé sur votre compte">💾</div>' : ''}
            `;
            conversationItem.addEventListener('click', () => this.loadConversation(id));
            group.appendChild(conversationItem);
        });
        
        this.conversationsList.appendChild(group);
    }
    
    clearConversation() {
        this.conversation = [];
        this.chatMessages.innerHTML = '';
        this.showWelcomeSection();
        if (this.currentConversationId) {
            if (this.userManager.currentUser) {
                this.userManager.deleteUserConversation(this.currentConversationId);
            } else {
                this.conversations.delete(this.currentConversationId);
                this.conversationTitles.delete(this.currentConversationId);
                this.saveToLocalStorage();
            }
            this.updateConversationsList();
        }
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

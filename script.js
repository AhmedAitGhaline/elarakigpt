// =============================================
// SYSTÈME DE SÉCURITÉ AVANCÉ
// =============================================

class SecurityManager {
    constructor() {
        // Clés de chiffrement sécurisées (à changer en production)
        this.ENCRYPTION_KEY = this.generateEncryptionKey();
        this.IV_KEY = this.generateIVKey();
        this.SESSION_KEY = 'elaraki_secure_session';
        this.USER_DATA_KEY = 'elaraki_encrypted_data';
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
    }
    
    generateEncryptionKey() {
        // Génère une clé de chiffrement plus sécurisée
        const key = crypto.getRandomValues(new Uint8Array(32));
        return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    generateIVKey() {
        // Génère un IV (Initialization Vector)
        const iv = crypto.getRandomValues(new Uint8Array(16));
        return Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    async encryptData(data) {
        try {
            const text = JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(text);
            
            // Convertir la clé en ArrayBuffer
            const keyBuffer = new Uint8Array(this.ENCRYPTION_KEY.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const ivBuffer = new Uint8Array(this.IV_KEY.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            
            // Chiffrement AES-GCM
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );
            
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: ivBuffer
                },
                cryptoKey,
                dataBuffer
            );
            
            // Convertir en base64 pour stockage
            const encryptedArray = new Uint8Array(encryptedBuffer);
            return btoa(String.fromCharCode.apply(null, encryptedArray));
        } catch (error) {
            console.error('Erreur de chiffrement:', error);
            return null;
        }
    }
    
    async decryptData(encryptedData) {
        try {
            if (!encryptedData) return null;
            
            // Convertir depuis base64
            const binaryString = atob(encryptedData);
            const encryptedBuffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                encryptedBuffer[i] = binaryString.charCodeAt(i);
            }
            
            // Convertir les clés
            const keyBuffer = new Uint8Array(this.ENCRYPTION_KEY.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const ivBuffer = new Uint8Array(this.IV_KEY.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: ivBuffer
                },
                cryptoKey,
                encryptedBuffer
            );
            
            const decoder = new TextDecoder();
            const decryptedText = decoder.decode(decryptedBuffer);
            return JSON.parse(decryptedText);
        } catch (error) {
            console.error('Erreur de déchiffrement:', error);
            this.showSecurityAlert('Données corrompues ou attaque détectée');
            return null;
        }
    }
    
    hashPassword(password, salt = null) {
        // Hachage sécurisé avec salage
        const saltToUse = salt || this.generateSalt();
        const encoder = new TextEncoder();
        const data = encoder.encode(password + saltToUse);
        
        // Utilisation de SHA-256
        return crypto.subtle.digest('SHA-256', data)
            .then(hash => {
                const hashArray = Array.from(new Uint8Array(hash));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return {
                    hash: hashHex,
                    salt: saltToUse
                };
            });
    }
    
    generateSalt() {
        // Génère un sel aléatoire de 32 caractères
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    validatePassword(password) {
        // Validation stricte du mot de passe
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (password.length < minLength) {
            return { valid: false, message: `Le mot de passe doit contenir au moins ${minLength} caractères` };
        }
        if (!hasUpperCase) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
        }
        if (!hasLowerCase) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
        }
        if (!hasNumbers) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
        }
        if (!hasSpecialChar) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins un caractère spécial' };
        }
        
        return { valid: true, message: 'Mot de passe valide' };
    }
    
    checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        return Math.min(score, 5);
    }
    
    sanitizeInput(input) {
        // Nettoyage des inputs pour prévenir XSS
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .replace(/`/g, '&#96;');
    }
    
    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }
    
    createSessionToken(userId, email) {
        // Crée un token de session sécurisé
        const sessionData = {
            userId: userId,
            email: email,
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000), // 24 heures
            token: this.generateToken()
        };
        
        return sessionData;
    }
    
    generateToken() {
        // Génère un token JWT-like sécurisé
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            iss: 'elaraki-gpt',
            iat: Date.now(),
            exp: Date.now() + (24 * 60 * 60 * 1000)
        }));
        
        // Signature simulée (en production, utiliser une vraie signature)
        const signature = crypto.getRandomValues(new Uint8Array(32));
        const signatureB64 = btoa(String.fromCharCode.apply(null, signature));
        
        return `${header}.${payload}.${signatureB64}`;
    }
    
    validateSessionToken(token) {
        if (!token) return false;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            
            // Vérifier l'expiration
            if (payload.exp < Date.now()) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    trackLoginAttempt(email, success) {
        const attemptsKey = `login_attempts_${email}`;
        const lockoutKey = `lockout_${email}`;
        
        if (success) {
            localStorage.removeItem(attemptsKey);
            localStorage.removeItem(lockoutKey);
            return true;
        }
        
        let attempts = parseInt(localStorage.getItem(attemptsKey) || '0');
        attempts++;
        localStorage.setItem(attemptsKey, attempts.toString());
        
        if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
            const lockoutUntil = Date.now() + this.LOCKOUT_TIME;
            localStorage.setItem(lockoutKey, lockoutUntil.toString());
            this.showSecurityAlert('Trop de tentatives échouées. Compte verrouillé pendant 15 minutes.');
            return false;
        }
        
        return true;
    }
    
    checkLockout(email) {
        const lockoutKey = `lockout_${email}`;
        const lockoutUntil = localStorage.getItem(lockoutKey);
        
        if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
            const remaining = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
            this.showSecurityAlert(`Compte verrouillé. Réessayez dans ${remaining} minutes.`);
            return false;
        }
        
        return true;
    }
    
    showSecurityAlert(message) {
        const alertModal = document.getElementById('security-alert-modal');
        const alertTitle = document.getElementById('security-alert-title');
        const alertMessage = document.getElementById('security-alert-message');
        
        if (alertModal && alertTitle && alertMessage) {
            alertTitle.textContent = 'Alerte de Sécurité';
            alertMessage.textContent = message;
            
            alertModal.classList.add('show');
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
            
            // Fermer automatiquement après 5 secondes
            setTimeout(() => {
                this.hideModal(alertModal);
            }, 5000);
        } else {
            console.warn('Alerte de sécurité:', message);
        }
    }
    
    hideModal(modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
    }
    
    async exportData(data) {
        // Export sécurisé des données
        const encryptedData = await this.encryptData(data);
        if (!encryptedData) {
            this.showSecurityAlert('Erreur lors du chiffrement des données');
            return null;
        }
        
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: encryptedData,
            checksum: await this.generateChecksum(data)
        };
        
        return exportData;
    }
    
    async generateChecksum(data) {
        const text = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(text);
        
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    verifyChecksum(data, checksum) {
        return this.generateChecksum(data).then(newChecksum => newChecksum === checksum);
    }
}

// =============================================
// GESTIONNAIRE D'UTILISATEURS SÉCURISÉ
// =============================================

class SecureUserManager {
    constructor() {
        this.security = new SecurityManager();
        this.currentUser = null;
        this.users = new Map();
        this.userConversations = new Map();
        this.loadUsers();
    }
    
    async loadUsers() {
        try {
            // Charger les données chiffrées
            const encryptedData = localStorage.getItem(this.security.USER_DATA_KEY);
            const sessionData = localStorage.getItem(this.security.SESSION_KEY);
            
            if (encryptedData) {
                const decryptedData = await this.security.decryptData(encryptedData);
                if (decryptedData && decryptedData.users) {
                    decryptedData.users.forEach(user => {
                        this.users.set(user.email, user);
                    });
                    
                    if (decryptedData.conversations) {
                        Object.entries(decryptedData.conversations).forEach(([userId, convData]) => {
                            this.userConversations.set(userId, new Map(Object.entries(convData)));
                        });
                    }
                }
            }
            
            // Vérifier la session
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (this.security.validateSessionToken(session.token)) {
                    this.currentUser = session;
                } else {
                    localStorage.removeItem(this.security.SESSION_KEY);
                }
            }
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
            this.security.showSecurityAlert('Erreur de chargement des données');
        }
    }
    
    async saveUsers() {
        try {
            const dataToSave = {
                users: Array.from(this.users.values()),
                conversations: {}
            };
            
            this.userConversations.forEach((conversations, userId) => {
                dataToSave.conversations[userId] = Object.fromEntries(conversations);
            });
            
            const encryptedData = await this.security.encryptData(dataToSave);
            if (encryptedData) {
                localStorage.setItem(this.security.USER_DATA_KEY, encryptedData);
            }
            
            if (this.currentUser) {
                localStorage.setItem(this.security.SESSION_KEY, JSON.stringify(this.currentUser));
            }
        } catch (error) {
            console.error('Erreur sauvegarde utilisateurs:', error);
            this.security.showSecurityAlert('Erreur de sauvegarde des données');
        }
    }
    
    async register(name, email, password) {
        // Validation des inputs
        name = this.security.sanitizeInput(name.trim());
        email = email.toLowerCase().trim();
        
        if (!name || !email || !password) {
            return { success: false, message: 'Tous les champs sont obligatoires' };
        }
        
        if (!this.security.validateEmail(email)) {
            return { success: false, message: 'Email invalide' };
        }
        
        const passwordValidation = this.security.validatePassword(password);
        if (!passwordValidation.valid) {
            return { success: false, message: passwordValidation.message };
        }
        
        if (this.users.has(email)) {
            return { success: false, message: 'Cet email est déjà utilisé' };
        }
        
        try {
            // Hachage sécurisé du mot de passe
            const hashedPassword = await this.security.hashPassword(password);
            
            // Créer l'utilisateur
            const userId = 'user_' + Date.now() + '_' + crypto.getRandomValues(new Uint8Array(4)).join('');
            const user = {
                id: userId,
                name: name,
                email: email,
                passwordHash: hashedPassword.hash,
                salt: hashedPassword.salt,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                totalMessages: 0,
                securityLevel: 'high'
            };
            
            this.users.set(email, user);
            
            // Créer une session
            const session = this.security.createSessionToken(userId, email);
            this.currentUser = session;
            
            await this.saveUsers();
            
            return { success: true, user: user };
        } catch (error) {
            console.error('Erreur inscription:', error);
            return { success: false, message: 'Erreur lors de la création du compte' };
        }
    }
    
    async login(email, password) {
        email = email.toLowerCase().trim();
        
        if (!email || !password) {
            return { success: false, message: 'Email et mot de passe requis' };
        }
        
        // Vérifier le verrouillage
        if (!this.security.checkLockout(email)) {
            return { success: false, message: 'Compte temporairement verrouillé' };
        }
        
        const user = this.users.get(email);
        
        if (!user) {
            this.security.trackLoginAttempt(email, false);
            return { success: false, message: 'Identifiants incorrects' };
        }
        
        try {
            // Vérifier le mot de passe
            const hashedInput = await this.security.hashPassword(password, user.salt);
            
            if (hashedInput.hash !== user.passwordHash) {
                this.security.trackLoginAttempt(email, false);
                return { success: false, message: 'Identifiants incorrects' };
            }
            
            // Succès - mettre à jour la session
            this.security.trackLoginAttempt(email, true);
            
            user.lastLogin = new Date().toISOString();
            const session = this.security.createSessionToken(user.id, user.email);
            this.currentUser = session;
            
            await this.saveUsers();
            
            return { success: true, user: user };
        } catch (error) {
            console.error('Erreur connexion:', error);
            return { success: false, message: 'Erreur d\'authentification' };
        }
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.security.SESSION_KEY);
        return { success: true };
    }
    
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, message: 'Non connecté' };
        }
        
        const user = this.users.get(this.currentUser.email);
        if (!user) {
            return { success: false, message: 'Utilisateur non trouvé' };
        }
        
        // Vérifier l'ancien mot de passe
        const hashedCurrent = await this.security.hashPassword(currentPassword, user.salt);
        if (hashedCurrent.hash !== user.passwordHash) {
            return { success: false, message: 'Mot de passe actuel incorrect' };
        }
        
        // Valider le nouveau mot de passe
        const passwordValidation = this.security.validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return { success: false, message: passwordValidation.message };
        }
        
        // Mettre à jour le mot de passe
        const hashedNew = await this.security.hashPassword(newPassword);
        user.passwordHash = hashedNew.hash;
        user.salt = hashedNew.salt;
        
        await this.saveUsers();
        
        return { success: true, message: 'Mot de passe mis à jour' };
    }
    
    getUserConversations() {
        if (!this.currentUser) return new Map();
        
        const userId = this.currentUser.userId;
        return this.userConversations.get(userId) || new Map();
    }
    
    async saveUserConversation(conversationId, conversationData) {
        if (!this.currentUser) return;
        
        const userId = this.currentUser.userId;
        let userConvs = this.userConversations.get(userId);
        if (!userConvs) {
            userConvs = new Map();
            this.userConversations.set(userId, userConvs);
        }
        
        userConvs.set(conversationId, conversationData);
        await this.saveUsers();
    }
    
    deleteUserConversation(conversationId) {
        if (!this.currentUser) return;
        
        const userId = this.currentUser.userId;
        const userConvs = this.userConversations.get(userId);
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
            this.saveUsers();
        }
    }
    
    getUserStats() {
        if (!this.currentUser) return null;
        
        const user = this.users.get(this.currentUser.email);
        if (!user) return null;
        
        const userConvs = this.userConversations.get(user.id);
        const conversationCount = userConvs ? userConvs.size : 0;
        
        return {
            name: user.name,
            email: user.email,
            conversationCount: conversationCount,
            totalMessages: user.totalMessages || 0,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            securityLevel: user.securityLevel || 'standard'
        };
    }
    
    async exportUserData() {
        if (!this.currentUser) return null;
        
        const user = this.users.get(this.currentUser.email);
        if (!user) return null;
        
        const userConvs = this.userConversations.get(user.id);
        const conversations = userConvs ? Array.from(userConvs.values()) : [];
        
        const data = {
            user: {
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                totalMessages: user.totalMessages || 0
            },
            conversations: conversations,
            exportedAt: new Date().toISOString()
        };
        
        return await this.security.exportData(data);
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
    
    validateSession() {
        if (!this.currentUser) return false;
        return this.security.validateSessionToken(this.currentUser.token);
    }
}

// =============================================
// APPLICATION PRINCIPALE AVEC SÉCURITÉ
// =============================================

class ElarakiGPT {
    constructor() {
        this.conversation = [];
        this.isLoading = false;
        this.captchaVerified = false;
        this.captchaText = '';
        
        // Gestionnaire d'utilisateurs sécurisé
        this.userManager = new SecureUserManager();
        
        // Initialiser les éléments DOM
        this.initDOMElements();
        this.createAuthButtons();
        
        // Configuration API
        this.apiConfigs = [
            {
                name: "Groq",
                url: "https://api.groq.com/openai/v1/chat/completions",
                key: "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",
                models: ["llama-3.3-70b-versatile"],
                priority: 10
            },
            {
                name: "Mistral AI",
                url: "https://api.mistral.ai/v1/chat/completions",
                key: "L24VRJ7c2wjX50xYdqxDG8UXPSFeO1mM",
                models: ["mistral-small-latest"],
                priority: 9
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
    
    initDOMElements() {
        // Éléments de base
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
        this.securityAlertModal = document.getElementById('security-alert-modal');
        this.closeLoginModal = document.getElementById('close-login-modal');
        this.closeProfileModal = document.getElementById('close-profile-modal');
        this.closeChangePasswordModal = document.getElementById('close-change-password-modal');
        this.closeSecurityAlertModal = document.getElementById('close-security-alert-modal');
        this.securityAlertConfirm = document.getElementById('security-alert-confirm');
        
        // Forms
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
        
        // Password strength
        this.passwordStrength = document.getElementById('password-strength');
        this.strengthBar = this.passwordStrength?.querySelector('.strength-bar');
        this.strengthText = this.passwordStrength?.querySelector('.strength-text');
        
        // Header authentication elements
        this.headerControls = document.querySelector('.header-controls');
        
        // Éléments sidebar user
        this.sidebarUserSection = document.getElementById('sidebar-user-section');
        this.sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
        this.sidebarUserName = document.getElementById('sidebar-user-name');
        this.welcomeUserMessage = document.getElementById('welcome-user-message');
    }
    
    createAuthButtons() {
        this.authButtonContainer = document.querySelector('.auth-button-container');
        this.authButtonContainer.innerHTML = '';
        
        if (this.userManager.currentUser && this.userManager.validateSession()) {
            this.createProfileButton();
        } else {
            this.createLoginButton();
            // Session invalide, nettoyer
            if (this.userManager.currentUser) {
                this.userManager.logout();
            }
        }
        
        this.updateSidebarUserInfo();
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
        const user = this.userManager.users.get(this.userManager.currentUser.email);
        const name = user ? user.name : 'Utilisateur';
        profileBtn.innerHTML = `
            <div class="user-avatar-small">${this.userManager.getInitials(name)}</div>
            <span class="user-name">${this.userManager.getFirstName(name)}</span>
        `;
        profileBtn.addEventListener('click', () => this.showProfileModal());
        this.authButtonContainer.appendChild(profileBtn);
    }
    
    updateSidebarUserInfo() {
        if (this.userManager.currentUser && this.userManager.validateSession()) {
            const user = this.userManager.users.get(this.userManager.currentUser.email);
            if (user) {
                this.sidebarUserAvatar.textContent = this.userManager.getFirstLetter(user.name);
                this.sidebarUserName.textContent = user.name;
            }
        } else {
            this.sidebarUserAvatar.textContent = 'E';
            this.sidebarUserName.textContent = 'Elaraki GPT';
        }
        
        // Conserver la couleur fixe
        this.sidebarUserAvatar.style.background = 'var(--gradient-primary)';
        this.sidebarUserName.style.color = 'var(--text-dark)';
    }
    
    updateWelcomeMessage() {
        if (!this.welcomeUserMessage) return;
        
        if (this.userManager.currentUser && this.userManager.validateSession()) {
            const user = this.userManager.users.get(this.userManager.currentUser.email);
            if (user) {
                this.welcomeUserMessage.innerHTML = `
                    <h3>Bonjour ${user.name} ! 👋</h3>
                    <p>Vos conversations sont sécurisées et sauvegardées.</p>
                `;
                this.welcomeUserMessage.style.display = 'block';
                return;
            }
        }
        
        this.welcomeUserMessage.innerHTML = '';
        this.welcomeUserMessage.style.display = 'none';
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
        // Vérifier la session au démarrage
        this.checkSession();
        
        // Écouteurs d'événements
        this.setupEventListeners();
        
        // Charger l'état initial
        this.loadThemePreference();
        this.generateCaptcha();
        
        // Vérifier CAPTCHA au démarrage
        this.checkCaptchaOnStart();
        
        // Créer une nouvelle conversation
        this.startNewChat();
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        
        // Animation des actions rapides
        setTimeout(() => {
            if (this.quickActions) {
                this.quickActions.classList.add('show');
            }
        }, 1000);
    }
    
    checkSession() {
        if (this.userManager.currentUser) {
            if (this.userManager.validateSession()) {
                this.loadUserConversations();
                this.updateWelcomeMessage();
                this.updateSidebarUserInfo();
            } else {
                // Session expirée
                this.userManager.logout();
                this.createLoginButton();
                this.showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            }
        } else {
            // Afficher le modal de connexion après le CAPTCHA
            setTimeout(() => {
                if (!this.userManager.currentUser) {
                    this.showModal(this.loginModal);
                }
            }, 1500);
        }
    }
    
    setupEventListeners() {
        // Message sending
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // Clear conversation
        this.clearBtn.addEventListener('click', () => this.clearConversation());
        
        // Modal buttons
        this.aboutBtn.addEventListener('click', () => this.showModal(this.aboutModal));
        this.contactBtn.addEventListener('click', () => this.showModal(this.contactModal));
        this.closeAboutModal.addEventListener('click', () => this.hideModal(this.aboutModal));
        this.closeContactModal.addEventListener('click', () => this.hideModal(this.contactModal));
        
        // Close modals on backdrop click
        [this.aboutModal, this.contactModal, this.loginModal, this.profileModal, this.changePasswordModal].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });
        
        // Prevent CAPTCHA closing
        this.captchaModal?.addEventListener('click', (e) => {
            if (e.target === this.captchaModal || e.target.classList.contains('modal-backdrop')) {
                e.preventDefault();
                e.stopPropagation();
                this.captchaModal.classList.add('shake');
                setTimeout(() => this.captchaModal.classList.remove('shake'), 500);
            }
        });
        
        // Quick actions
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt') || 
                             e.target.closest('.quick-action-btn').getAttribute('data-prompt');
                this.messageInput.value = prompt;
                this.handleSendMessage();
            });
        });
        
        // Textarea auto-resize
        this.messageInput?.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // Sidebar
        this.newChatBtn?.addEventListener('click', () => this.startNewChat());
        this.toggleSidebar?.addEventListener('click', () => this.toggleSidebarVisibility());
        this.sidebarOverlay?.addEventListener('click', () => this.hideSidebarMobile());
        this.menuToggleBtn?.addEventListener('click', () => this.toggleSidebarVisibility());
        
        // Theme toggle
        this.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());
        
        // CAPTCHA
        this.refreshCaptchaBtn?.addEventListener('click', () => this.generateCaptcha());
        this.submitCaptchaBtn?.addEventListener('click', () => this.verifyCaptcha());
        this.captchaInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.verifyCaptcha();
            }
        });
        
        // Authentication
        this.closeLoginModal?.addEventListener('click', () => this.hideModal(this.loginModal));
        this.closeProfileModal?.addEventListener('click', () => this.hideModal(this.profileModal));
        this.closeChangePasswordModal?.addEventListener('click', () => this.hideModal(this.changePasswordModal));
        this.closeSecurityAlertModal?.addEventListener('click', () => this.hideModal(this.securityAlertModal));
        this.securityAlertConfirm?.addEventListener('click', () => this.hideModal(this.securityAlertModal));
        
        // Form switching
        this.switchToRegister?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loginForm.classList.remove('active');
            this.registerForm.classList.add('active');
        });
        
        this.switchToLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.registerForm.classList.remove('active');
            this.loginForm.classList.add('active');
        });
        
        // Form submissions
        this.loginSubmit?.addEventListener('click', () => this.handleLogin());
        this.registerSubmit?.addEventListener('click', () => this.handleRegister());
        
        // Password strength
        this.registerPassword?.addEventListener('input', () => this.updatePasswordStrength());
        
        // Profile actions
        this.changePasswordBtn?.addEventListener('click', () => {
            this.hideModal(this.profileModal);
            this.showModal(this.changePasswordModal);
        });
        
        this.exportDataBtn?.addEventListener('click', () => this.exportUserData());
        this.logoutBtn?.addEventListener('click', () => this.handleLogout());
        this.updatePasswordBtn?.addEventListener('click', () => this.handleChangePassword());
    }
    
    // 🔐 GESTION CAPTCHA
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
    async handleLogin() {
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value.trim();
        
        this.loginError.textContent = '';
        
        if (!email || !password) {
            this.loginError.textContent = 'Veuillez remplir tous les champs';
            return;
        }
        
        const result = await this.userManager.login(email, password);
        
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
    
    async handleRegister() {
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
        
        if (password !== confirm) {
            this.registerError.textContent = 'Les mots de passe ne correspondent pas';
            return;
        }
        
        const result = await this.userManager.register(name, email, password);
        
        if (result.success) {
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
    
    async handleChangePassword() {
        const current = this.currentPassword.value.trim();
        const newPass = this.newPassword.value.trim();
        const confirm = this.confirmNewPassword.value.trim();
        
        this.passwordError.textContent = '';
        
        if (!current || !newPass || !confirm) {
            this.passwordError.textContent = 'Tous les champs sont obligatoires';
            return;
        }
        
        if (newPass !== confirm) {
            this.passwordError.textContent = 'Les nouveaux mots de passe ne correspondent pas';
            return;
        }
        
        const result = await this.userManager.changePassword(current, newPass);
        
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
    
    updatePasswordStrength() {
        const password = this.registerPassword.value;
        const strength = this.userManager.security.checkPasswordStrength(password);
        
        if (this.strengthBar && this.strengthText) {
            const colors = ['#dc2626', '#ef4444', '#f59e0b', '#84cc16', '#10b981'];
            const texts = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
            
            this.strengthBar.style.width = `${strength * 20}%`;
            this.strengthBar.style.background = colors[strength - 1] || colors[0];
            this.strengthText.textContent = texts[strength - 1] || texts[0];
        }
    }
    
    async exportUserData() {
        const data = await this.userManager.exportUserData();
        
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
            
            this.conversationTitles = new Map();
            this.conversations.forEach((data, id) => {
                this.conversationTitles.set(id, data.title);
            });
            
            this.updateConversationsList();
        }
    }
    
    showNotification(message, type = 'success') {
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
        
        // Ajouter les animations CSS si nécessaire
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
        
        if (!this.userManager.currentUser || !this.userManager.validateSession()) {
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
            
            let response;
            let attempts = 0;
            const maxAttempts = 2;
            
            while (attempts < maxAttempts) {
                try {
                    response = await this.getAIResponseAPI(message);
                    break;
                } catch (apiError) {
                    attempts++;
                    console.log(`Tentative ${attempts} échouée: ${apiError.message}`);
                    
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        const newApiIndex = this.getBestAPI();
                        if (newApiIndex !== apiIndex) {
                            this.currentApiIndex = newApiIndex;
                            this.currentConfig = this.apiConfigs[newApiIndex];
                            this.apiKey = this.currentConfig.key;
                            this.apiUrl = this.currentConfig.url;
                            this.model = this.currentConfig.models[0];
                        }
                    }
                }
            }
            
            if (!response) {
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
        
        if (config.key) {
            headers['Authorization'] = `Bearer ${config.key}`;
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
        } else {
            throw new Error('Format de réponse non reconnu');
        }
        
        this.conversation.push({ role: "assistant", content: assistantMessage });
        return assistantMessage;
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
    
    getBestAPI() {
        const availableAPIs = Array.from(this.workingAPIs);
        return availableAPIs.length > 0 ? availableAPIs[0] : 0;
    }
    
    // 💾 GESTION CONVERSATIONS
    startNewChat() {
        this.currentConversationId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            
            if (this.userManager.currentUser) {
                this.userManager.saveUserConversation(this.currentConversationId, conversationData);
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
    
    updateConversationsList() {
        if (!this.conversationsList) return;
        this.conversationsList.innerHTML = '';
        
        if (this.userManager.currentUser) {
            const userInfo = document.createElement('div');
            userInfo.className = 'conversation-group-title';
            userInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%;"></div>
                    <span>${this.userManager.users.get(this.userManager.currentUser.email)?.name || 'Utilisateur'} - Conversations sécurisées</span>
                </div>
            `;
            this.conversationsList.appendChild(userInfo);
        }
        
        const sortedConversations = Array.from(this.conversations.entries())
            .sort(([,a], [,b]) => b.lastUpdated - a.lastUpdated);
        
        if (sortedConversations.length > 0) {
            sortedConversations.forEach(([id, data]) => {
                const conversationItem = document.createElement('div');
                conversationItem.className = `conversation-item ${id === this.currentConversationId ? 'active' : ''}`;
                conversationItem.innerHTML = `
                    <div class="conversation-icon">💬</div>
                    <div class="conversation-text">${data.title}</div>
                    ${this.userManager.currentUser ? '<div class="conversation-saved" title="Sauvegardé de manière sécurisée">🔒</div>' : ''}
                `;
                conversationItem.addEventListener('click', () => this.loadConversation(id));
                this.conversationsList.appendChild(conversationItem);
            });
        } else {
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
        // Protection XSS
        let safeText = this.userManager.security.sanitizeInput(text);
        let formatted = safeText.replace(/\n/g, '<br>');
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
        if (!modal) return;
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
    
    hideModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si l'API Web Crypto est disponible
    if (!window.crypto || !window.crypto.subtle) {
        alert('Votre navigateur ne supporte pas les fonctionnalités de sécurité nécessaires. Veuillez mettre à jour votre navigateur.');
        return;
    }
    
    window.elarakiGPT = new ElarakiGPT();
});

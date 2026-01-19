// --- GESTION DE LA BASE DE DONNÉES ---
const STORAGE_KEY = 'draco_permanent_storage_v1';

const USERS_API_BASE_URL = 'http://localhost:3001';

async function pteroFetchResources() {
    try {
        const res = await fetch(`${USERS_API_BASE_URL}/ptero/resources`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (_) {
        return null;
    }
}

async function pteroPower(signal) {
    const role = document.getElementById('nav-role')?.textContent;
    const isFounder = role === 'founder';
    const users = loadDB();
    const me = users.find(u => u.username === document.getElementById('nav-username')?.textContent);
    const canPower = isFounder || me?.perms?.power;
    if (!canPower) {
        alert('Action non autorisée');
        return;
    }

    try {
        const res = await fetch(`${USERS_API_BASE_URL}/ptero/power`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signal })
        });
        if (!res.ok) {
            const msg = await res.text();
            alert(`Erreur Pterodactyl: ${msg}`);
            return;
        }

        addServerLog(LOG_TYPES.USER_ACTION, `Commande Pterodactyl: ${signal}`, document.getElementById('nav-username')?.textContent);
        await refreshPteroStats();
    } catch (e) {
        alert(`Erreur réseau Pterodactyl: ${String(e?.message || e)}`);
    }
}

function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let num = Number(bytes);
    while (num >= 1024 && i < sizes.length - 1) {
        num /= 1024;
        i++;
    }
    return `${num.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatUptime(ms) {
    if (ms == null || isNaN(ms)) return '-';
    const totalSeconds = Math.floor(Number(ms) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

async function refreshPteroStats() {
    const wrap = document.getElementById('ptero-stats');
    if (!wrap) return;

    const data = await pteroFetchResources();
    if (!data || !data.attributes) {
        wrap.classList.add('hidden');
        return;
    }

    const attrs = data.attributes;
    const state = attrs.current_state || '-';
    const cpu = attrs.resources?.cpu_absolute;
    const memBytes = attrs.resources?.memory_bytes;
    const uptime = attrs.resources?.uptime;

    document.getElementById('ptero-state').textContent = String(state);
    document.getElementById('ptero-uptime').textContent = formatUptime(uptime);
    document.getElementById('ptero-cpu').textContent = cpu == null ? '-' : `${Number(cpu).toFixed(2)}%`;
    document.getElementById('ptero-mem').textContent = formatBytes(memBytes);
    wrap.classList.remove('hidden');
}

async function pteroListFiles(dir = '/') {
    try {
        const res = await fetch(`${USERS_API_BASE_URL}/ptero/files/list?dir=${encodeURIComponent(dir)}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (_) {
        return null;
    }
}

async function refreshPteroFiles(dir = '/') {
    const role = document.getElementById('nav-role')?.textContent;
    const isFounder = role === 'founder';
    const users = loadDB();
    const me = users.find(u => u.username === document.getElementById('nav-username')?.textContent);
    const canFiles = isFounder || me?.perms?.files;
    if (!canFiles) return;

    const tbody = document.getElementById('files-list');
    if (!tbody) return;

    const data = await pteroListFiles(dir);
    const list = data?.data;
    if (!Array.isArray(list)) {
        tbody.innerHTML = '';
        return;
    }

    tbody.innerHTML = '';
    list.forEach(item => {
        const a = item?.attributes;
        if (!a) return;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-800/50';

        const size = a.is_file ? formatBytes(a.size) : '-';
        const modified = a.modified_at ? new Date(a.modified_at).toLocaleString() : '-';

        tr.innerHTML = `
            <td class="py-2 px-4 text-gray-200">${a.name}</td>
            <td class="py-2 px-4 text-gray-400">${size}</td>
            <td class="py-2 px-4 text-gray-400">${modified}</td>
            <td class="py-2 px-4 text-right text-gray-500">${a.is_file ? 'Fichier' : 'Dossier'}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

async function syncUsersFromServer() {
    try {
        const res = await fetch(`${USERS_API_BASE_URL}/users`, { cache: 'no-store' });
        if (!res.ok) return false;
        const users = await res.json();
        if (!Array.isArray(users)) return false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        return true;
    } catch (_) {
        return false;
    }
}

function syncUsersToServer(users) {
    try {
        fetch(`${USERS_API_BASE_URL}/users/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        }).catch(() => {});
    } catch (_) {
        // ignore
    }
}

function loadDB() {
    // Essayer de charger depuis le localStorage
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        return JSON.parse(storedData);
    }
    
    // Si pas de données dans le localStorage, essayer de charger depuis user.json
    try {
        // Cette fonction ne peut pas accéder directement au système de fichiers depuis le navigateur
        // Nous allons donc initialiser avec un utilisateur par défaut
        const defaultUsers = [
            {
                "username": "draco_tve",
                "password": "1234",
                "role": "founder",
                "perms": {
                    "power": true,
                    "console": true,
                    "files": true,
                    "users": true,
                    "logs": true
                },
                "logs": [{
                    "action": "compte_cree",
                    "date": new Date().toISOString(),
                    "details": "Compte créé lors de l'initialisation"
                }]
            }
        ];
        
        // Sauvegarder dans le localStorage pour les prochaines fois
        saveDB(defaultUsers);
        return defaultUsers;
    } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs :", error);
        return [];
    }
}

function saveDB(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    syncUsersToServer(users);
}

// --- AUTHENTIFICATION ---
async function handleAuth() {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;

    // Tentative de synchronisation depuis user.json avant de vérifier les identifiants
    await syncUsersFromServer();

    const users = loadDB();
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        addUserLog(username, 'connexion', 'Connexion réussie');
        openDashboard(user);
    } else {
        alert('Identifiants incorrects');
    }
}

function logout() {
    const currentUser = document.getElementById('nav-username')?.textContent;
    if (currentUser) {
        addUserLog(currentUser, 'deconnexion', 'Déconnexion du panel');
    }
    
    document.getElementById('panel').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
}

function openDashboard(user) {
    console.log("Ouverture du tableau de bord pour l'utilisateur :", user.username);
    
    // Masquer l'écran de connexion et afficher le panneau
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
    
    // Mettre à jour l'en-tête
    document.getElementById('nav-username').textContent = user.username;
    document.getElementById('nav-role').textContent = user.role;
    
    // Réinitialiser tous les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.add('hidden');
        btn.classList.remove('border-blue-500', 'text-blue-500');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Toujours afficher les onglets de base
    document.querySelector('.tab-btn[onclick*="tab-stats"]').classList.remove('hidden');
    document.querySelector('.tab-btn[onclick*="tab-console"]').classList.remove('hidden');
    
    // Afficher les contrôles selon les permissions
    if (user.perms?.power || user.role === 'founder') {
        document.getElementById('power-controls')?.classList.remove('hidden');
    }
    
    // Afficher les onglets selon les permissions
    if (user.perms?.console || user.role === 'founder' || user.role === 'admin') {
        document.querySelector('.tab-btn[onclick*="tab-console"]').classList.remove('hidden');
    }
    
    if (user.perms?.files || user.role === 'founder' || user.role === 'admin') {
        document.getElementById('nav-files')?.classList.remove('hidden');
    }
    
    // Onglet Utilisateurs (uniquement pour les fondateurs)
    if (user.role === 'founder') {
        document.getElementById('nav-users')?.classList.remove('hidden');
    }
    
    // Onglet Logs Serveur (uniquement pour les fondateurs)
    if (user.role === 'founder' || user.perms?.logs) {
        document.getElementById('nav-server-logs')?.classList.remove('hidden');
    }
    
    // Définir l'onglet actif
    showTab('tab-stats');
    
    // Ajouter un log de connexion
    addServerLog(LOG_TYPES.USER_ACTION, `${user.username} s'est connecté au panneau`, user.username);
    
    // Charger les données initiales
    renderTable();
    lucide.createIcons();
    
    console.log("Tableau de bord initialisé");
}

function adaptPermsToRole() {
    const role = document.getElementById('new-role').value;
    const checks = [
        document.getElementById('p-power'),
        document.getElementById('p-console'),
        document.getElementById('p-files'),
        document.getElementById('p-users'),
        document.getElementById('p-logs')
    ];

    // Réinitialiser toutes les cases
    checks.forEach(c => c.checked = false);

    // Définir les permissions par défaut selon le rôle
    switch(role) {
        case 'admin':
            checks[0].checked = true; // power
            checks[1].checked = true; // console
            checks[2].checked = true; // files
            checks[3].checked = true; // users
            checks[4].checked = true; // logs
            break;
        case 'dev':
            checks[0].checked = true; // power
            checks[1].checked = true; // console
            checks[2].checked = true; // files
            break;
        case 'rh':
            checks[3].checked = true; // users
            break;
    }

    // Désactiver la modification si l'utilisateur n'a pas les droits
    const currentUserRole = document.getElementById('nav-role')?.textContent;
    if (currentUserRole !== 'founder' && currentUserRole !== 'admin') {
        document.getElementById('new-role').disabled = true;
        checks.forEach(c => c.disabled = true);
    } else {
        document.getElementById('new-role').disabled = false;
        checks.forEach(c => c.disabled = false);
    }
}

// --- GESTION DES UTILISATEURS ---
function createUser() {
    const username = document.getElementById('new-user').value.trim();
    const password = document.getElementById('new-pass').value;
    const role = document.getElementById('new-role').value;
    
    if (!username || !password) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    const users = loadDB();
    
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        alert('Ce nom d\'utilisateur est déjà pris');
        return;
    }

    const newUser = {
        username: username,
        password: password,
        role: role,
        perms: {
            power: document.getElementById('p-power').checked,
            console: document.getElementById('p-console').checked,
            files: document.getElementById('p-files').checked,
            users: document.getElementById('p-users').checked,
            logs: document.getElementById('p-logs')?.checked || false
        },
        logs: [{
            action: 'compte_cree',
            date: new Date().toISOString(),
            details: 'Création du compte'
        }]
    };

    users.push(newUser);
    saveDB(users);
    
    // Ajouter un log pour l'admin qui a créé le compte
    const currentUser = document.getElementById('nav-username')?.textContent;
    if (currentUser) {
        addUserLog(currentUser, 'modification', `A créé le compte ${username}`);
    }
    
    renderTable();
    
    // Réinitialiser le formulaire
    document.getElementById('new-user').value = '';
    document.getElementById('new-pass').value = '';
}

function addUserLog(username, action, details) {
    const users = loadDB();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
        if (!users[userIndex].logs) {
            users[userIndex].logs = [];
        }
        
        users[userIndex].logs.push({
            action: action,
            date: new Date().toISOString(),
            details: details
        });
        
        saveDB(users);
    }
}

function deleteUser(username) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${username} ?`)) return;
    
    const users = loadDB();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
        // Ajouter un log de suppression
        addUserLog(users[userIndex].username, 'suppression', 'Compte supprimé');
        
        // Supprimer l'utilisateur
        users.splice(userIndex, 1);
        saveDB(users);
        
        // Ajouter un log pour l'admin qui a supprimé le compte
        const currentUser = document.getElementById('nav-username')?.textContent;
        if (currentUser) {
            addUserLog(currentUser, 'modification', `A supprimé le compte ${username}`);
        }
        
        renderTable();
    }
}

function renderTable() {
    const users = loadDB();
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';
    
    // Trier les utilisateurs par date de dernier log (le plus récent en premier)
    users.sort((a, b) => {
        const lastLogA = a.logs && a.logs.length > 0 
            ? new Date(a.logs[a.logs.length - 1].date) 
            : new Date(0);
        const lastLogB = b.logs && b.logs.length > 0 
            ? new Date(b.logs[b.logs.length - 1].date) 
            : new Date(0);
        return lastLogB - lastLogA;
    });

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-800/50';
        
        // Récupérer le dernier log
        const lastLog = user.logs && user.logs.length > 0 
            ? new Date(user.logs[user.logs.length - 1].date).toLocaleString() 
            : 'Jamais';
        
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium">
                <div>${user.username}</div>
                <div class="text-xs text-gray-500">${user.logs ? user.logs.length : 0} actions</div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-block px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded-full">
                    ${user.role}
                </span>
            </td>
            <td class="px-6 py-4 font-mono text-sm text-gray-400">
                ${document.getElementById('nav-role')?.textContent === 'founder' ? user.password : '••••••••'}
            </td>
            <td class="px-6 py-4 text-sm text-gray-400">${lastLog}</td>
            <td class="px-6 py-4">
                <div class="flex justify-end space-x-2">
                    <button onclick="showUserLogs('${user.username}')" class="p-2 text-blue-400 hover:bg-gray-800 rounded-lg" title="Voir les logs">
                        <i data-lucide="list" class="w-4 h-4"></i>
                    </button>
                    <button onclick="editUser('${user.username}')" class="p-2 text-yellow-400 hover:bg-gray-800 rounded-lg" title="Modifier">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteUser('${user.username}')" class="p-2 text-red-500 hover:bg-gray-800 rounded-lg" title="Supprimer">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// --- GESTION DES LOGS ---
function showUserLogs(username) {
    const users = loadDB();
    const user = users.find(u => u.username === username);
    
    if (!user || !user.logs || user.logs.length === 0) {
        alert(`Aucun log disponible pour ${username}`);
        return;
    }
    
    // Créer le contenu de la modale
    let logsHTML = `
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div class="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 class="text-lg font-bold">Activité de ${username}</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-white">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="overflow-y-auto p-4 space-y-4">
                    ${user.logs.slice().reverse().map(log => `
                        <div class="bg-gray-800/50 p-4 rounded-lg border-l-4 ${getLogColor(log.action)}">
                            <div class="flex justify-between items-start">
                                <div class="font-medium">${formatLogAction(log.action)}</div>
                                <div class="text-xs text-gray-500">${new Date(log.date).toLocaleString()}</div>
                            </div>
                            <div class="text-sm text-gray-400 mt-1">${log.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Ajouter la modale au document
    const modal = document.createElement('div');
    modal.innerHTML = logsHTML;
    document.body.appendChild(modal);
    
    // Mettre à jour les icônes Lucide
    lucide.createIcons();
}

function formatLogAction(action) {
    const actions = {
        'compte_cree': 'Création du compte',
        'connexion': 'Connexion',
        'deconnexion': 'Déconnexion',
        'modification': 'Modification',
        'suppression': 'Suppression'
    };
    return actions[action] || action;
}

function getLogColor(action) {
    const colors = {
        'compte_cree': 'border-green-500',
        'connexion': 'border-blue-500',
        'deconnexion': 'border-yellow-500',
        'modification': 'border-purple-500',
        'suppression': 'border-red-500'
    };
    return colors[action] || 'border-gray-600';
}

// --- LOGS SERVEUR ---
const LOG_TYPES = {
    SERVER_START: 'server_start',
    SERVER_STOP: 'server_stop',
    SERVER_RESTART: 'server_restart',
    FILE_MODIFIED: 'file_modified',
    CONFIG_CHANGED: 'config_changed',
    BACKUP_CREATED: 'backup_created',
    PLUGIN_LOADED: 'plugin_loaded',
    USER_ACTION: 'user_action'
};

function addServerLog(type, details, username = null) {
    const log = {
        timestamp: new Date().toISOString(),
        type: type,
        details: details,
        username: username || document.getElementById('nav-username')?.textContent || 'system'
    };
    
    const logs = JSON.parse(localStorage.getItem('server_logs') || '[]');
    logs.push(log);
    localStorage.setItem('server_logs', JSON.stringify(logs));
    
    // Mettre à jour l'affichage si on est sur l'onglet des logs
    if (document.getElementById('tab-server-logs')?.classList.contains('active')) {
        displayServerLogs();
    }
    
    return log;
}

function displayServerLogs() {
    const container = document.getElementById('server-logs-container');
    if (!container) return;
    
    const logs = JSON.parse(localStorage.getItem('server_logs') || '[]');
    container.innerHTML = '';
    
    logs.slice().reverse().forEach(log => {
        const logElement = document.createElement('div');
        logElement.className = `p-3 rounded-lg border-l-4 ${getServerLogColor(log.type)} bg-gray-800/50 mb-2`;
        
        const time = new Date(log.timestamp).toLocaleString();
        const username = log.username ? `<span class="text-blue-400">${log.username}</span>` : 'système';
        
        logElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="font-medium">${getServerLogLabel(log.type)}</div>
                <div class="text-xs text-gray-500">${time}</div>
            </div>
            <div class="text-sm text-gray-300 mt-1">${log.details}</div>
            <div class="text-xs text-gray-500 mt-1">Par ${username}</div>
        `;
        
        container.appendChild(logElement);
    });
}

function refreshServerLogs() {
    displayServerLogs();
}

function clearServerLogs() {
    if (confirm('Êtes-vous sûr de vouloir effacer tous les logs du serveur ?')) {
        localStorage.removeItem('server_logs');
        displayServerLogs();
    }
}

function getServerLogColor(type) {
    const colors = {
        [LOG_TYPES.SERVER_START]: 'border-green-500',
        [LOG_TYPES.SERVER_STOP]: 'border-red-500',
        [LOG_TYPES.SERVER_RESTART]: 'border-yellow-500',
        [LOG_TYPES.FILE_MODIFIED]: 'border-blue-500',
        [LOG_TYPES.CONFIG_CHANGED]: 'border-purple-500',
        [LOG_TYPES.BACKUP_CREATED]: 'border-cyan-500',
        [LOG_TYPES.PLUGIN_LOADED]: 'border-pink-500',
        [LOG_TYPES.USER_ACTION]: 'border-gray-500'
    };
    return colors[type] || 'border-gray-600';
}

function getServerLogLabel(type) {
    const labels = {
        [LOG_TYPES.SERVER_START]: '🟢 Démarrage du serveur',
        [LOG_TYPES.SERVER_STOP]: '🔴 Arrêt du serveur',
        [LOG_TYPES.SERVER_RESTART]: '🔄 Redémarrage du serveur',
        [LOG_TYPES.FILE_MODIFIED]: '📝 Fichier modifié',
        [LOG_TYPES.CONFIG_CHANGED]: '⚙️ Configuration modifiée',
        [LOG_TYPES.BACKUP_CREATED]: '💾 Sauvegarde créée',
        [LOG_TYPES.PLUGIN_LOADED]: '🔌 Plugin chargé',
        [LOG_TYPES.USER_ACTION]: '👤 Action utilisateur'
    };
    return labels[type] || type;
}

// --- NAVIGATION ---
function showTab(tabId, event) {
    console.log(`Affichage de l'onglet : ${tabId}`);
    
    // Masquer tous les contenus d'onglets
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activer le contenu de l'onglet sélectionné
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.classList.add('active');
    } else {
        console.error(`Onglet non trouvé : ${tabId}`);
    }
    
    // Mettre à jour les styles des boutons d'onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('onclick')?.includes(tabId);
        btn.classList.toggle('border-blue-500', isActive);
        btn.classList.toggle('text-blue-500', isActive);
        btn.classList.toggle('border-transparent', !isActive);
        btn.classList.toggle('text-gray-500', !isActive);
    });
    
    // Actions spécifiques aux onglets
    switch(tabId) {
        case 'tab-server-logs':
            console.log('Rafraîchissement des logs serveur...');
            displayServerLogs();
            break;
        case 'tab-stats':
            refreshPteroStats();
            break;
        case 'tab-files':
            refreshPteroFiles('/');
            break;
            
        case 'tab-users':
            console.log('Rafraîchissement du tableau des utilisateurs...');
            renderTable();
            break;
            
        case 'tab-console':
            console.log('Initialisation de la console...');
            // Initialisation de la console si nécessaire
            break;
            
        default:
            console.log(`Aucune action spécifique pour l'onglet : ${tabId}`);
    }
    
    console.log(`Onglet ${tabId} affiché avec succès`);
}

// --- GESTION DES MODIFICATIONS ---
function editUser(username) {
    const currentUserRole = document.getElementById('nav-role')?.textContent;
    if (currentUserRole !== 'founder') {
        alert('Seul un fondateur peut modifier les comptes');
        return;
    }

    const users = loadDB();
    const user = users.find(u => u.username === username);
    if (!user) return;

    const modalHTML = `
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Modifier l'utilisateur</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-white">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Nom d'utilisateur</label>
                        <input type="text" id="edit-username" value="${user.username}" 
                               class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Nouveau mot de passe</label>
                        <input type="password" id="edit-password" placeholder="Laisser vide pour ne pas changer" 
                               class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    </div>
                    <div class="flex justify-end space-x-3 pt-4">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                            Annuler
                        </button>
                        <button onclick="updateUser('${user.username}')" 
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg">
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
    lucide.createIcons();
}

function updateUser(oldUsername) {
    const currentUserRole = document.getElementById('nav-role')?.textContent;
    if (currentUserRole !== 'founder') {
        alert('Action non autorisée');
        return;
    }

    const newUsername = document.getElementById('edit-username').value.trim();
    const newPassword = document.getElementById('edit-password').value;
    
    if (!newUsername) {
        alert('Le nom d\'utilisateur ne peut pas être vide');
        return;
    }

    const users = loadDB();
    const userIndex = users.findIndex(u => u.username === oldUsername);
    
    if (userIndex === -1) {
        alert('Utilisateur introuvable');
        return;
    }

    // Vérifier si le nouveau nom d'utilisateur est déjà pris
    if (newUsername !== oldUsername && users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
        alert('Ce nom d\'utilisateur est déjà pris');
        return;
    }

    // Mise à jour des informations
    const updatedUser = {
        ...users[userIndex],
        username: newUsername
    };
    
    if (newPassword) {
        updatedUser.password = newPassword;
    }

    // Ajout d'un log
    const currentUser = document.getElementById('nav-username')?.textContent;
    if (currentUser) {
        const logDetails = [];
        if (newUsername !== oldUsername) logDetails.push(`nom d'utilisateur modifié`);
        if (newPassword) logDetails.push(`mot de passe modifié`);
        
        addUserLog(currentUser, 'modification', 
                 `A modifié ${oldUsername} : ${logDetails.join(' et ')}`);
    }

    users[userIndex] = updatedUser;
    saveDB(users);
    
    // Fermer la modale et rafraîchir le tableau
    document.querySelector('.fixed').remove();
    renderTable();
    
    // Si l'utilisateur modifié est l'utilisateur actuel, mettre à jour l'affichage
    if (currentUser === oldUsername) {
        document.getElementById('nav-username').textContent = newUsername;
    }
}

// Initialisation
syncUsersFromServer().finally(() => {
    lucide.createIcons();
});

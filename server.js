<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Draco Panel - Permanent Storage</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.0/lucide.min.css" rel="stylesheet">
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
    </style>
</head>
<body class="bg-gray-950 text-gray-100 font-sans">

    <div id="login-screen" class="min-h-screen flex items-center justify-center p-4 bg-black">
        <div class="bg-gray-900 w-full max-w-md rounded-2xl border border-blue-500/30 shadow-2xl p-8 border-t-4 border-t-blue-600">
            <h1 class="text-3xl font-black text-center mb-8 tracking-tighter italic">DRACO PANEL</h1>
            <div class="space-y-4">
                <input type="text" id="login-user" placeholder="Nom d'utilisateur" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white">
                <input type="password" id="login-pass" placeholder="Mot de passe" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white">
                <button onclick="handleAuth()" class="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition transform active:scale-95 shadow-lg">CONNEXION</button>
            </div>
        </div>
    </div>

    <div id="panel" class="hidden min-h-screen flex flex-col">
        <header class="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center shadow-xl">
            <div class="flex items-center space-x-4">
                <div class="bg-blue-600 p-2 rounded-lg shadow-inner"><i data-lucide="shield" class="w-5 h-5"></i></div>
                <h1 class="font-black text-xl tracking-tight uppercase">Draco <span class="text-blue-500">Core</span></h1>
            </div>
            <div class="flex items-center space-x-6">
                <div id="power-controls" class="hidden flex space-x-2">
                    <button class="bg-green-600 hover:bg-green-500 p-2 rounded-lg transition"><i data-lucide="play" class="w-4 h-4 text-white"></i></button>
                    <button class="bg-red-600 hover:bg-red-500 p-2 rounded-lg transition"><i data-lucide="square" class="w-4 h-4 text-white"></i></button>
                </div>
                <div class="text-right">
                    <p id="nav-role" class="text-[9px] text-blue-500 font-bold uppercase tracking-widest"></p>
                    <p id="nav-username" class="text-sm font-bold text-white"></p>
                </div>
                <button onclick="logout()" class="text-gray-500 hover:text-red-500 transition-colors"><i data-lucide="log-out" class="w-5 h-5"></i></button>
            </div>
        </header>

        <nav class="bg-gray-900 border-b border-gray-800 px-6 flex space-x-8 text-xs uppercase tracking-widest font-bold">
            <button onclick="showTab('tab-stats')" class="tab-btn py-4 border-b-2 border-blue-500 text-blue-500">Stats</button>
            <button id="nav-console" onclick="showTab('tab-console')" class="tab-btn py-4 border-b-2 border-transparent text-gray-500 hidden">Console</button>
            <button id="nav-files" onclick="showTab('tab-files')" class="tab-btn py-4 border-b-2 border-transparent text-gray-500 hidden">Fichiers</button>
            <button id="nav-users" onclick="showTab('tab-users')" class="tab-btn py-4 border-b-2 border-transparent text-gray-500 hidden font-bold">Utilisateurs</button>
        </nav>

        <main class="p-6 flex-1 overflow-y-auto custom-scrollbar">
            
            <div id="tab-stats" class="tab-content active">
                <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm shadow-lg">
                    <p class="text-gray-500 text-[10px] font-bold mb-2 uppercase">Statut Système</p>
                    <div class="flex items-center text-green-500">
                        <span class="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                        <p class="text-2xl font-black">STABLE</p>
                    </div>
                </div>
            </div>

            <div id="tab-users" class="tab-content space-y-6">
                <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
                    <h2 class="font-black mb-4 flex items-center text-blue-400 uppercase tracking-tighter"><i data-lucide="user-plus" class="mr-2 w-5 h-5"></i> Création de compte</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input type="text" id="new-user" placeholder="Nom d'utilisateur" class="bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white focus:border-blue-500">
                        <input type="password" id="new-pass" placeholder="Mot de passe" class="bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white focus:border-blue-500">
                        <select id="new-role" onchange="adaptPermsToRole()" class="bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-blue-400 font-bold">
                            <option value="admin">Administrateur</option>
                            <option value="dev">Développeur</option>
                            <option value="rh">RH (Création Invités)</option>
                            <option value="guest">Invité</option>
                        </select>
                    </div>
                    
                    <div id="perm-container" class="bg-black/50 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 border border-gray-800">
                        <label class="flex items-center space-x-2 text-[10px] uppercase font-bold text-gray-400 cursor-pointer"><input type="checkbox" id="p-power" class="w-4 h-4"> <span>Power Control</span></label>
                        <label class="flex items-center space-x-2 text-[10px] uppercase font-bold text-gray-400 cursor-pointer"><input type="checkbox" id="p-console" class="w-4 h-4"> <span>Console</span></label>
                        <label class="flex items-center space-x-2 text-[10px] uppercase font-bold text-gray-400 cursor-pointer"><input type="checkbox" id="p-files" class="w-4 h-4"> <span>Fichiers</span></label>
                        <label class="flex items-center space-x-2 text-[10px] uppercase font-bold text-gray-400 cursor-pointer"><input type="checkbox" id="p-users" class="w-4 h-4"> <span>Gestion Users</span></label>
                    </div>
                    <button onclick="createUser()" class="bg-blue-600 hover:bg-blue-500 w-full py-4 rounded-xl font-black uppercase tracking-widest transition">ENREGISTRER</button>
                </div>

                <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-black text-[10px] text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">
                            <tr>
                                <th class="px-6 py-5">Utilisateur</th>
                                <th class="px-6 py-5">Rôle</th>
                                <th class="px-6 py-5">Mot de Passe</th>
                                <th class="px-6 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="user-table-body" class="divide-y divide-gray-800"></tbody>
                    </table>
                </div>
            </div>

            <div id="tab-console" class="tab-content"><div class="bg-black p-4 rounded-xl font-mono text-green-500 border border-gray-800 h-64 italic">Initialisation de la console...</div></div>
            <div id="tab-files" class="tab-content"><div class="bg-gray-900 p-8 border border-gray-800 rounded-xl text-center text-gray-500 italic">Explorateur de fichiers prêt.</div></div>
        </main>
    </div>

    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        // --- CLÉ DE STOCKAGE UNIQUE (NE JAMAIS CHANGER) ---
        const STORAGE_KEY = 'draco_permanent_storage_v1';

        // --- GESTION DE LA BASE DE DONNÉES ---
        function loadDB() {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) {
                const defaultUsers = [{
                    username: 'draco_tve',
                    password: '1234',
                    role: 'founder',
                    perms: { power: true, console: true, files: true, users: true }
                }];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
                return defaultUsers;
            }
            return JSON.parse(data);
        }

        function saveDB(users) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        }

        let session = null;

        // --- AUTHENTIFICATION ---
        function handleAuth() {
            const uInput = document.getElementById('login-user').value.trim();
            const pInput = document.getElementById('login-pass').value.trim();
            const users = loadDB();
            
            const match = users.find(u => u.username === uInput && u.password === pInput);

            if (match) {
                session = match;
                openDashboard();
            } else {
                alert("Erreur : Nom d'utilisateur ou mot de passe incorrect.");
            }
        }

        function openDashboard() {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('panel').classList.remove('hidden');
            document.getElementById('nav-username').innerText = session.username;
            document.getElementById('nav-role').innerText = session.role;

            const p = session.perms;
            const r = session.role;

            // Affichage selon permissions
            if(p.power || r === 'founder') document.getElementById('power-controls').classList.remove('hidden');
            if(p.console || r === 'founder') document.getElementById('nav-console').classList.remove('hidden');
            if(p.files || r === 'founder') document.getElementById('nav-files').classList.remove('hidden');
            if(p.users || r === 'founder') document.getElementById('nav-users').classList.remove('hidden');

            adaptPermsToRole();
            renderTable();
            lucide.createIcons();
        }

        // --- RESTRICTIONS RH ---
        function adaptPermsToRole() {
            const roleSelect = document.getElementById('new-role');
            const checks = document.querySelectorAll('#perm-container input');

            if (session.role === 'rh') {
                roleSelect.value = 'guest';
                roleSelect.disabled = true;
                checks.forEach(c => { c.checked = false; c.disabled = true; });
            } else {
                roleSelect.disabled = false;
                checks.forEach(c => c.disabled = false);
            }
        }

        // --- GESTION UTILISATEURS ---
        function createUser() {
            const name = document.getElementById('new-user').value.trim();
            const pass = document.getElementById('new-pass').value.trim();
            const role = document.getElementById('new-role').value;

            if (!name || !pass) return alert("Champs vides.");
            
            let users = loadDB();
            if (users.some(u => u.username === name)) return alert("Ce pseudo existe déjà.");

            users.push({
                username: name,
                password: pass,
                role: role,
                perms: {
                    power: document.getElementById('p-power').checked,
                    console: document.getElementById('p-console').checked,
                    files: document.getElementById('p-files').checked,
                    users: document.getElementById('p-users').checked
                }
            });

            saveDB(users);
            renderTable();
            document.getElementById('new-user').value = '';
            document.getElementById('new-pass').value = '';
            alert("Utilisateur " + name + " créé !");
        }

        function deleteUser(name) {
            if (session.role !== 'founder') return alert("Seul le fondateur peut supprimer.");
            if (name === 'draco_tve') return alert("Impossible de supprimer le compte racine.");
            
            if (confirm("Supprimer " + name + " définitivement ?")) {
                let users = loadDB().filter(u => u.username !== name);
                saveDB(users);
                renderTable();
            }
        }

        function renderTable() {
            const users = loadDB();
            const tbody = document.getElementById('user-table-body');
            tbody.innerHTML = '';

            users.forEach(u => {
                const isFounder = session.role === 'founder';
                const passValue = isFounder ? u.password : '••••••••';
                
                // Bouton supprimer visible uniquement pour le fondateur
                let actionHTML = `<i data-lucide="shield-check" class="text-gray-700 w-4 h-4 ml-auto"></i>`;
                if (isFounder && u.role !== 'founder') {
                    actionHTML = `<button onclick="deleteUser('${u.username}')" class="text-red-500 hover:bg-red-900/30 p-2 rounded-lg transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                }

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-800/30 transition">
                        <td class="px-6 py-4 font-bold text-white">${u.username}</td>
                        <td class="px-6 py-4"><span class="text-[9px] bg-blue-900/20 border border-blue-500/20 px-2 py-1 rounded font-black text-blue-400 uppercase">${u.role}</span></td>
                        <td class="px-6 py-4 font-mono text-xs text-gray-500">${passValue}</td>
                        <td class="px-6 py-4 text-right">${actionHTML}</td>
                    </tr>
                `;
            });
            lucide.createIcons();
        }

        // --- NAVIGATION ---
        function showTab(id) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('border-blue-500', 'text-blue-500');
                b.classList.add('border-transparent', 'text-gray-500');
            });
            document.getElementById(id).classList.add('active');
            event.currentTarget.classList.replace('border-transparent', 'border-blue-500');
            event.currentTarget.classList.replace('text-gray-500', 'text-blue-500');
        }

        function logout() { location.reload(); }
        lucide.createIcons();
    </script>
</body>
</html>
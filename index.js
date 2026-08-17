const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();

// ==========================================
// 1. KONFIGURASI SISTEM & API
// ==========================================
const MONGO_URI = "mongodb+srv://gmailbaru310_db_user:O59GP4Kb07CFJblr@cluster0.noevqh7.mongodb.net/?appName=Cluster0";
const PAKASIR_SLUG = "kingjpm"; // Ganti dengan slug Pakasir Anda
const PAKASIR_API_KEY = "Xs25AnZO2UW08aIapO4l3gyxTjJCCFKB"; // Ganti dengan API Key Pakasir Anda

const AM_API_URL = "https://restapidhan.vercel.app";
const AM_API_KEY = "freeapikeydhan26";

// ==========================================
// 2. DATABASE MONGODB (SCHEMA)
// ==========================================
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Terhubung ke MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'user' }, // user, premium, reseller, admin, raja
    lastAmUse: { type: String, default: '' },
    totalSpent: { type: Number, default: 0 } // Untuk fitur Leaderboard
});
const User = mongoose.model('User', userSchema);

const trxSchema = new mongoose.Schema({
    order_id: String,
    username: String,
    amount: Number,
    roleTarget: String,
    status: { type: String, default: 'pending' },
    completed_at: Date
});
const Transaction = mongoose.model('Transaction', trxSchema);

// ==========================================
// 3. MIDDLEWARE & SESSION
// ==========================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(session({
    secret: 'ManzzyIDSecretKey2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ==========================================
// 4. GENERATOR VIEWS (UNTUK VERCEL TANPA FOLDER)
// ==========================================
if (!fs.existsSync('./views')) fs.mkdirSync('./views');

// -- VIEW: LANDING PAGE --
fs.writeFileSync('./views/index.ejs', `
<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manzzy ID - Platform AM Creator</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white font-sans">
    <nav class="flex justify-between items-center px-8 py-6 border-b border-slate-800 backdrop-blur-md sticky top-0">
        <div class="text-xl font-black text-indigo-400">MANZZY<span class="text-white">.ID</span></div>
        <div>
            <% if (user) { %>
                <a href="/dashboard" class="bg-indigo-600 px-5 py-2.5 rounded-xl font-semibold">Dashboard</a>
            <% } else { %>
                <a href="/login" class="text-slate-300 px-4 py-2 hover:text-white">Masuk</a>
                <a href="/register" class="bg-indigo-600 px-5 py-2.5 rounded-xl font-semibold">Daftar</a>
            <% } %>
        </div>
    </nav>
    <header class="text-center py-32 px-4 max-w-4xl mx-auto">
        <h1 class="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">Automasi Alight Motion Tercepat</h1>
        <p class="text-slate-400 text-lg mb-10">Platform generator AM otomatis 1-2-3 klik, dilengkapi sistem pembayaran instan.</p>
        <a href="/login" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30">Mulai Sekarang</a>
    </header>
</body></html>
`);

// -- VIEW: LOGIN & REGISTER --
fs.writeFileSync('./views/login.ejs', `
<!DOCTYPE html><html class="dark"><head><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white flex items-center justify-center min-h-screen">
    <div class="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800">
        <h2 class="text-2xl font-bold text-center text-indigo-400 mb-6">Masuk Akun</h2>
        <% if (error) { %><div class="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-center"><%= error %></div><% } %>
        <form action="/login" method="POST" class="space-y-4">
            <input type="text" name="username" placeholder="Username" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
            <input type="password" name="password" placeholder="Password" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
            <button type="submit" class="w-full bg-indigo-600 font-bold py-3.5 rounded-xl mt-2">Masuk</button>
        </form>
        <p class="text-center mt-6 text-sm">Belum punya akun? <a href="/register" class="text-indigo-400">Daftar</a></p>
    </div>
</body></html>
`);

fs.writeFileSync('./views/register.ejs', `
<!DOCTYPE html><html class="dark"><head><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white flex items-center justify-center min-h-screen">
    <div class="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800">
        <h2 class="text-2xl font-bold text-center text-indigo-400 mb-6">Daftar Akun Baru</h2>
        <% if (error) { %><div class="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-center"><%= error %></div><% } %>
        <form action="/register" method="POST" class="space-y-4">
            <input type="text" name="name" placeholder="Nama Lengkap" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
            <input type="text" name="username" placeholder="Username" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
            <input type="password" name="password" placeholder="Password" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
            <button type="submit" class="w-full bg-indigo-600 font-bold py-3.5 rounded-xl mt-2">Daftar</button>
        </form>
        <p class="text-center mt-6 text-sm">Sudah punya akun? <a href="/login" class="text-indigo-400">Masuk</a></p>
    </div>
</body></html>
`);

// -- VIEW: DASHBOARD UTAMA (AM STEPPER, BELI ROLE, LEADERBOARD) --
fs.writeFileSync('./views/dashboard.ejs', `
<!DOCTYPE html><html class="dark"><head>
    <title>Dashboard - Manzzy ID</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 3s ease-in-out infinite; display: inline-block; }
        .step-active { color: #818cf8; font-weight: bold; }
        .step-inactive { color: #475569; }
    </style>
</head>
<body class="bg-slate-950 text-white min-h-screen px-6 py-10">
    <div class="max-w-5xl mx-auto">
        <!-- HEADER -->
        <div class="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-3xl mb-8">
            <div>
                <h1 class="text-3xl font-bold">Halo, <%= user.name %>! <span class="animate-float">👋</span></h1>
                <p class="text-slate-400 mt-2">Username: <span class="text-indigo-400 font-mono">@<%= user.username %></span></p>
                <p class="mt-1">Role Anda: <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"><%= user.role %> 👑</span></p>
            </div>
            <div class="mt-4 md:mt-0 flex gap-4">
                <% if (['reseller', 'admin', 'raja'].includes(user.role)) { %>
                    <a href="/manage-members" class="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition">⚙️ Kelola Member</a>
                <% } %>
                <a href="/logout" class="bg-red-500/10 text-red-400 px-6 py-3 rounded-xl font-bold border border-red-500/20">Keluar</a>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <!-- FITUR AM GENERATOR (STEPPER 1-2-3) -->
            <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                <h2 class="text-2xl font-bold mb-6 text-indigo-400">🔥 Generate AM Premium</h2>
                <p class="text-sm text-slate-400 mb-6">Limit: <%= user.role === 'user' ? '1x Sehari' : 'Unlimited' %></p>
                
                <div class="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                    <div id="ui-step-1" class="step-active text-center w-1/3">1. Email <span class="animate-float">📧</span></div>
                    <div id="ui-step-2" class="step-inactive text-center w-1/3 border-l border-r border-slate-800">2. Verif <span class="animate-float">🔗</span></div>
                    <div id="ui-step-3" class="step-inactive text-center w-1/3">3. Done <span class="animate-float">🎉</span></div>
                </div>

                <div id="am-form-container">
                    <input type="email" id="am-email" placeholder="Masukkan akun Gmail..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-indigo-500 mb-4 outline-none">
                    <button onclick="processAm(1)" id="btn-am" class="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-4 rounded-xl shadow-lg transition">Kirim Magic Link</button>
                </div>
            </div>

            <!-- LEADERBOARD & GLOBAL LOG -->
            <div class="flex flex-col gap-6">
                <!-- LEADERBOARD -->
                <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <h2 class="text-xl font-bold mb-4">🏆 Top Spender (Leaderboard)</h2>
                    <div class="space-y-3">
                        <% leaderboard.forEach((u, index) => { %>
                            <div class="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                <div class="font-bold"><%= index + 1 %>. <%= u.username %></div>
                                <div class="text-emerald-400 font-bold">Rp <%= u.totalSpent.toLocaleString('id-ID') %></div>
                            </div>
                        <% }) %>
                    </div>
                </div>
                <!-- GLOBAL LOGS -->
                <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl h-full">
                    <h2 class="text-xl font-bold mb-4">📜 Log Pembelian Global</h2>
                    <div class="space-y-2 h-40 overflow-y-auto pr-2">
                        <% globalTrx.forEach(trx => { %>
                            <div class="text-sm text-slate-400 border-b border-slate-800/50 pb-2">
                                <span class="text-white font-semibold">@<%= trx.username %></span> baru saja membeli role <span class="text-indigo-400 uppercase font-bold"><%= trx.roleTarget %></span> ✅
                            </div>
                        <% }) %>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION BELI ROLE -->
        <h2 class="text-3xl font-extrabold mb-6 text-center mt-10">🛒 Beli Role (Permanen)</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <% const roles = [ 
                { id: 'premium', name: 'Premium', price: 2000, emoji: '🌟', desc: 'Unlimited Verif AM' },
                { id: 'reseller', name: 'Reseller', price: 4000, emoji: '💼', desc: 'Bisa Jual/Set Role Premium' },
                { id: 'admin', name: 'Admin', price: 10000, emoji: '👑', desc: 'Bisa Jual Reseller & Premium' }
            ]; %>
            <% roles.forEach(r => { %>
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center hover:border-indigo-500/50 transition">
                    <div class="text-5xl mb-4 animate-float"><%= r.emoji %></div>
                    <h3 class="text-2xl font-bold text-white"><%= r.name %></h3>
                    <p class="text-slate-400 text-sm mt-2 h-10"><%= r.desc %></p>
                    <p class="text-3xl font-black text-emerald-400 my-6">Rp <%= r.price.toLocaleString('id-ID') %></p>
                    <button onclick="buyRole('<%= r.id %>', <%= r.price %>)" class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition text-white">
                        Beli Otomatis
                    </button>
                </div>
            <% }) %>
        </div>
    </div>

    <!-- MODAL QRIS -->
    <div id="qris-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 p-8 rounded-3xl max-w-sm w-full text-center border border-slate-700">
            <h2 class="text-2xl font-bold mb-2">Scan QRIS</h2>
            <p class="text-slate-400 text-sm mb-6">Sistem akan otomatis memproses setelah bayar.</p>
            <div id="qr-image-container" class="bg-white p-4 rounded-2xl mb-6 inline-block mx-auto"></div>
            <p id="qr-order-id" class="font-mono text-indigo-400 mb-6"></p>
            <button onclick="document.getElementById('qris-modal').classList.add('hidden')" class="w-full bg-slate-800 hover:bg-slate-700 font-bold py-3 rounded-xl">Tutup</button>
        </div>
    </div>

    <script>
        // Logika AM 1-2-3
        async function processAm(step) {
            const btn = document.getElementById('btn-am');
            const container = document.getElementById('am-form-container');
            let payload = { step: step };
            
            if(step === 1) {
                const email = document.getElementById('am-email').value;
                if(!email) return Swal.fire('Error', 'Email tidak boleh kosong', 'error');
                payload.email = email;
            } else if(step === 2) {
                const url = document.getElementById('am-url').value;
                if(!url) return Swal.fire('Error', 'Link tidak boleh kosong', 'error');
                payload.url = url;
            }

            btn.innerText = "Memproses...";
            btn.disabled = true;

            try {
                const res = await fetch('/api/am-process', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if(data.status) {
                    if(step === 1) {
                        document.getElementById('ui-step-1').className = 'step-inactive text-center w-1/3';
                        document.getElementById('ui-step-2').className = 'step-active text-center w-1/3 border-l border-r border-slate-800';
                        
                        container.innerHTML = \`
                            <input type="text" id="am-url" placeholder="Paste link verifikasi disini..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-indigo-500 mb-4 outline-none">
                            <button onclick="processAm(2)" id="btn-am" class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-4 rounded-xl shadow-lg transition">Verifikasi Sekarang</button>
                        \`;
                        Swal.fire('Sukses', data.message, 'success');
                    } else if (step === 2) {
                        document.getElementById('ui-step-2').className = 'step-inactive text-center w-1/3 border-l border-r border-slate-800';
                        document.getElementById('ui-step-3').className = 'step-active text-center w-1/3';
                        
                        container.innerHTML = \`
                            <div class="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl text-center">
                                <div class="text-4xl mb-2 animate-float">🎉</div>
                                <h3 class="text-xl font-bold text-emerald-400 mb-2">Aktivasi Berhasil!</h3>
                                <p class="text-slate-300 text-sm">Code Order Anda:</p>
                                <p class="text-2xl font-mono font-black mt-1 text-white bg-slate-950 p-2 rounded-lg">\${data.codeorder}</p>
                            </div>
                            <button onclick="window.location.reload()" class="w-full bg-slate-800 hover:bg-slate-700 font-bold py-4 rounded-xl mt-4">Buat Baru</button>
                        \`;
                    }
                } else {
                    Swal.fire('Gagal', data.message, 'error');
                    btn.innerText = step === 1 ? "Kirim Magic Link" : "Verifikasi Sekarang";
                    btn.disabled = false;
                }
            } catch (err) {
                Swal.fire('Error', 'Server Error', 'error');
                btn.disabled = false;
            }
        }

        // Logika Beli Role Pakasir
        async function buyRole(role, amount) {
            Swal.fire({ title: 'Membuat Tagihan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
            
            const res = await fetch('/api/pay', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({role, amount})
            });
            const data = await res.json();
            Swal.close();

            if(data.status) {
                document.getElementById('qr-order-id').innerText = "Order ID: " + data.order_id;
                // Generate QR image from the string using a free API
                document.getElementById('qr-image-container').innerHTML = \`<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(data.qr)}" alt="QRIS">\`;
                document.getElementById('qris-modal').classList.remove('hidden');
                
                // Mulai polling cek status
                checkPaymentStatus(data.order_id);
            } else {
                Swal.fire('Gagal', 'Sistem Pembayaran Sedang Gangguan', 'error');
            }
        }

        // Auto reload jika webhook masuk (Opsional polling frontend)
        function checkPaymentStatus(order_id) {
            const check = setInterval(async () => {
                const res = await fetch('/api/check-status?order_id=' + order_id);
                const data = await res.json();
                if(data.status === 'completed') {
                    clearInterval(check);
                    Swal.fire('Pembayaran Berhasil!', 'Role otomatis diupdate. Halaman akan dimuat ulang.', 'success')
                    .then(() => window.location.reload());
                }
            }, 5000); // Cek tiap 5 detik
        }
    </script>
</body></html>
`);

// -- VIEW: MANAGE MEMBERS --
fs.writeFileSync('./views/manage.ejs', `
<!DOCTYPE html><html class="dark"><head><title>Kelola Member</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white min-h-screen p-10">
    <div class="max-w-2xl mx-auto">
        <a href="/dashboard" class="text-indigo-400 mb-6 inline-block font-bold">← Kembali ke Dashboard</a>
        <h1 class="text-3xl font-bold mb-8">⚙️ Manajemen Member</h1>
        
        <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl mb-8">
            <form action="/manage-members" method="GET" class="flex gap-4">
                <input type="text" name="search" value="<%= searchQuery %>" placeholder="Cari username..." required class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500">
                <button type="submit" class="bg-indigo-600 font-bold px-6 py-3 rounded-xl">Cari User</button>
            </form>
        </div>

        <% if (searchQuery) { %>
            <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                <% if (targetUser) { %>
                    <h3 class="text-2xl font-bold mb-2"><%= targetUser.name %> (<span class="text-indigo-400">@<%= targetUser.username %></span>)</h3>
                    <p class="text-slate-400 mb-6">Role Saat Ini: <span class="uppercase font-bold text-white"><%= targetUser.role %></span></p>
                    
                    <form action="/update-role" method="POST" class="space-y-4">
                        <input type="hidden" name="targetUsername" value="<%= targetUser.username %>">
                        <select name="newRole" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none">
                            <option value="user">User</option>
                            <option value="premium">Premium</option>
                            <option value="reseller">Reseller</option>
                            <% if (user.role === 'raja' || user.role === 'admin') { %><option value="admin">Admin</option><% } %>
                        </select>
                        <button type="submit" class="w-full bg-emerald-600 font-bold py-4 rounded-xl mt-4">Ubah Role</button>
                    </form>
                <% } else { %>
                    <p class="text-red-400">User tidak ditemukan.</p>
                <% } %>
            </div>
        <% } %>
    </div>
</body></html>
`);


// ==========================================
// 5. ROUTING & LOGIKA BACKEND
// ==========================================

// Autentikasi Helper
async function getValidatedUser(req) {
    if (!req.session.userId) return null;
    let u = await User.findById(req.session.userId);
    // Aturan Raja: Username 'man' otomatis Raja
    if (u && u.username.toLowerCase() === 'man' && u.role !== 'raja') {
        u.role = 'raja'; await u.save();
    }
    return u;
}

// --- WEB ROUTES ---
app.get('/', async (req, res) => {
    const user = await getValidatedUser(req);
    res.render('index', { user });
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !await bcrypt.compare(password, user.password)) return res.render('login', { error: 'Data salah!' });
    req.session.userId = user._id;
    res.redirect('/dashboard');
});

app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { name, username, password } = req.body;
    if (await User.findOne({ username: username.toLowerCase() })) return res.render('register', { error: 'Username terpakai' });
    
    let initialRole = username.toLowerCase() === 'man' ? 'raja' : 'user';
    const hashed = await bcrypt.hash(password, 10);
    
    await User.create({ name, username: username.toLowerCase(), password: hashed, role: initialRole });
    res.redirect('/login');
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/dashboard', async (req, res) => {
    const user = await getValidatedUser(req);
    if (!user) return res.redirect('/login');

    const globalTrx = await Transaction.find({ status: 'completed' }).sort({ completed_at: -1 }).limit(10);
    const leaderboard = await User.find({ totalSpent: { $gt: 0 } }).sort({ totalSpent: -1 }).limit(5);
    
    res.render('dashboard', { user, globalTrx, leaderboard });
});

app.get('/manage-members', async (req, res) => {
    const user = await getValidatedUser(req);
    if (!user || !['reseller', 'admin', 'raja'].includes(user.role)) return res.redirect('/dashboard');

    const searchQuery = req.query.search || '';
    let targetUser = searchQuery ? await User.findOne({ username: new RegExp('^' + searchQuery + '$', 'i') }) : null;
    
    res.render('manage', { user, searchQuery, targetUser });
});

app.post('/update-role', async (req, res) => {
    const admin = await getValidatedUser(req);
    if (!admin || !['reseller', 'admin', 'raja'].includes(admin.role)) return res.redirect('/dashboard');

    const { targetUsername, newRole } = req.body;
    if (targetUsername.toLowerCase() === 'man') return res.send("<script>alert('Gagal! Username man adalah Raja permanen'); window.location='/manage-members';</script>");
    
    await User.findOneAndUpdate({ username: targetUsername.toLowerCase() }, { role: newRole });
    res.redirect('/manage-members?search=' + targetUsername);
});

// --- API ROUTES ---

// API 1: Proses AM (Tahap 1 & 2)
app.post('/api/am-process', async (req, res) => {
    const user = await getValidatedUser(req);
    if (!user) return res.status(401).json({ status: false, message: "Login expired" });

    const { step, email, url } = req.body;
    const today = new Date().toLocaleDateString('id-ID');

    // Cek limit harian untuk 'user' biasa
    if (user.role === 'user' && user.lastAmUse === today) {
        return res.json({ status: false, message: "Limit harian habis! Silakan beli Premium ke atas." });
    }

    try {
        if (step === 1) {
            const f = await fetch(`${AM_API_URL}/api/am?action=send&apikey=${AM_API_KEY}&email=${encodeURIComponent(email)}`);
            const d = await f.json();
            if (d.status) { req.session.tempEmail = email; return res.json({ status: true, message: "Link terkirim ke email!" }); }
            return res.json({ status: false, message: d.error || "Gagal kirim email" });
        } else if (step === 2) {
            const targetEmail = req.session.tempEmail;
            if(!targetEmail) return res.json({ status: false, message: "Sesi email hilang. Ulangi." });
            
            const f = await fetch(`${AM_API_URL}/api/am?action=verif&apikey=${AM_API_KEY}&email=${encodeURIComponent(targetEmail)}&url=${encodeURIComponent(url)}`);
            const d = await f.json();
            if (d.status) {
                user.lastAmUse = today; await user.save(); // Catat penggunaan limit
                req.session.tempEmail = null;
                return res.json({ status: true, codeorder: d.codeorder || "SUCCESS" });
            }
            return res.json({ status: false, message: d.error || "Gagal verifikasi" });
        }
    } catch (e) {
        res.json({ status: false, message: "API Server Error" });
    }
});

// API 2: Create Transaksi Pakasir
app.post('/api/pay', async (req, res) => {
    const user = await getValidatedUser(req);
    if (!user) return res.status(401).json({ status: false });

    const { role, amount } = req.body;
    const order_id = "INV" + Date.now();

    try {
        const response = await fetch(`https://app.pakasir.com/api/transactioncreate/qris`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: PAKASIR_SLUG, order_id, amount, api_key: PAKASIR_API_KEY })
        });
        const data = await response.json();
        
        if (data.payment && data.payment.payment_number) {
            await Transaction.create({ order_id, username: user.username, amount, roleTarget: role });
            res.json({ status: true, qr: data.payment.payment_number, order_id });
        } else {
            res.json({ status: false });
        }
    } catch (e) { res.json({ status: false }); }
});

// API 3: Webhook Pakasir (Untuk Eksekusi dari Server Pakasir)
app.post('/api/webhook', async (req, res) => {
    const { order_id, status, amount } = req.body;
    if (status === 'completed') {
        const trx = await Transaction.findOne({ order_id });
        if (trx && trx.status === 'pending') {
            trx.status = 'completed';
            trx.completed_at = new Date();
            await trx.save();
            await User.findOneAndUpdate({ username: trx.username }, { role: trx.roleTarget, $inc: { totalSpent: amount } });
        }
    }
    res.status(200).send("OK");
});

// API 4: Polling Status (Untuk Frontend)
app.get('/api/check-status', async (req, res) => {
    const trx = await Transaction.findOne({ order_id: req.query.order_id });
    res.json({ status: trx ? trx.status : 'pending' });
});

// ==========================================
// 6. JALANKAN SERVER (LOCAL / VERCEL)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API Server Berjalan di Port ${PORT}`));
module.exports = app;

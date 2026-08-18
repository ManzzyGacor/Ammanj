const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

// ==========================================
// 1. KONFIGURASI SISTEM & API
// ==========================================
const MONGO_URI = "mongodb+srv://gmailbaru310_db_user:O59GP4Kb07CFJblr@cluster0.noevqh7.mongodb.net/?appName=Cluster0";
const PAKASIR_SLUG = "kingjpm"; 
const PAKASIR_API_KEY = "Xs25AnZO2UW08aIapO4l3gyxTjJCCFKB"; 

const AM_API_URL = "https://restapidhan.vercel.app";
const AM_API_KEY = "freeapikeydhan26";

// ==========================================
// 2. DATABASE MONGODB (SERVERLESS OPTIMIZED)
// ==========================================
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log("✅ Terhubung ke MongoDB Atlas");
    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    }
};

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'user' },
    lastAmUse: { type: String, default: '' },
    totalSpent: { type: Number, default: 0 } 
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
// 3. MIDDLEWARE & SETUP FOLDER VIEWS
// ==========================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'ManzzyIDSecretKey2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Wajib untuk Vercel agar tahu posisi folder views
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// ==========================================
// 4. ROUTING LOGIKA BACKEND & TAMPILAN
// ==========================================
async function getValidatedUser(req) {
    if (!req.session.userId) return null;
    let u = await User.findById(req.session.userId);
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
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.render('login', { error: 'Data salah!' });
    }
    req.session.userId = user._id;
    res.redirect('/dashboard');
});

app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { name, username, password } = req.body;
    if (await User.findOne({ username: username.toLowerCase() })) {
        return res.render('register', { error: 'Username terpakai' });
    }
    
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
    if (targetUsername.toLowerCase() === 'man') {
        return res.send("<script>alert('Gagal! Username man adalah Raja permanen'); window.location='/manage-members';</script>");
    }
    
    await User.findOneAndUpdate({ username: targetUsername.toLowerCase() }, { role: newRole });
    res.redirect('/manage-members?search=' + targetUsername);
});

// --- API ROUTES ---
app.post('/api/am-process', async (req, res) => {
    const user = await getValidatedUser(req);
    if (!user) return res.status(401).json({ status: false, message: "Login expired" });

    const { step, email, url } = req.body;
    const today = new Date().toLocaleDateString('id-ID');

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
                user.lastAmUse = today; await user.save(); 
                req.session.tempEmail = null;
                return res.json({ status: true, codeorder: d.codeorder || "SUCCESS" });
            }
            return res.json({ status: false, message: d.error || "Gagal verifikasi" });
        }
    } catch (e) {
        res.json({ status: false, message: "API Server Error" });
    }
});

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

app.get('/api/check-status', async (req, res) => {
    const trx = await Transaction.findOne({ order_id: req.query.order_id });
    res.json({ status: trx ? trx.status : 'pending' });
});

// ==========================================
// 5. JALANKAN SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API Server Berjalan di Port ${PORT}`));
module.exports = app;

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http'); // Required for Socket
const { Server } = require('socket.io'); // Required for Socket
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const { Groq } = require('groq-sdk');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const User = require('./models/User');
const Lead = require('./models/Lead');
const Business = require('./models/Business');

const app = express();
const server = http.createServer(app); // Wrap express in HTTP server
const io = new Server(server); // Initialize Socket.io

app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const sessions = new Map();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("SaaS DB Connected ✅"))
  .catch(err => {
    console.error("MongoDB error ❌", err);
    process.exit(1);
  });

/* ===================== MULTI-USER BOT LOGIC ===================== */

// async function initializeUserBot(ownerId) {
//     // 1. Double check: Kahin session pehle se active toh nahi?
//     if (sessions.has(ownerId) && typeof sessions.get(ownerId) === 'object') {
//         console.log(`[SYSTEM] ${ownerId} is already connected.`);
//         return;
//     }
    
//     sessions.set(ownerId, "INITIALIZING");

//     // 2. Client Initialization with STRICT SEPARATION
//     const client = new Client({
//         authStrategy: new LocalAuth({ 
//             clientId: ownerId, 
//             // VVI: Har ownerId ka apna folder 'sessions/biz_xyz' ke andar banega
//             dataPath: path.join(__dirname, 'sessions', ownerId) 
//         }),
//         puppeteer: { 
//             headless: true, 
//             args: [
//                 '--no-sandbox', 
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage',
//                 '--disable-gpu'
//             ] 
//         }
//     });

//     // QR Code generation for unique ownerId
//     client.on('qr', qr => {
//         console.log(`[QR] Generated for ${ownerId}. Please scan.`);
//         io.emit(`qr-${ownerId}`, qr); 
//     });

//     // Bot ready event
//     client.on('ready', () => {
//         console.log(`✅ [READY] Bot is now LIVE for: ${ownerId}`);
//         sessions.set(ownerId, client); 
//         io.emit(`ready-${ownerId}`, { status: 'connected' });
//     });

//     // 3. Message Handling Logic
//     client.on('message', async msg => {
//         // Sirf private chats, no groups
//         if (!msg.from.endsWith('@c.us')) return;

//         try {
//             // Confirming which bot is receiving the message
//             console.log(`📩 [BOT: ${ownerId}] Received message: "${msg.body}" from ${msg.from}`);

//             // Fetching data specifically for this ownerId
//             const biz = await Business.findOne({ ownerId: ownerId });
//             if (!biz) {
//                 console.log(`❌ [DATABASE ERROR] Business not found for ${ownerId}`);
//                 return;
//             }

//             // Creating AI knowledge base
//             const propertyList = biz.properties?.map(p => 
//                 `- ${p.title}: ${p.price}, Location: ${p.location}, Size: ${p.size}`
//             ).join("\n") || "No specific listings.";

//             const prompt = `
//                 Role: Customer Support Consultant for "${biz.businessName}".
//                 Business Services: ${biz.services || 'General Inquiry'}.
//                 Offerings/Properties:
//                 ${propertyList}
                
//                 Bot Instructions: ${biz.customInstructions || 'Be helpful and polite.'}
//                 Style: Reply in natural Hinglish. Keep it concise.
                
//                 Customer: "${msg.body}"
//                 Response:`;

//             // Call Groq AI
//             const completion = await groq.chat.completions.create({
//                 model: 'llama-3.3-70b-versatile',
//                 messages: [{ role: 'user', content: prompt }]
//             });

//             const aiReply = completion.choices[0].message.content;

//             // USE THE LOCAL 'client' INSTANCE TO REPLY
//             // Isse cross-talk (ek bot ka reply dusre par jana) band ho jayega
//             await client.sendMessage(msg.from, aiReply);
            
//             // Log lead in database
//             await new Lead({ 
//                 ownerId, 
//                 phoneNumber: msg.from, 
//                 query: msg.body 
//             }).save();

//             console.log(`🚀 [SUCCESS] ${biz.businessName} replied to ${msg.from}`);

//         } catch (err) { 
//             console.log(`❌ [MESSAGE ERROR] (${ownerId}):`, err.message); 
//         }
//     });

//     // Handle session disconnects
//     client.on('disconnected', (reason) => {
//         console.log(`⚠️ [DISCONNECTED] Bot ${ownerId} was logged out:`, reason);
//         sessions.delete(ownerId);
//     });

//     client.initialize().catch(err => {
//         console.error(`[CRITICAL] Could not init bot for ${ownerId}`, err);
//         sessions.delete(ownerId);
//     });
// }

async function initializeUserBot(ownerId) {
    if (sessions.has(ownerId) && typeof sessions.get(ownerId) === 'object') {
        console.log(`[SYSTEM] ${ownerId} already running.`);
        return;
    }
    
    sessions.set(ownerId, "INITIALIZING");

    // Sabse important badlav: Har bot ka folder bilkul alag
    const botSessionPath = path.join(__dirname, 'all_sessions', `session_${ownerId}`);

    const client = new Client({
        authStrategy: new LocalAuth({ 
            clientId: ownerId, 
            dataPath: botSessionPath  // <--- Har bot ka apna private folder
        }),
        puppeteer: { 
            headless: true, 
            // Isse browser ki memory bilkul fresh rahegi har bot ke liye
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                `--user-data-dir=${path.join(__dirname, 'chrome_profiles', ownerId)}`
            ] 
        }
    });

    client.on('qr', qr => {
        console.log(`[QR] For ${ownerId} generated.`);
        io.emit(`qr-${ownerId}`, qr); 
    });

    client.on('ready', () => {
        console.log(`✅ [READY] Bot active for: ${ownerId}`);
        sessions.set(ownerId, client); 
        io.emit(`ready-${ownerId}`, { status: 'connected' });
    });

    client.on('message', async msg => {
        if (!msg.from.endsWith('@c.us')) return;

        try {
            // Log mein check karo: Kya ye wahi ownerId hai jiska ye bot hai?
            console.log(`📩 [BOT: ${ownerId}] Received: "${msg.body}" from ${msg.from}`);

            const biz = await Business.findOne({ ownerId: ownerId });
            if (!biz) return;

            const prompt = `Role: Support for ${biz.businessName}. Tone: Hinglish. Context: ${biz.services}. User says: ${msg.body}`;

            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }]
            });

            const aiReply = completion.choices[0].message.content;

            // Strict instance send
            await client.sendMessage(msg.from, aiReply);
            
            await new Lead({ ownerId, phoneNumber: msg.from, query: msg.body }).save();
            console.log(`🚀 [${ownerId}] Replied on behalf of ${biz.businessName}`);

        } catch (err) { 
            console.log(`❌ [ERROR ${ownerId}]:`, err.message); 
        }
    });

    client.initialize().catch(err => {
        console.error(`Init failed for ${ownerId}`, err);
        sessions.delete(ownerId);
    });
}
/* ===================== API ENDPOINTS ===================== */

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, businessName } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const ownerId = "biz_" + uuidv4().split('-')[0];
        const newUser = new User({ email, password: hashedPassword, businessName, ownerId });
        await newUser.save();
        await new Business({ ownerId, businessName }).save();
        res.json({ success: true, ownerId, businessName });
    } catch (err) { res.status(400).json({ success: false, message: "Email exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, ownerId: user.ownerId, businessName: user.businessName });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.get('/api/leads', async (req, res) => {
    const leads = await Lead.find({ ownerId: req.headers['x-owner-id'] }).sort({ timestamp: -1 });
    res.json(leads);
});

app.post('/api/start-bot', (req, res) => {
    const ownerId = req.headers['x-owner-id'];
    initializeUserBot(ownerId);
    res.json({ success: true });
});

app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
);
app.get('/admin', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'admin.html'))
);
app.get('/login', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'login.html'))
);

// Port listen setup (server.listen use karna hai app.listen nahi)
const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`🚀 SaaS running: http://localhost:${PORT}`);
    const bizs = await Business.find({}, 'ownerId');
    for (const b of bizs) {
        await new Promise(r => setTimeout(r, 2000));
        initializeUserBot(b.ownerId);
    }

});


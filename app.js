// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const path = require('path');
// const axios = require('axios');

// const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
// const { Groq } = require('groq-sdk');

// const multer = require('multer');
// const cloudinary = require('cloudinary').v2;

// const Lead = require('./models/Lead');
// const Business = require('./models/Business');

// const app = express();
// app.use(express.json({ limit: '20mb' }));
// app.use(express.static('public'));

// /* ===================== CLOUDINARY ===================== */
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const upload = multer({
//     storage: multer.memoryStorage(),
//     limits: { fileSize: 10 * 1024 * 1024 }
// });

// /* ===================== DATABASE ===================== */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("SaaS DB Connected ✅"))
  .catch(err => {
    console.error("MongoDB error ❌", err);
    process.exit(1);
  });

// /* ===================== GROQ ===================== */
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// /* ===================== WHATSAPP ===================== */
// const client = new Client({
//     authStrategy: new LocalAuth(),
//     puppeteer: {
//         headless: true,
//         args: ['--no-sandbox', '--disable-setuid-sandbox']
//     }
// });

// client.on('qr', qr => {
//     console.log('Scan QR Code:');
//     qrcode.generate(qr, { small: true });
// });

// client.on('ready', () => console.log('ZylotAi WhatsApp Bot LIVE 🚀'));
// client.on('disconnected', () => client.initialize());

// client.initialize();

// /* ===================== BOT LOGIC ===================== */
// client.on('message', async msg => {
//     if (!msg.from.endsWith('@c.us')) return;

//     try {
//         const biz = await Business.findOne({ ownerId: 'admin' });
//         if (!biz) return;

//         const chat = await msg.getChat();
//         const userText = msg.body;
//         const lowerText = userText.toLowerCase();

//         // 1. DYNAMIC AUTO-GREETING (Sab ke liye kaam karega)
//         const greetings = ['hi', 'hello', 'hey', 'hii', 'hy', 'namaste', 'helo'];
//         if (greetings.includes(userText.trim().toLowerCase())) {
//             await chat.sendStateTyping();
//             // Business name aur details database se uthayega
//             const welcomeMsg = `Namaste! 🙏 *${biz.businessName}* mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?`;
//             return await msg.reply(welcomeMsg);
//         }

//         await chat.sendStateTyping();

//         // 2. BUILD KNOWLEDGE BASE (Dynamic)
//         let propertiesText = '';
//         if (biz.properties && biz.properties.length > 0) {
//             propertiesText = biz.properties.map((p, i) => `
// Option ${i + 1}:
// Item/Property: ${p.title}
// Price: ${p.price}
// Location/Details: ${p.location}
// `).join('\n');
//         }
// // Extra Details ko text mein convert karo
// let extraDetailsText = '';
// if (biz.extraDetails) {
//     try {
//         const extras = typeof biz.extraDetails === 'string' ? JSON.parse(biz.extraDetails) : biz.extraDetails;
//         extraDetailsText = extras.map(d => `${d.label}: ${d.value}`).join('\n');
//     } catch (e) { console.log("Extra details parse error"); }
// }
//         // 3. FULL DYNAMIC PROMPT (No Manual Names)
//         const prompt = `
// Role: You are a professional senior consultant for "${biz.businessName}". 
// Personality: Very helpful, polite, and sounds like a real human. Do NOT act like an AI.

// Business Details:
// - Name: ${biz.businessName}
// - Location: ${biz.address || 'Noida'}
// - Contact Number: ${biz.contactNumber || 'Contact through here'}
// - Services: ${biz.services || 'Premium services'}
// Extra Information & FAQs:
// ${extraDetailsText || 'No extra details provided.'}

// Our Offerings:
// ${propertiesText}

// Rules:
// 1. Talk in NATURAL HINGLISH. Use words like "Ji", "Sir", "Bhai", "Bilkul".
// 2. Agar user photos, price, ya details maange, toh reply ke end mein "IMAGE_SEND:1" likho.
// 3. User ko hamesha wahi details do jo upar "Business Details" mein di gayi hain. Fake number mat do.
// 4. Har reply ek sawal (Follow-up) ke saath khatam karo taaki baat aage badhe.
// 5. Agar koi aisi cheez maange jo list mein nahi hai, toh politely mana karke dusra option dikhao.

// User Message: "${userText}"
// Reply:`;

//         const completion = await groq.chat.completions.create({
//             model: 'llama-3.3-70b-versatile',
//             messages: [{ role: 'user', content: prompt }],
//             temperature: 0.7
//         });

//         let reply = completion.choices[0]?.message?.content || 'Ji, boliye kaise help karu? 😊';
//         const shouldSendImages = reply.toLowerCase().includes('image_send:1');
//         reply = reply.replace(/image_send:1/gi, '').trim();

//         await msg.reply(reply);

//         // 4. IMAGE SENDING LOGIC
//         if (shouldSendImages && biz.properties?.length) {
//             let matchedProp = biz.properties.find(p =>
//                 lowerText.includes(p.title?.toLowerCase()) ||
//                 lowerText.includes(p.location?.toLowerCase())
//             ) || biz.properties[0];

//             if (matchedProp && matchedProp.images?.length > 0) {
//                 await chat.sendMessage(`Ye rahi *${matchedProp.title}* ki photos 👇`);

//                 for (const imgUrl of matchedProp.images.slice(0, 5)) {
//                     try {
//                         const response = await axios.get(imgUrl.trim(), { 
//                             responseType: 'arraybuffer',
//                             timeout: 10000 
//                         });
//                         const media = new MessageMedia(
//                             response.headers['content-type'],
//                             Buffer.from(response.data).toString('base64'),
//                             'image.jpg'
//                         );
//                         await chat.sendMessage(media, {
//                             caption: `✅ *${matchedProp.title}*\n💰 ${matchedProp.price}\n📍 ${matchedProp.location}`
//                         });
//                         await new Promise(r => setTimeout(r, 2000));
//                     } catch (e) {
//                         console.log('Skipping broken link');
//                     }
//                 }
//             }
//         }

//         // 5. LEAD CAPTURE
//         if (userText.length > 10 || shouldSendImages) {
//             await new Lead({
//                 phoneNumber: msg.from,
//                 query: userText,
//                 source: 'whatsapp',
//                 timestamp: new Date()
//             }).save();
//         }

//     } catch (err) {
//         console.error('Bot Error:', err);
//     }
// });

// /* ===================== ADMIN APIs ===================== */
// app.post('/api/setup-business', upload.array('images', 15), async (req, res) => {
//     try {
//         let imageUrls = [];
//         if (req.files && req.files.length > 0) {
//             for (const file of req.files) {
//                 const result = await new Promise((resolve, reject) => {
//                     const stream = cloudinary.uploader.upload_stream(
//                         { folder: 'zylotai' },
//                         (err, r) => err ? reject(err) : resolve(r)
//                     );
//                     stream.end(file.buffer);
//                 });
//                 imageUrls.push(result.secure_url);
//             }
//         }

//         const existingBiz = await Business.findOne({ ownerId: 'admin' });
//         const finalImages = imageUrls.length > 0 ? imageUrls : (existingBiz?.properties[0]?.images || []);

//         // EXTRA DETAILS KA LOGIC YAHA HAI
//         let extraDetails = req.body.extraDetails; 

//         const updateData = {
//             businessName: req.body.businessName,
//             address: req.body.address,
//             contactNumber: req.body.contactNumber,
//             services: req.body.services,
//             customInstructions: req.body.customInstructions,
//             extraDetails: extraDetails, // Save as string or array based on your Schema
//             properties: [{
//                 title: req.body.propertyTitle || "Premium Option",
//                 price: req.body.propertyPrice || "Price on Request",
//                 location: req.body.address,
//                 images: finalImages
//             }]
//         };

//         await Business.findOneAndUpdate(
//             { ownerId: 'admin' },
//             { $set: updateData }, 
//             { upsert: true, new: true }
//         );

//         res.json({ success: true, message: "AI Updated Successfully!" });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// });

// app.get('/api/leads', async (req, res) => {
//     const leads = await Lead.find().sort({ createdAt: -1 });
//     res.json(leads);
// });

// app.get('/', (req, res) =>
//     res.sendFile(path.join(__dirname, 'public', 'index.html'))
// );
// app.get('/admin', (req, res) =>
//     res.sendFile(path.join(__dirname, 'public', 'admin.html'))
// );

// // GET existing business
// app.get('/api/business', async (req, res) => {
//     try {
//         const biz = await Business.findOne({ ownerId: 'admin' });
//         res.json(biz || {});
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch business' });
//     }
// });



// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () =>
//     console.log(`🚀 Server running on http://localhost:${PORT}`)
// );


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

mongoose.connect(process.env.MONGODB_URI).then(() => console.log('SaaS DB Connected ✅'));

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

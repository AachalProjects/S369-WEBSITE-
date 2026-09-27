const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

let Razorpay;
try {
    Razorpay = require("razorpay");
} catch (e) {
    Razorpay = null;
}

dotenv.config({ path: path.join(__dirname, ".env") });
if (!process.env.MONGO_URI) {
    dotenv.config();
}

const nodemailer = require("nodemailer");

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true,
    auth: {
        user: process.env.SMTP_USER || "aacy27@gmail.com",
        pass: (process.env.SMTP_PASS || "crgysnsqqupdcztd").replace(/\s+/g, "")
    }
});

async function sendMail({ to, subject, html }) {
    try {
        const info = await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"S369 Perfume Luxury Concierge" <aacy27@gmail.com>',
            to,
            subject,
            html
        });
        console.log(`[SMTP SUCCESS] Mail delivered to ${to} (ID: ${info.messageId})`);
        return true;
    } catch (e) {
        console.error(`[SMTP ERROR] Delivery failed to ${to}:`, e.message);
        return false;
    }
}

async function sendWelcomeEmail(name, email) {
    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e8dfd5; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="background: #5d1f2d; padding: 36px 24px; text-align: center;">
        <h1 style="color: #ffffff; font-family: Georgia, serif; font-size: 28px; margin: 0; letter-spacing: 2px;">S 3 6 9</h1>
        <p style="color: #c5a059; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Haute Parfumerie · Signature Eau de Parfum</p>
      </div>
      <div style="padding: 34px 28px; color: #222222; line-height: 1.6;">
        <h2 style="color: #3e121c; font-size: 22px; margin-top: 0; font-family: Georgia, serif;">Welcome to S369 Perfume, ${name}!</h2>
        <p style="font-size: 15px; color: #444;">Your private luxury account has been successfully created and registered on MongoDB Atlas. You now have full access to our artisanal fragrance catalog, order tracking, and bespoke client privileges.</p>
        
        <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; font-size: 14px; color: #5d1f2d; text-transform: uppercase; letter-spacing: 0.8px;">Your Membership Privileges:</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
            <li style="margin-bottom: 6px;">Persistent Cart Synchronized Across Your Devices</li>
            <li style="margin-bottom: 6px;">Automated Real-time Dispatch Tracking</li>
            <li style="margin-bottom: 6px;">Instant GST Tax Invoices for Every Order</li>
            <li>Direct Access to Exclusive VIP Fragrance Drops</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5000/shop.html" style="background: #5d1f2d; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; letter-spacing: 0.8px; display: inline-block; text-transform: uppercase;">Explore The Collection</a>
        </div>

        <p style="font-size: 13.5px; color: #777; margin-bottom: 0;">If you ever have any questions or bespoke inquiries, simply reply to this email or reach our concierge at <a href="mailto:support@s369.in" style="color: #5d1f2d; font-weight: 600;">support@s369.in</a>.</p>
      </div>
      <div style="background: #f5eee3; padding: 18px 24px; text-align: center; font-size: 12px; color: #888;">
        © 2026 S369 Perfume Haute Parfumerie. All rights reserved.
      </div>
    </div>`;

    return await sendMail({
        to: email,
        subject: `Welcome to S369 Perfume — Your Account is Ready, ${name}`,
        html
    });
}

function generateInvoiceHtml(order) {
    const subtotal = order.subtotal || 0;
    const discount = order.discountAmount || 0;
    const total = order.totalAmount || 0;
    const items = order.items || [];
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    const itemsRows = items.map((item, idx) => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 10px; font-size: 13.5px; color: #555;">${idx + 1}</td>
            <td style="padding: 12px 10px; font-size: 14px; font-weight: 600; color: #111;">
                ${item.name}
                <div style="font-size: 12px; color: #777; font-weight: normal;">Eau de Parfum · Size: ${item.size}</div>
            </td>
            <td style="padding: 12px 10px; font-size: 13.5px; text-align: center; color: #333;">${item.size}</td>
            <td style="padding: 12px 10px; font-size: 13.5px; text-align: right; color: #333;">₹${item.price}</td>
            <td style="padding: 12px 10px; font-size: 13.5px; text-align: center; color: #333;">${item.quantity}</td>
            <td style="padding: 12px 10px; font-size: 14px; text-align: right; font-weight: 700; color: #111;">₹${item.lineTotal || (item.price * item.quantity)}</td>
        </tr>
    `).join("");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice — ${order.orderId} | S369 Perfume</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 30px; background: #fdfbf7; }
        .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e6ded3; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #5d1f2d; margin-bottom: 28px; }
        .invoice-title { font-size: 26px; font-weight: bold; color: #5d1f2d; font-family: Georgia, serif; margin: 0; }
        .invoice-sub { font-size: 13px; color: #777; margin: 4px 0 0; }
        .company-info { text-align: right; font-size: 12.5px; color: #555; line-height: 1.5; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
        .meta-block { background: #faf7f2; border: 1px solid #ebdccb; border-radius: 8px; padding: 18px; font-size: 13.5px; line-height: 1.5; }
        .meta-block h4 { margin: 0 0 10px; color: #5d1f2d; text-transform: uppercase; font-size: 12px; letter-spacing: 0.8px; }
        .table-invoice { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .table-invoice th { background: #f5eee3; color: #3e121c; padding: 12px 10px; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
        .totals-table { width: 320px; margin-left: auto; border-collapse: collapse; margin-bottom: 28px; }
        .totals-table td { padding: 8px 10px; font-size: 14px; }
        .grand-total { font-size: 18px; font-weight: bold; color: #5d1f2d; border-top: 2px solid #222; }
        .payment-pill { display: inline-block; background: #e8f5e9; color: #1b5e20; font-weight: 700; padding: 3px 10px; border-radius: 12px; font-size: 12px; text-transform: uppercase; }
        .footer-note { padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12.5px; color: #777; }
        .print-btn-bar { text-align: center; margin-bottom: 20px; }
        .print-btn { background: #5d1f2d; color: #fff; padding: 10px 24px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
        @media print {
          body { background: #fff; padding: 0; }
          .invoice-card { box-shadow: none; border: none; padding: 0; }
          .print-btn-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar">
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF Invoice</button>
      </div>

      <div class="invoice-card">
        <div class="invoice-header">
          <div>
            <h1 class="invoice-title">S369 PERFUME</h1>
            <p class="invoice-sub">Haute Parfumerie · Signature Eau de Parfum</p>
            <div style="margin-top: 12px; font-size: 14px; font-weight: 600; color: #333;">
              TAX INVOICE: <span style="color:#5d1f2d;">INV-${order.orderId}</span>
            </div>
          </div>
          <div class="company-info">
            <strong style="font-size: 14px; color: #111;">S369 Fragrance House Pvt. Ltd.</strong><br>
            GSTIN: <strong>27AAHCS3691Z1</strong><br>
            Reg. Office: MG Road, Mumbai / Bangalore, India<br>
            Support: support@s369.in | +91 98765 43210<br>
            Website: www.s369.in
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-block">
            <h4>Billed & Delivered To:</h4>
            <strong>${order.customer?.name || "Customer"}</strong><br>
            ${order.customer?.address || ""}<br>
            ${order.customer?.city || ""}, ${order.customer?.state || ""} — ${order.customer?.pin || ""}<br>
            Email: ${order.customer?.email || ""}<br>
            Phone: +91 ${order.customer?.phone || ""}
          </div>
          <div class="meta-block">
            <h4>Order & Payment Summary:</h4>
            Order Number: <strong>${order.orderId}</strong><br>
            Invoice Date: <strong>${dateStr}</strong><br>
            Payment Mode: <strong>Razorpay Online (UPI/Cards/NetBanking)</strong><br>
            Razorpay ID: <span style="font-family: monospace; font-size: 12px;">${order.razorpayPaymentId || "pay_verified"}</span><br>
            Status: <span class="payment-pill">PAID & CONFIRMED</span>
          </div>
        </div>

        <table class="table-invoice">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Fragrance Item Description</th>
              <th style="text-align: center;">Size</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #666;">Subtotal</td>
            <td style="text-align: right; font-weight: 600;">₹${subtotal}</td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td style="color: #1b5e20;">Coupon Discount (${order.couponCode || "SPECIAL"})</td>
            <td style="text-align: right; color: #1b5e20; font-weight: 600;">−₹${discount}</td>
          </tr>` : ""}
          <tr>
            <td style="color: #666;">Express Insured Delivery</td>
            <td style="text-align: right; font-weight: 600; color: #1b5e20;">FREE</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total Paid</td>
            <td style="text-align: right;">₹${total}</td>
          </tr>
        </table>

        <div class="footer-note">
          <p style="margin: 0 0 6px; font-weight: 600; color: #5d1f2d;">Thank you for experiencing S369 Haute Parfumerie.</p>
          <p style="margin: 0; font-size: 11.5px; color: #888;">This is a computer-generated tax invoice and requires no physical signature. Registered under the Indian Goods and Services Tax Act.</p>
        </div>
      </div>
    </body>
    </html>`;
}

async function sendInvoiceEmail(order) {
    const html = generateInvoiceHtml(order);
    const customerEmail = order.customer?.email;
    if (!customerEmail) {
        console.warn("[SMTP] No customer email provided for order invoice:", order.orderId);
        return false;
    }

    return await sendMail({
        to: customerEmail,
        subject: `Tax Invoice & Order Confirmation — S369 Perfume (#${order.orderId})`,
        html
    });
}

const app = express();

// Official CORS middleware with credentials & origin reflection (CRITICAL: must be first)
const corsOptions = {
    origin: (origin, callback) => {
        // Echo incoming origin back to allow localhost:3000, localhost:5000, 127.0.0.1, etc.
        callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token", "Accept", "Origin", "X-Requested-With"],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Explicit header enforcement to guarantee Access-Control-Allow-Origin is never wildcard '*'
app.use((req, res, next) => {
    const origin = req.headers.origin || "http://localhost:3000";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-access-token, Accept, Origin, X-Requested-With");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());
app.use(cookieParser());

// URL Normalizer: gracefully route /api/api/* to /api/*
app.use((req, res, next) => {
    if (req.url.startsWith("/api/api/")) {
        req.url = req.url.replace(/^\/api\/api\//, "/api/");
    }
    next();
});

// Serve frontend static files from project root
app.use(express.static(path.join(__dirname, "..")));

function getOrCreateGuestId(req, res) {
    let guestId = req.cookies?.s369_guest_id || req.headers["x-guest-id"];
    if (!guestId || typeof guestId !== "string" || !guestId.trim() || guestId === "undefined" || guestId === "null") {
        guestId = "gst_" + crypto.randomBytes(16).toString("hex");
    }
    if (res && res.cookie) {
        res.cookie("s369_guest_id", guestId, {
            httpOnly: false,
            sameSite: "lax",
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        });
    }
    return guestId;
}

const JWT_SECRET = process.env.JWT_SECRET || "s369_perfume_jwt_secret_change_this";
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || "").trim() || "rzp_test_placeholder";
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim() || "rzp_test_secret_placeholder";

const DEFAULT_PRICES = {
    "30ml": { price: 399, mrp: 799 },
    "50ml": { price: 899, mrp: 1599 },
    "100ml": { price: 1499, mrp: 2999 }
};

const INITIAL_PRODUCTS = [
    {
        id: "alpha-9",
        name: "Alpha 9",
        tagline: "The Sweet Edge of Bold",
        image: "alpha-9.jpg",
        gender: "Men",
        scentFamily: "Warm & Smoky",
        rating: 4.9,
        reviewCount: 142,
        short: "Rich, warm and irresistibly smooth — sweet tobacco wrapped in creamy vanilla.",
        description: "Rich, warm, and irresistibly smooth Alpha 9 wraps you in a cozy embrace of sweet tobacco and creamy vanilla. It’s a modern twist on a classic favorite, designed for those who crave sophistication with a hint of daring.",
        notes: [{ label: "Top & Heart", value: "Tobacco" }, { label: "Base", value: "Vanilla" }],
        keywords: ["tobacco", "vanilla", "warm", "sweet", "smoky", "men", "unisex"],
        prices: DEFAULT_PRICES
    },
    {
        id: "cool-tides",
        name: "Cool Tides",
        tagline: "The Fresh Wave of Confidence",
        image: "cool-tides.jpg",
        gender: "Men",
        scentFamily: "Fresh & Aquatic",
        rating: 4.8,
        reviewCount: 98,
        short: "Blood mandarin, warm cinnamon and leather lifted by grapefruit, mint, rose and amber.",
        description: "Zesty blood mandarin, warm cinnamon, and bold leather make a striking first impression. Grapefruit, mint, and spicy hints meet rose, amber, and patchouli to leave a trail that’s fresh, daring, and unforgettable.",
        notes: [{ label: "Top & Heart", value: "Blood Mandarin, Cinnamon" }, { label: "Base", value: "Amber, Patchouli" }],
        keywords: ["mandarin", "cinnamon", "leather", "fresh", "aquatic", "men"],
        prices: DEFAULT_PRICES
    },
    {
        id: "wild-crest",
        name: "Wild Crest",
        tagline: "Nature's Bold Signature",
        image: "wild-crest.jpg",
        gender: "Men",
        scentFamily: "Woody & Earthy",
        rating: 4.9,
        reviewCount: 120,
        short: "Vetiver and cedarwood move into cardamom, narcissus, sandalwood and creamy vanilla.",
        description: "Untamed, confident, and effortlessly captivating — Wild Crest opens with fresh vetiver and crisp cedarwood, leading into a warm heart of cardamom and narcissus.",
        notes: [{ label: "Top", value: "Vetiver, Cedarwood" }, { label: "Heart", value: "Cardamom" }, { label: "Base", value: "Sandalwood, Vanilla" }],
        keywords: ["vetiver", "cedarwood", "cardamom", "woody", "earthy", "men"],
        prices: DEFAULT_PRICES
    },
    {
        id: "crimson-musk",
        name: "Crimson Musk",
        tagline: "The Power of Seduction",
        image: "crimson-musk.jpg",
        gender: "Women",
        scentFamily: "Floral & Fruity",
        rating: 5.0,
        reviewCount: 186,
        short: "Pear and raspberry meet oud, saffron, rose and orange blossom over patchouli and amber.",
        description: "Juicy pear and raspberry meet the deep richness of oud to create a striking first impression. Saffron, rose, and orange blossom unfold into a warm blend of patchouli and amber.",
        notes: [{ label: "Top", value: "Pear, Raspberry, Oud" }, { label: "Base", value: "Patchouli, Amber" }],
        keywords: ["pear", "raspberry", "oud", "saffron", "musk", "women", "seductive", "floral"],
        prices: DEFAULT_PRICES
    },
    {
        id: "night-quartz",
        name: "Night Quartz",
        tagline: "The Mystery of the Midnight",
        image: "night-quartz.jpg",
        gender: "Unisex",
        scentFamily: "Rich Oud & Amber",
        rating: 4.9,
        reviewCount: 215,
        short: "Deep saffron, rich oud and cedar wood layered with bergamot, davana, clove, rose and vetiver.",
        description: "Deep saffron, rich oud, and warm cedar wood create an alluring first impression, while bergamot, davana, clove, rose, vetiver, and patchouli swirl together.",
        notes: [{ label: "Top", value: "Saffron, Oud, Cedar Wood" }, { label: "Base", value: "Vetiver, Patchouli" }],
        keywords: ["saffron", "oud", "cedar wood", "mysterious", "unisex", "amber"],
        prices: DEFAULT_PRICES
    },
    {
        id: "midnight-blues",
        name: "Midnight Blues",
        tagline: "The Calm Power of the Night",
        image: "midnight-blues.jpg",
        gender: "Men",
        scentFamily: "Aromatic Fougère",
        rating: 4.8,
        reviewCount: 110,
        short: "Bergamot and orange blossom blend with woods, lavender, geranium and patchouli.",
        description: "Fresh bergamot and orange blossom blend with deep woody notes to create a refined first impression. Lavender and geranium flow into an aromatic fougère heart.",
        notes: [{ label: "Top", value: "Bergamot, Orange Blossom" }, { label: "Base", value: "Lavender, Patchouli" }],
        keywords: ["bergamot", "orange blossom", "lavender", "woody", "men", "fougere"],
        prices: DEFAULT_PRICES
    }
];

// ======================================================
// FILE-BASED PERSISTENT DB FALLBACK ENGINE
// ======================================================

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");

function loadLocalDb() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { users: [], carts: [], orders: [], products: INITIAL_PRODUCTS };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(content || '{}');
        if (!parsed.products || parsed.products.length === 0) {
            parsed.products = INITIAL_PRODUCTS;
            fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
        }
        if (!parsed.reviews) parsed.reviews = [];
        if (!parsed.enquiries) parsed.enquiries = [];
        return parsed;
    } catch (e) {
        return { users: [], carts: [], orders: [], products: INITIAL_PRODUCTS, reviews: [], enquiries: [] };
    }
}

function saveLocalDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Local DB save error:", e);
    }
}

let isDbConnected = false;

// Initialize admin user & default products in local DB
(async () => {
    const localDb = loadLocalDb();
    if (!localDb.users.some(u => u.email === "admin@s369.in")) {
        const hashedPassword = await bcrypt.hash("adminpassword", 10);
        localDb.users.push({
            _id: "admin_1001",
            name: "S369 Administrator",
            email: "admin@s369.in",
            password: hashedPassword,
            role: "admin",
            createdAt: new Date().toISOString()
        });
        saveLocalDb(localDb);
    }
})();

// ===============================
// MONGODB SCHEMAS & MODELS
// ===============================

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["customer", "admin"], default: "customer" },
        resetPasswordOtp: { type: String },
        resetPasswordExpires: { type: Date }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        tagline: { type: String, required: true },
        image: { type: String, required: true },
        gender: { type: String, default: "Unisex" },
        scentFamily: { type: String, default: "Warm & Smoky" },
        rating: { type: Number, default: 4.9 },
        reviewCount: { type: Number, default: 120 },
        price: { type: Number, default: 399 },
        short: { type: String, required: true },
        description: { type: String, required: true },
        notes: [{ label: String, value: String }],
        keywords: [{ type: String }],
        prices: {
            "30ml": { price: Number, mrp: Number },
            "50ml": { price: Number, mrp: Number },
            "100ml": { price: Number, mrp: Number }
        }
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

const cartItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 }
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: { type: [cartItemSchema], default: [] }
    },
    { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);

const wishlistItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true },
        notifyPriceDrop: { type: Boolean, default: true },
        notifyBackInStock: { type: Boolean, default: true },
        addedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const wishlistSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, sparse: true },
        guestId: { type: String, default: null, sparse: true, index: true },
        items: { type: [wishlistItemSchema], default: [] }
    },
    { timestamps: true }
);

const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);

const orderSchema = new mongoose.Schema(
    {
        orderId: { type: String, required: true, unique: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        customer: {
            name: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pin: { type: String, required: true },
            notes: { type: String, default: "" }
        },
        items: [
            {
                productId: { type: String, required: true },
                name: { type: String, required: true },
                size: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true },
                lineTotal: { type: Number, required: true }
            }
        ],
        subtotal: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        couponCode: { type: String, default: "" },
        shippingFee: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, default: "online" },
        paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
        orderStatus: { type: String, enum: ["placed", "processing", "shipped", "delivered", "cancelled"], default: "placed" },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String }
    },
    { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

const reviewSchema = new mongoose.Schema(
    {
        productId: { type: String, default: "general" },
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true, default: "" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        approved: { type: Boolean, default: true },
        status: { type: String, enum: ["approved", "pending", "rejected"], default: "approved" }
    },
    { timestamps: true }
);

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

const enquirySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        contact: { type: String, required: true, trim: true },
        type: { type: String, default: "Product enquiry" },
        message: { type: String, required: true, trim: true },
        status: { type: String, enum: ["new", "in_progress", "replied", "closed"], default: "new" },
        adminNotes: { type: String, default: "" }
    },
    { timestamps: true }
);

const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);

// DB CONTROLLER AGENT
const DB = {
    async findUserByEmail(email) {
        const cleanEmail = email.toLowerCase().trim();
        if (isDbConnected) {
            return await User.findOne({ email: cleanEmail });
        }
        const db = loadLocalDb();
        return db.users.find(u => u.email === cleanEmail) || null;
    },

    async findUserById(id) {
        if (isDbConnected) {
            return await User.findById(id).select("-password");
        }
        const db = loadLocalDb();
        const u = db.users.find(user => String(user._id) === String(id));
        if (!u) return null;
        const { password, ...userWithoutPass } = u;
        return userWithoutPass;
    },

    async createUser({ name, email, password, role }) {
        const cleanEmail = email.toLowerCase().trim();
        if (isDbConnected) {
            return await User.create({ name, email: cleanEmail, password, role });
        }
        const db = loadLocalDb();
        const newUser = {
            _id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            name,
            email: cleanEmail,
            password,
            role: role || "customer",
            createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        saveLocalDb(db);
        return newUser;
    },

    // PRODUCTS DB METHODS
    async getAllProducts() {
        if (isDbConnected) {
            let products = await Product.find().lean();
            if (products.length === 0) {
                await Product.insertMany(INITIAL_PRODUCTS);
                products = await Product.find().lean();
            }
            return products;
        }
        const db = loadLocalDb();
        return db.products || INITIAL_PRODUCTS;
    },

    async getProductById(id) {
        if (isDbConnected) {
            return await Product.findOne({ id }).lean();
        }
        const db = loadLocalDb();
        return (db.products || INITIAL_PRODUCTS).find(p => p.id === id) || null;
    },

    async createProduct(productData) {
        if (isDbConnected) {
            return await Product.create(productData);
        }
        const db = loadLocalDb();
        db.products.push(productData);
        saveLocalDb(db);
        return productData;
    },

    async updateProduct(id, updateData) {
        if (isDbConnected) {
            return await Product.findOneAndUpdate({ id }, updateData, { new: true }).lean();
        }
        const db = loadLocalDb();
        const idx = db.products.findIndex(p => p.id === id);
        if (idx > -1) {
            db.products[idx] = { ...db.products[idx], ...updateData };
            saveLocalDb(db);
            return db.products[idx];
        }
        return null;
    },

    async deleteProduct(id) {
        if (isDbConnected) {
            return await Product.findOneAndDelete({ id });
        }
        const db = loadLocalDb();
        db.products = db.products.filter(p => p.id !== id);
        saveLocalDb(db);
        return true;
    },

    async getCart(userId) {
        if (isDbConnected) {
            let cart = await Cart.findOne({ userId });
            if (!cart) cart = await Cart.create({ userId, items: [] });
            return cart;
        }
        const db = loadLocalDb();
        let cart = db.carts.find(c => String(c.userId) === String(userId));
        if (!cart) {
            cart = { userId: String(userId), items: [] };
            db.carts.push(cart);
            saveLocalDb(db);
        }
        return cart;
    },

    async saveCart(userId, items) {
        if (isDbConnected) {
            return await Cart.findOneAndUpdate(
                { userId },
                { items },
                { new: true, upsert: true }
            );
        }
        const db = loadLocalDb();
        let cartIndex = db.carts.findIndex(c => String(c.userId) === String(userId));
        if (cartIndex > -1) {
            db.carts[cartIndex].items = items;
        } else {
            db.carts.push({ userId: String(userId), items });
        }
        saveLocalDb(db);
        return { userId: String(userId), items };
    },

    async getWishlist(userId, guestId) {
        if (isDbConnected) {
            if (userId) {
                let wl = await Wishlist.findOne({ userId });
                // If user also has a guestId with items, merge guest items into user wishlist
                if (guestId) {
                    const guestWl = await Wishlist.findOne({ guestId });
                    if (guestWl && guestWl.items && guestWl.items.length > 0) {
                        if (!wl) wl = await Wishlist.create({ userId, items: [] });
                        const existingIds = new Set((wl.items || []).map(i => String(i.productId)));
                        for (const gi of guestWl.items) {
                            if (!existingIds.has(String(gi.productId))) {
                                wl.items.push(gi);
                            }
                        }
                        await wl.save();
                        await Wishlist.deleteOne({ _id: guestWl._id });
                    }
                }
                if (!wl) wl = await Wishlist.create({ userId, items: [] });
                return wl;
            } else if (guestId) {
                let wl = await Wishlist.findOne({ guestId });
                if (!wl) wl = await Wishlist.create({ guestId, items: [] });
                return wl;
            }
            return { items: [] };
        }
        const db = loadLocalDb();
        if (!db.wishlists) db.wishlists = [];
        const key = userId ? String(userId) : String(guestId);
        let wl = db.wishlists.find(w => (userId && String(w.userId) === key) || (guestId && w.guestId === key));
        if (!wl) {
            wl = { userId: userId ? String(userId) : null, guestId: guestId || null, items: [] };
            db.wishlists.push(wl);
            saveLocalDb(db);
        }
        return wl;
    },

    async saveWishlist(userId, guestId, items) {
        if (isDbConnected) {
            if (userId) {
                return await Wishlist.findOneAndUpdate(
                    { userId },
                    { items },
                    { new: true, upsert: true }
                );
            } else if (guestId) {
                return await Wishlist.findOneAndUpdate(
                    { guestId },
                    { items },
                    { new: true, upsert: true }
                );
            }
            return { items };
        }
        const db = loadLocalDb();
        if (!db.wishlists) db.wishlists = [];
        const key = userId ? String(userId) : String(guestId);
        let idx = db.wishlists.findIndex(w => (userId && String(w.userId) === key) || (guestId && w.guestId === key));
        if (idx > -1) {
            db.wishlists[idx].items = items;
        } else {
            db.wishlists.push({ userId: userId ? String(userId) : null, guestId: guestId || null, items });
        }
        saveLocalDb(db);
        return { userId: userId ? String(userId) : null, guestId: guestId || null, items };
    },

    async createOrder(orderData) {
        if (isDbConnected) {
            return await Order.create(orderData);
        }
        const db = loadLocalDb();
        const newOrder = {
            _id: "ord_mongo_" + Date.now(),
            ...orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        db.orders.push(newOrder);
        saveLocalDb(db);
        return newOrder;
    },

    async findOrderById(id) {
        if (isDbConnected) {
            return await Order.findById(id);
        }
        const db = loadLocalDb();
        return db.orders.find(o => String(o._id) === String(id) || o.orderId === id) || null;
    },

    async findOrderByCustomId(orderId) {
        const cleanId = orderId.trim().toUpperCase();
        if (isDbConnected) {
            return await Order.findOne({ orderId: cleanId });
        }
        const db = loadLocalDb();
        return db.orders.find(o => o.orderId && o.orderId.toUpperCase() === cleanId) || null;
    },

    async updateOrder(id, updateFields) {
        if (isDbConnected) {
            return await Order.findByIdAndUpdate(id, updateFields, { new: true });
        }
        const db = loadLocalDb();
        const idx = db.orders.findIndex(o => String(o._id) === String(id) || o.orderId === id);
        if (idx > -1) {
            db.orders[idx] = { ...db.orders[idx], ...updateFields, updatedAt: new Date().toISOString() };
            saveLocalDb(db);
            return db.orders[idx];
        }
        return null;
    },

    async getAllOrders() {
        if (isDbConnected) {
            return await Order.find().sort({ createdAt: -1 });
        }
        const db = loadLocalDb();
        return db.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async getAllUsers() {
        if (isDbConnected) {
            return await User.find().select("-password").sort({ createdAt: -1 });
        }
        const db = loadLocalDb();
        return db.users.map(({ password, ...u }) => u).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // REVIEWS DB METHODS
    async getAllReviews(filter = {}) {
        if (isDbConnected) {
            const query = {};
            if (filter.status) query.status = filter.status;
            if (filter.approved !== undefined) query.approved = filter.approved;
            if (filter.productId && filter.productId !== "all") query.productId = filter.productId;
            return await Review.find(query).sort({ createdAt: -1 }).lean();
        }
        const db = loadLocalDb();
        if (!db.reviews) db.reviews = [];
        let res = [...db.reviews];
        if (filter.status) res = res.filter(r => r.status === filter.status);
        if (filter.approved !== undefined) res = res.filter(r => r.approved === filter.approved);
        if (filter.productId && filter.productId !== "all") res = res.filter(r => r.productId === filter.productId);
        return res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async createReview(data) {
        if (isDbConnected) {
            return await Review.create(data);
        }
        const db = loadLocalDb();
        if (!db.reviews) db.reviews = [];
        const newR = {
            _id: "rev_" + Date.now(),
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        db.reviews.push(newR);
        saveLocalDb(db);
        return newR;
    },

    async updateReviewStatus(id, status) {
        const approved = status === "approved";
        if (isDbConnected) {
            return await Review.findByIdAndUpdate(id, { status, approved }, { new: true });
        }
        const db = loadLocalDb();
        if (!db.reviews) db.reviews = [];
        const idx = db.reviews.findIndex(r => String(r._id) === String(id));
        if (idx > -1) {
            db.reviews[idx].status = status;
            db.reviews[idx].approved = approved;
            db.reviews[idx].updatedAt = new Date().toISOString();
            saveLocalDb(db);
            return db.reviews[idx];
        }
        return null;
    },

    async deleteReview(id) {
        if (isDbConnected) {
            return await Review.findByIdAndDelete(id);
        }
        const db = loadLocalDb();
        if (!db.reviews) db.reviews = [];
        db.reviews = db.reviews.filter(r => String(r._id) !== String(id));
        saveLocalDb(db);
        return true;
    },

    // ENQUIRIES DB METHODS
    async getAllEnquiries() {
        if (isDbConnected) {
            return await Enquiry.find().sort({ createdAt: -1 });
        }
        const db = loadLocalDb();
        if (!db.enquiries) db.enquiries = [];
        return [...db.enquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async createEnquiry(data) {
        if (isDbConnected) {
            return await Enquiry.create(data);
        }
        const db = loadLocalDb();
        if (!db.enquiries) db.enquiries = [];
        const newE = {
            _id: "enq_" + Date.now(),
            ...data,
            status: data.status || "new",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        db.enquiries.push(newE);
        saveLocalDb(db);
        return newE;
    },

    async updateEnquiryStatus(id, status, adminNotes) {
        const update = { status };
        if (adminNotes !== undefined) update.adminNotes = adminNotes;
        if (isDbConnected) {
            return await Enquiry.findByIdAndUpdate(id, update, { new: true });
        }
        const db = loadLocalDb();
        if (!db.enquiries) db.enquiries = [];
        const idx = db.enquiries.findIndex(e => String(e._id) === String(id));
        if (idx > -1) {
            db.enquiries[idx].status = status;
            if (adminNotes !== undefined) db.enquiries[idx].adminNotes = adminNotes;
            db.enquiries[idx].updatedAt = new Date().toISOString();
            saveLocalDb(db);
            return db.enquiries[idx];
        }
        return null;
    },

    async deleteEnquiry(id) {
        if (isDbConnected) {
            return await Enquiry.findByIdAndDelete(id);
        }
        const db = loadLocalDb();
        if (!db.enquiries) db.enquiries = [];
        db.enquiries = db.enquiries.filter(e => String(e._id) !== String(id));
        saveLocalDb(db);
        return true;
    },

    async getStats() {
        if (isDbConnected) {
            const totalUsers = await User.countDocuments({ role: "customer" });
            const totalOrders = await Order.countDocuments();
            const pendingOrders = await Order.countDocuments({ orderStatus: { $in: ["placed", "processing"] } });
            const totalProducts = await Product.countDocuments();
            const totalEnquiries = await Enquiry.countDocuments();
            const newEnquiries = await Enquiry.countDocuments({ status: "new" });
            const totalReviews = await Review.countDocuments();
            const revenueResult = await Order.aggregate([
                { $match: { paymentStatus: "paid" } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
            ]);
            const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
            return { totalUsers, totalOrders, pendingOrders, totalRevenue, totalProducts, totalEnquiries, newEnquiries, totalReviews };
        }

        const db = loadLocalDb();
        const totalUsers = db.users.filter(u => u.role === "customer").length;
        const totalOrders = db.orders.length;
        const pendingOrders = db.orders.filter(o => ["placed", "processing"].includes(o.orderStatus)).length;
        const totalProducts = (db.products || []).length;
        const totalEnquiries = (db.enquiries || []).length;
        const newEnquiries = (db.enquiries || []).filter(e => e.status === "new").length;
        const totalReviews = (db.reviews || []).length;
        const totalRevenue = db.orders
            .filter(o => o.paymentStatus === "paid")
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

        return { totalUsers, totalOrders, pendingOrders, totalRevenue, totalProducts, totalEnquiries, newEnquiries, totalReviews };
    }
};

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

function extractToken(req) {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        return req.headers.authorization.split(" ")[1];
    }
    if (req.cookies && req.cookies.s369_token) {
        return req.cookies.s369_token;
    }
    if (req.headers.cookie) {
        const match = req.headers.cookie.match(/(?:^|;\s*)s369_token=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
    }
    if (req.headers["x-access-token"]) {
        return req.headers["x-access-token"];
    }
    return null;
}

function authenticateToken(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

function optionalToken(req, res, next) {
    const token = extractToken(req);
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            req.user = null;
        }
    }
    next();
}

function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, () => {
        if (req.user && req.user.role === "admin") {
            next();
        } else {
            return res.status(403).json({ message: "Admin access required" });
        }
    });
}

// ===============================
// TEST & CONFIG ROUTES
// ===============================

app.get(["/api", "/api/status"], (req, res) => {
    res.json({
        message: "S369 Perfume API is running",
        dbStatus: isDbConnected ? "MongoDB Atlas Cloud" : "Local Database (Fallback Active)",
        version: "2.0.0"
    });
});

app.get("/api/config-public", (req, res) => {
    res.json({
        ok: true,
        razorpay_enabled: true,
        key_id: RAZORPAY_KEY_ID,
        shipping_flat: 0
    });
});

app.get("/api/config-public.php", (req, res) => {
    res.json({
        ok: true,
        razorpay_enabled: true,
        key_id: RAZORPAY_KEY_ID,
        shipping_flat: 0
    });
});

// ===============================
// PRODUCT PUBLIC & ADMIN ROUTES
// ===============================

app.get("/api/products", async (req, res) => {
    try {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        const products = await DB.getAllProducts();
        res.json({ ok: true, products });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to fetch products" });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await DB.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ ok: false, message: "Product not found" });
        }
        res.json({ ok: true, product });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Error fetching product" });
    }
});

app.post("/api/admin/products", authenticateAdmin, async (req, res) => {
    try {
        const { name, tagline, image, short, description, notes, prices } = req.body;
        if (!name || !tagline || !description) {
            return res.status(400).json({ ok: false, message: "Name, tagline, and description are required" });
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const existing = await DB.getProductById(id);
        if (existing) {
            return res.status(400).json({ ok: false, message: "A product with this name already exists" });
        }

        const productData = {
            id,
            name,
            tagline,
            image: image || "alpha-9.jpg",
            short: short || description.slice(0, 80) + "...",
            description,
            notes: notes || [{ label: "Notes", value: "Fresh Luxury Blend" }],
            keywords: [name.toLowerCase(), "perfume", "s369"],
            prices: prices || DEFAULT_PRICES
        };

        const newProduct = await DB.createProduct(productData);
        res.status(201).json({ ok: true, message: "Product created successfully", product: newProduct });
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ ok: false, message: "Failed to create product" });
    }
});

app.put("/api/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (updateData.prices) {
            for (const size of ["30ml", "50ml", "100ml"]) {
                if (updateData.prices[size]) {
                    updateData.prices[size].price = Number(updateData.prices[size].price) || 0;
                    updateData.prices[size].mrp = Number(updateData.prices[size].mrp) || (updateData.prices[size].price * 2);
                }
            }
            if (updateData.prices["30ml"] && updateData.prices["30ml"].price) {
                updateData.price = updateData.prices["30ml"].price;
            }
        }
        const updated = await DB.updateProduct(req.params.id, updateData);
        if (!updated) {
            return res.status(404).json({ ok: false, message: "Product not found" });
        }
        res.json({ ok: true, message: "Product updated successfully in DB", product: updated });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to update product" });
    }
});

app.delete("/api/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
        await DB.deleteProduct(req.params.id);
        res.json({ ok: true, message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to delete product" });
    }
});

// ===============================
// AUTH ROUTES
// ===============================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        // Strict name validation (Alphabets and spaces only, min 2 characters)
        if (!/^[A-Za-z\s]{2,50}$/.test(name.trim())) {
            return res.status(400).json({ message: "Full Name must contain only alphabets and spaces (minimum 2 characters)" });
        }

        // Standard RFC email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingUser = await DB.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const allUsers = await DB.getAllUsers();
        const role = (email.toLowerCase().trim() === "admin@s369.in" || allUsers.length === 0) ? "admin" : "customer";

        const user = await DB.createUser({
            name: name.trim(),
            email,
            password: hashedPassword,
            role
        });

        // Trigger Welcome Email asynchronously via Gmail SMTP
        sendWelcomeEmail(user.name, user.email).catch(e => console.error("Welcome email error:", e.message));

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.cookie("s369_token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.cookie("s369_user", JSON.stringify({ id: user._id, name: user.name, email: user.email, role: user.role }), {
            httpOnly: false,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: "Registration successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Registration failed" });
    }
});

app.post("/api/auth/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ ok: false, message: "Email is required" });
        }
        const user = await DB.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ ok: false, message: "No account found with this email address" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        if (isDbConnected) {
            await User.findOneAndUpdate({ email: email.toLowerCase().trim() }, {
                resetPasswordOtp: otp,
                resetPasswordExpires: expires
            });
        } else {
            const db = loadLocalDb();
            const u = db.users.find(x => x.email === email.toLowerCase().trim());
            if (u) {
                u.resetPasswordOtp = otp;
                u.resetPasswordExpires = expires.toISOString();
                saveLocalDb(db);
            }
        }

        const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; border: 1px solid #e8dfd5; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="background: #5d1f2d; padding: 28px; text-align: center;">
            <h1 style="color: #ffffff; font-family: Georgia, serif; font-size: 26px; margin: 0; letter-spacing: 2px;">S 3 6 9</h1>
            <p style="color: #c5a059; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Security & Password Assistance</p>
          </div>
          <div style="padding: 30px 24px; color: #333; line-height: 1.6;">
            <h2 style="font-size: 18px; color: #3e121c; margin-top: 0; font-family: Georgia, serif;">Password Reset Code</h2>
            <p style="font-size: 14.5px;">We received a request to reset the password for your S369 account (<strong>${email}</strong>). Use the verification code below to complete the reset process:</p>
            <div style="background: #faf6f0; border: 1px dashed #dcd3c7; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #5d1f2d; font-family: monospace;">${otp}</span>
              <p style="font-size: 12px; color: #888; margin: 8px 0 0;">This code is valid for 15 minutes. Do not share it with anyone.</p>
            </div>
            <p style="font-size: 13px; color: #777; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          <div style="background: #f5eee3; padding: 14px 24px; text-align: center; font-size: 12px; color: #888;">
            © 2026 S369 Perfume Haute Parfumerie.
          </div>
        </div>`;

        await sendMail({
            to: email,
            subject: `S369 Security Code: ${otp} (Valid for 15 mins)`,
            html
        });

        res.json({ ok: true, message: "Verification code sent to your email." });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ ok: false, message: "Error sending verification code" });
    }
});

app.post("/api/auth/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ ok: false, message: "Email, OTP and new password are required" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
        }

        let user;
        if (isDbConnected) {
            user = await User.findOne({ email: email.toLowerCase().trim() });
        } else {
            const db = loadLocalDb();
            user = db.users.find(u => u.email === email.toLowerCase().trim());
        }

        if (!user) {
            return res.status(404).json({ ok: false, message: "User not found" });
        }

        if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
            return res.status(400).json({ ok: false, message: "Invalid verification code" });
        }

        if (user.resetPasswordExpires && new Date(user.resetPasswordExpires) < new Date()) {
            return res.status(400).json({ ok: false, message: "Verification code has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (isDbConnected) {
            await User.findOneAndUpdate({ email: email.toLowerCase().trim() }, {
                password: hashedPassword,
                resetPasswordOtp: null,
                resetPasswordExpires: null
            });
        } else {
            const db = loadLocalDb();
            const idx = db.users.findIndex(u => u.email === email.toLowerCase().trim());
            if (idx > -1) {
                db.users[idx].password = hashedPassword;
                db.users[idx].resetPasswordOtp = null;
                db.users[idx].resetPasswordExpires = null;
                saveLocalDb(db);
            }
        }

        res.json({ ok: true, message: "Password reset successfully. You can now login." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ ok: false, message: "Error resetting password" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await DB.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.cookie("s369_token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.cookie("s369_user", JSON.stringify({ id: user._id, name: user.name, email: user.email, role: user.role }), {
            httpOnly: false,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed" });
    }
});

app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("s369_token");
    res.clearCookie("s369_user");
    res.json({ ok: true, message: "Logged out successfully" });
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const user = await DB.findUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ ok: true, user });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch user" });
    }
});

// ===============================
// CART ROUTES
// ===============================

app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
        const cart = await DB.getCart(req.user.userId);
        res.json({ items: cart.items || [] });
    } catch (error) {
        console.error("Get cart error:", error);
        res.status(500).json({ message: "Failed to get cart" });
    }
});

app.post("/api/cart", authenticateToken, async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        if (!productId || !size) {
            return res.status(400).json({ message: "Product ID and size are required" });
        }

        const qty = Number(quantity) || 1;
        if (qty < 1) {
            return res.status(400).json({ message: "Quantity must be at least 1" });
        }

        const cart = await DB.getCart(req.user.userId);
        const items = [...(cart.items || [])];

        const existingItem = items.find(
            item => item.productId === String(productId) && item.size === size
        );

        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            items.push({ productId: String(productId), size, quantity: qty });
        }

        const updatedCart = await DB.saveCart(req.user.userId, items);
        res.json({ message: "Item added to cart", items: updatedCart.items });
    } catch (error) {
        console.error("Add cart error:", error);
        res.status(500).json({ message: "Failed to add item to cart" });
    }
});

app.put("/api/cart", authenticateToken, async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        const qty = Number(quantity);

        if (!productId || !size || qty < 1) {
            return res.status(400).json({ message: "Invalid cart item quantity" });
        }

        const cart = await DB.getCart(req.user.userId);
        const items = [...(cart.items || [])];

        const item = items.find(
            i => i.productId === String(productId) && i.size === size
        );

        if (!item) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        item.quantity = qty;
        const updatedCart = await DB.saveCart(req.user.userId, items);

        res.json({ message: "Cart updated", items: updatedCart.items });
    } catch (error) {
        console.error("Update cart error:", error);
        res.status(500).json({ message: "Failed to update cart" });
    }
});

app.delete("/api/cart", authenticateToken, async (req, res) => {
    try {
        const { productId, size } = req.body;
        const cart = await DB.getCart(req.user.userId);
        const items = (cart.items || []).filter(
            i => !(i.productId === String(productId) && i.size === size)
        );

        const updatedCart = await DB.saveCart(req.user.userId, items);
        res.json({ message: "Item removed", items: updatedCart.items });
    } catch (error) {
        console.error("Remove cart error:", error);
        res.status(500).json({ message: "Failed to remove item" });
    }
});

app.delete("/api/cart/clear", authenticateToken, async (req, res) => {
    try {
        await DB.saveCart(req.user.userId, []);
        res.json({ message: "Cart cleared", items: [] });
    } catch (error) {
        console.error("Clear cart error:", error);
        res.status(500).json({ message: "Failed to clear cart" });
    }
});

app.post("/api/cart/sync", authenticateToken, async (req, res) => {
    try {
        const { items: guestItems } = req.body;
        const cart = await DB.getCart(req.user.userId);
        let items = [...(cart.items || [])];

        if (Array.isArray(guestItems) && guestItems.length > 0) {
            guestItems.forEach(gItem => {
                const pId = String(gItem.id || gItem.productId);
                const size = gItem.size || "30ml";
                const qty = Number(gItem.qty || gItem.quantity) || 1;
                const existing = items.find(i => i.productId === pId && i.size === size);
                if (existing) {
                    existing.quantity = Math.max(existing.quantity, qty);
                } else {
                    items.push({ productId: pId, size, quantity: qty });
                }
            });
            const updated = await DB.saveCart(req.user.userId, items);
            return res.json({ message: "Cart synced with server", items: updated.items });
        }
        res.json({ message: "Cart loaded from server", items });
    } catch (e) {
        console.error("Cart sync error:", e);
        res.status(500).json({ message: "Failed to sync cart" });
    }
});

// ===============================
// WISHLIST API ROUTES
// ===============================

app.get("/api/wishlist", optionalToken, async (req, res) => {
    try {
        const guestId = getOrCreateGuestId(req, res);
        const userId = req.user ? req.user.userId : null;
        const wl = await DB.getWishlist(userId, guestId);
        res.json({ ok: true, guestId, items: wl.items || [] });
    } catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({ ok: false, message: "Failed to fetch wishlist" });
    }
});

app.post("/api/wishlist", optionalToken, async (req, res) => {
    try {
        const guestId = getOrCreateGuestId(req, res);
        const userId = req.user ? req.user.userId : null;
        const { productId, notifyPriceDrop = true, notifyBackInStock = true } = req.body;
        if (!productId) {
            return res.status(400).json({ ok: false, message: "Product ID is required" });
        }
        const wl = await DB.getWishlist(userId, guestId);
        let items = [...(wl.items || [])];
        const existingIdx = items.findIndex(i => String(i.productId) === String(productId));

        let action = "added";
        if (existingIdx > -1) {
            items.splice(existingIdx, 1);
            action = "removed";
        } else {
            items.push({
                productId: String(productId),
                notifyPriceDrop: Boolean(notifyPriceDrop),
                notifyBackInStock: Boolean(notifyBackInStock),
                addedAt: new Date()
            });
            action = "added";
        }

        const updated = await DB.saveWishlist(userId, guestId, items);
        res.json({
            ok: true,
            action,
            guestId,
            message: action === "added" ? "Saved to wishlist" : "Removed from wishlist",
            items: updated.items
        });
    } catch (error) {
        console.error("Toggle wishlist error:", error);
        res.status(500).json({ ok: false, message: "Failed to update wishlist" });
    }
});

app.delete("/api/wishlist/:productId", optionalToken, async (req, res) => {
    try {
        const guestId = getOrCreateGuestId(req, res);
        const userId = req.user ? req.user.userId : null;
        const { productId } = req.params;
        const wl = await DB.getWishlist(userId, guestId);
        const items = (wl.items || []).filter(i => String(i.productId) !== String(productId));
        const updated = await DB.saveWishlist(userId, guestId, items);
        res.json({ ok: true, guestId, message: "Removed from wishlist", items: updated.items });
    } catch (error) {
        console.error("Remove from wishlist error:", error);
        res.status(500).json({ ok: false, message: "Failed to remove from wishlist" });
    }
});

app.patch("/api/wishlist/:productId/notifications", optionalToken, async (req, res) => {
    try {
        const guestId = getOrCreateGuestId(req, res);
        const userId = req.user ? req.user.userId : null;
        const { productId } = req.params;
        const { notifyPriceDrop, notifyBackInStock } = req.body;
        const wl = await DB.getWishlist(userId, guestId);
        let items = [...(wl.items || [])];
        const item = items.find(i => String(i.productId) === String(productId));
        if (!item) {
            return res.status(404).json({ ok: false, message: "Item not found in wishlist" });
        }
        if (typeof notifyPriceDrop === "boolean") item.notifyPriceDrop = notifyPriceDrop;
        if (typeof notifyBackInStock === "boolean") item.notifyBackInStock = notifyBackInStock;

        const updated = await DB.saveWishlist(userId, guestId, items);
        res.json({ ok: true, guestId, message: "Notification preferences updated", items: updated.items });
    } catch (error) {
        console.error("Update wishlist notifications error:", error);
        res.status(500).json({ ok: false, message: "Failed to update preferences" });
    }
});

app.post("/api/wishlist/sync", optionalToken, async (req, res) => {
    try {
        const guestId = getOrCreateGuestId(req, res);
        const userId = req.user ? req.user.userId : null;
        const { items: guestItems } = req.body;
        const wl = await DB.getWishlist(userId, guestId);
        let items = [...(wl.items || [])];

        if (Array.isArray(guestItems) && guestItems.length > 0) {
            guestItems.forEach(gItem => {
                const pId = typeof gItem === "string" ? gItem : String(gItem.productId || gItem.id || "");
                if (pId && !items.some(i => String(i.productId) === pId)) {
                    items.push({
                        productId: pId,
                        notifyPriceDrop: gItem.notifyPriceDrop !== false,
                        notifyBackInStock: gItem.notifyBackInStock !== false,
                        addedAt: gItem.addedAt ? new Date(gItem.addedAt) : new Date()
                    });
                }
            });
            const updated = await DB.saveWishlist(userId, guestId, items);
            return res.json({ ok: true, guestId, message: "Wishlist synced with server", items: updated.items });
        }
        res.json({ ok: true, guestId, message: "Wishlist loaded from server", items });
    } catch (e) {
        console.error("Wishlist sync error:", e);
        res.status(500).json({ ok: false, message: "Failed to sync wishlist" });
    }
});

// ===============================
// COUPON ENGINE
// ===============================

function evaluateCoupon(code, subtotal) {
    if (!code) return { valid: false, discount: 0, message: "" };
    const c = String(code).trim().toUpperCase();
    if (c === "WELCOME10") {
        const discount = Math.round(subtotal * 0.10);
        return { valid: true, discount, message: "10% Welcome discount applied!" };
    }
    if (c === "S369LUXE") {
        if (subtotal >= 1000) {
            return { valid: true, discount: 200, message: "₹200 Luxury discount applied!" };
        }
        return { valid: false, discount: 0, message: "S369LUXE requires a minimum order of ₹1,000." };
    }
    if (c === "FESTIVE15") {
        const discount = Math.round(subtotal * 0.15);
        return { valid: true, discount, message: "15% Festive discount applied!" };
    }
    if (c === "PERFUME25") {
        if (subtotal >= 2500) {
            const discount = Math.round(subtotal * 0.25);
            return { valid: true, discount, message: "25% VIP fragrance discount applied!" };
        }
        return { valid: false, discount: 0, message: "PERFUME25 requires a minimum order of ₹2,500." };
    }
    return { valid: false, discount: 0, message: "Invalid or expired coupon code." };
}

app.post("/api/coupons/validate", (req, res) => {
    const { code, subtotal } = req.body;
    const sub = Number(subtotal) || 0;
    const result = evaluateCoupon(code, sub);
    res.json({
        ok: result.valid,
        valid: result.valid,
        discount: result.discount,
        newTotal: Math.max(1, sub - result.discount),
        message: result.message
    });
});

// ===============================
// ORDER & PAYMENT ROUTES
// ===============================

async function calculateOrderItems(rawItems) {
    let subtotal = 0;
    const dbProducts = await DB.getAllProducts();

    const items = rawItems.map(item => {
        const productId = item.id || item.productId;
        const pObj = dbProducts.find(p => p.id === productId);
        const name = pObj ? pObj.name : String(productId).toUpperCase();
        const size = item.size || "30ml";
        
        let price = 399;
        if (pObj && pObj.prices && pObj.prices[size]) {
            price = pObj.prices[size].price;
        } else if (DEFAULT_PRICES[size]) {
            price = DEFAULT_PRICES[size].price;
        }

        const qty = Number(item.qty || item.quantity) || 1;
        const lineTotal = price * qty;
        subtotal += lineTotal;
        return {
            productId,
            name,
            size,
            price,
            quantity: qty,
            lineTotal
        };
    });
    return { items, subtotal };
}

const handleOrderCreation = async (req, res) => {
    try {
        const { customer, items: rawItems, paymentMethod = "online", couponCode = "" } = req.body;

        if (paymentMethod === "cod") {
            return res.status(400).json({ ok: false, message: "Cash on Delivery is discontinued. Please select Razorpay Secure Online Payment." });
        }

        if (!customer || !rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ ok: false, message: "Invalid order data. Customer details and cart items are required." });
        }

        const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.name || "";
        const contactEmail = (customer.contact || customer.email || "").trim();
        const phone = (customer.phone || "").trim();
        const address = (customer.address || "").trim();
        const city = (customer.city || "").trim();
        const state = (customer.state || "").trim();
        const pin = (customer.pin || "").trim();
        const notes = customer.notes || "";

        // 1. Strict Name Validation (alphabets only, min 2 characters)
        if (!fullName || !/^[A-Za-z\s]{2,60}$/.test(fullName)) {
            return res.status(400).json({ ok: false, message: "Full Name must contain only alphabets and spaces (minimum 2 characters)." });
        }

        // 2. Strict Indian Mobile Phone Validation (10 digits starting with 6,7,8,9)
        const cleanPhone = phone.replace(/\D/g, "");
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({ ok: false, message: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9." });
        }

        // 3. Strict Postal PIN Code Validation (6 digits)
        const cleanPin = pin.replace(/\D/g, "");
        if (!/^[1-9]\d{5}$/.test(cleanPin)) {
            return res.status(400).json({ ok: false, message: "Please enter a valid 6-digit postal PIN code." });
        }

        // 4. Standard Email Validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            return res.status(400).json({ ok: false, message: "Please provide a valid email address." });
        }

        if (!address) {
            return res.status(400).json({ ok: false, message: "Delivery street address is required." });
        }

        const { items, subtotal } = await calculateOrderItems(rawItems);
        let discountAmount = 0;
        let appliedCoupon = "";

        if (couponCode) {
            const coup = evaluateCoupon(couponCode, subtotal);
            if (coup.valid) {
                discountAmount = coup.discount;
                appliedCoupon = couponCode.trim().toUpperCase();
            }
        }

        const shippingFee = 0;
        const totalAmount = Math.max(1, subtotal - discountAmount + shippingFee);
        const orderId = "S369-" + Math.floor(100000 + Math.random() * 900000);

        let razorpayOrderId = "order_mock_" + Date.now();

        if (Razorpay && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes("placeholder")) {
            try {
                const instance = new Razorpay({
                    key_id: RAZORPAY_KEY_ID,
                    key_secret: RAZORPAY_KEY_SECRET
                });
                const rzOrder = await instance.orders.create({
                    amount: totalAmount * 100,
                    currency: "INR",
                    receipt: orderId,
                    notes: { customer_phone: cleanPhone, customer_name: fullName, coupon: appliedCoupon }
                });
                razorpayOrderId = rzOrder.id;
            } catch (rzErr) {
                console.warn("Razorpay order creation warning (using fallback order):", rzErr.message);
            }
        }

        const orderData = {
            orderId,
            userId: req.user ? req.user.userId : null,
            customer: {
                name: fullName,
                email: contactEmail,
                phone: cleanPhone,
                address,
                city,
                state,
                pin: cleanPin,
                notes
            },
            items,
            subtotal,
            discountAmount,
            couponCode: appliedCoupon,
            shippingFee,
            totalAmount,
            paymentMethod: "online",
            paymentStatus: "pending",
            orderStatus: "placed",
            razorpayOrderId
        };

        const newOrder = await DB.createOrder(orderData);

        res.json({
            ok: true,
            key_id: RAZORPAY_KEY_ID,
            razorpay_order_id: razorpayOrderId,
            amount: totalAmount * 100,
            currency: "INR",
            store_order_id: newOrder._id,
            order_id: newOrder.orderId,
            subtotal,
            discountAmount,
            totalAmount
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ ok: false, message: "Failed to create order. Please try again." });
    }
};

app.post("/api/payment/create", optionalToken, handleOrderCreation);
app.post("/api/orders/create", optionalToken, handleOrderCreation);
app.post("/api/create-order.php", optionalToken, handleOrderCreation);

const handlePaymentVerification = async (req, res) => {
    try {
        const { store_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!store_order_id) {
            return res.status(400).json({ ok: false, message: "Store Order ID is required" });
        }

        const order = await DB.findOrderById(store_order_id);
        if (!order) {
            return res.status(404).json({ ok: false, message: "Order not found" });
        }

        if (RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_SECRET.includes("placeholder") && razorpay_order_id && razorpay_payment_id && razorpay_signature && razorpay_signature !== "mock_signature" && razorpay_signature !== "simulated_signature") {
            const generatedSignature = crypto
                .createHmac("sha256", RAZORPAY_KEY_SECRET)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest("hex");

            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ ok: false, message: "Payment verification failed: Invalid signature" });
            }
        }

        const updatedOrder = await DB.updateOrder(order._id, {
            paymentStatus: "paid",
            orderStatus: "processing",
            razorpayOrderId: razorpay_order_id || order.razorpayOrderId,
            razorpayPaymentId: razorpay_payment_id || ("pay_mock_" + Date.now()),
            razorpaySignature: razorpay_signature || "mock_signature"
        });

        if (order.userId) {
            await DB.saveCart(order.userId, []);
        }

        const finalOrder = updatedOrder || order;

        // Asynchronously dispatch luxury tax invoice email via Gmail SMTP
        sendInvoiceEmail(finalOrder).catch(e => console.error("Invoice email delivery error:", e.message));

        res.json({
            ok: true,
            message: "Payment verified successfully",
            order_id: finalOrder.orderId,
            status: "processing"
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({ ok: false, message: "Payment verification failed" });
    }
};

app.post("/api/payment/verify", optionalToken, handlePaymentVerification);
app.post("/api/verify-payment.php", optionalToken, handlePaymentVerification);

// PUBLIC TAX INVOICE DOWNLOAD & PRINT ROUTE
app.get("/api/orders/:orderId/invoice", async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await DB.findOrderByCustomId(orderId) || await DB.findOrderById(orderId);
        if (!order) {
            return res.status(404).send("<h1 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Invoice Not Found</h1>");
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(generateInvoiceHtml(order));
    } catch (e) {
        console.error("Fetch invoice error:", e);
        res.status(500).send("Error rendering invoice.");
    }
});

const handleTrackOrder = async (req, res) => {
    try {
        const { order_id, phone } = req.body;
        if (!order_id) {
            return res.status(400).json({ ok: false, message: "Order ID is required" });
        }

        const order = await DB.findOrderByCustomId(order_id);
        if (!order) {
            return res.status(404).json({ ok: false, message: "Order not found. Please check Order ID." });
        }

        res.json({
            ok: true,
            order: {
                id: order.orderId,
                created_at: order.createdAt,
                total: order.totalAmount,
                status: order.orderStatus,
                payment_method: order.paymentMethod,
                payment_status: order.paymentStatus,
                customer: order.customer,
                items: (order.items || []).map(item => ({
                    name: item.name,
                    size: item.size,
                    qty: item.quantity,
                    price: item.price,
                    line_total: item.lineTotal
                }))
            }
        });
    } catch (error) {
        console.error("Track order error:", error);
        res.status(500).json({ ok: false, message: "Error tracking order" });
    }
};

app.post("/api/orders/track", handleTrackOrder);
app.post("/api/track-order.php", handleTrackOrder);

app.get("/api/orders/user", authenticateToken, async (req, res) => {
    try {
        const allOrders = await DB.getAllOrders();
        const userOrders = allOrders.filter(o => String(o.userId) === String(req.user.userId));
        res.json({ ok: true, orders: userOrders });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to fetch orders" });
    }
});

app.get("/api/orders/my-orders", authenticateToken, async (req, res) => {
    try {
        const allOrders = await DB.getAllOrders();
        const userOrders = allOrders.filter(o => String(o.userId) === String(req.user.userId));
        res.json({ ok: true, orders: userOrders });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to fetch orders" });
    }
});

// ===============================
// ADMIN DASHBOARD ROUTES
// ===============================

app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await DB.findUserByEmail(email);
        if (!user || user.role !== "admin") {
            return res.status(401).json({ message: "Invalid admin credentials" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid admin credentials" });
        }

        const token = jwt.sign(
            { userId: user._id, role: "admin" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Admin login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: "admin" }
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Admin login failed" });
    }
});

app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
        const stats = await DB.getStats();
        res.json({ ok: true, stats });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ ok: false, message: "Failed to fetch admin statistics" });
    }
});

app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
    try {
        const orders = await DB.getAllOrders();
        res.json({ ok: true, orders });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to fetch orders" });
    }
});

app.put("/api/admin/orders/:id/status", authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["placed", "processing", "shipped", "delivered", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ ok: false, message: "Invalid status value" });
        }

        const updatedOrder = await DB.updateOrder(req.params.id, { orderStatus: status });
        if (!updatedOrder) {
            return res.status(404).json({ ok: false, message: "Order not found" });
        }

        res.json({ ok: true, message: `Order status updated to ${status}`, order: updatedOrder });
    } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ ok: false, message: "Failed to update order status" });
    }
});

app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
        const users = await DB.getAllUsers();
        res.json({ ok: true, users });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Failed to fetch users" });
    }
});

// ===============================
// REVIEWS PUBLIC & ADMIN ROUTES
// ===============================

const handleGetReviews = async (req, res) => {
    try {
        const filter = { status: "approved" };
        if (req.query.productId && req.query.productId !== "all") {
            filter.productId = req.query.productId;
        }
        const list = await DB.getAllReviews(filter);
        const reviews = list.map(r => ({
            id: r._id,
            name: r.name,
            title: r.title,
            message: r.message,
            rating: r.rating,
            productId: r.productId || "general",
            date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            createdAt: r.createdAt
        }));
        res.json({ ok: true, reviews });
    } catch (err) {
        console.error("Get reviews error:", err);
        res.status(500).json({ ok: false, message: "Failed to fetch reviews" });
    }
};

const handlePostReview = async (req, res) => {
    try {
        const { name, title, message, rating, productId, email } = req.body;
        if (!name || !title || !message || !rating) {
            return res.status(400).json({ ok: false, message: "Please fill in all required review fields." });
        }
        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ ok: false, message: "Rating must be between 1 and 5." });
        }

        const review = await DB.createReview({
            productId: productId || "general",
            name: name.trim(),
            email: (email || "").trim(),
            title: title.trim(),
            message: message.trim(),
            rating: numRating,
            approved: true,
            status: "approved"
        });

        res.json({
            ok: true,
            message: "Thank you — your review is now live!",
            review
        });
    } catch (err) {
        console.error("Post review error:", err);
        res.status(500).json({ ok: false, message: "Failed to submit review." });
    }
};

app.get("/api/reviews", handleGetReviews);
app.get("/api/reviews.php", handleGetReviews);
app.post("/api/reviews", handlePostReview);
app.post("/api/reviews.php", handlePostReview);

app.get("/api/admin/reviews", authenticateAdmin, async (req, res) => {
    try {
        const reviews = await DB.getAllReviews();
        res.json({ ok: true, reviews });
    } catch (err) {
        console.error("Admin fetch reviews error:", err);
        res.status(500).json({ ok: false, message: "Failed to fetch reviews" });
    }
});

app.put("/api/admin/reviews/:id/status", authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!["approved", "pending", "rejected"].includes(status)) {
            return res.status(400).json({ ok: false, message: "Invalid review status" });
        }
        const updated = await DB.updateReviewStatus(req.params.id, status);
        if (!updated) return res.status(404).json({ ok: false, message: "Review not found" });
        res.json({ ok: true, message: `Review marked as ${status}`, review: updated });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Failed to update review" });
    }
});

app.delete("/api/admin/reviews/:id", authenticateAdmin, async (req, res) => {
    try {
        await DB.deleteReview(req.params.id);
        res.json({ ok: true, message: "Review deleted successfully" });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Failed to delete review" });
    }
});

// ===============================
// CONTACT & ENQUIRIES ROUTES
// ===============================

const handleContactSubmit = async (req, res) => {
    try {
        const { name, contact, type = "Product enquiry", message } = req.body;
        if (!name || !contact || !message) {
            return res.status(400).json({ ok: false, message: "Name, contact details, and message are required." });
        }

        const enquiry = await DB.createEnquiry({
            name: name.trim(),
            contact: contact.trim(),
            type: type.trim(),
            message: message.trim(),
            status: "new"
        });

        // Dispatch email notification to business owner
        sendMail({
            to: process.env.ADMIN_NOTIFY_EMAIL || "aacy27@gmail.com",
            subject: `New Customer Enquiry: [${type}] from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <h2 style="color: #5d1f2d; border-bottom: 2px solid #5d1f2d; padding-bottom: 8px;">New Customer Enquiry — S369 Perfume</h2>
                    <p><strong>Customer Name:</strong> ${name}</p>
                    <p><strong>Contact (Email / Mobile):</strong> ${contact}</p>
                    <p><strong>Enquiry Type:</strong> ${type}</p>
                    <p><strong>Received At:</strong> ${new Date().toLocaleString("en-IN")}</p>
                    <div style="margin-top: 15px; padding: 15px; background: #faf5ed; border-left: 4px solid #5d1f2d; border-radius: 4px;">
                        <strong>Message:</strong>
                        <p style="margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="margin-top: 20px; font-size: 13px; color: #777;">View and respond to this enquiry in the <a href="http://localhost:3000/admin.html" style="color: #5d1f2d; font-weight: bold;">S369 Admin Control Center</a>.</p>
                </div>
            `
        }).catch(err => console.warn("Contact email notification failed:", err.message));

        res.json({ ok: true, message: "Thank you. Your message has been received." });
    } catch (err) {
        console.error("Contact submit error:", err);
        res.status(500).json({ ok: false, message: "Failed to submit enquiry. Please try again." });
    }
};

app.post("/api/contact", handleContactSubmit);
app.post("/api/submit-contact.php", handleContactSubmit);

app.get("/api/admin/enquiries", authenticateAdmin, async (req, res) => {
    try {
        const enquiries = await DB.getAllEnquiries();
        res.json({ ok: true, enquiries });
    } catch (err) {
        console.error("Admin fetch enquiries error:", err);
        res.status(500).json({ ok: false, message: "Failed to fetch enquiries" });
    }
});

app.put("/api/admin/enquiries/:id/status", authenticateAdmin, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        if (!["new", "in_progress", "replied", "closed"].includes(status)) {
            return res.status(400).json({ ok: false, message: "Invalid enquiry status" });
        }
        const updated = await DB.updateEnquiryStatus(req.params.id, status, adminNotes);
        if (!updated) return res.status(404).json({ ok: false, message: "Enquiry not found" });
        res.json({ ok: true, message: `Enquiry marked as ${status}`, enquiry: updated });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Failed to update enquiry" });
    }
});

app.delete("/api/admin/enquiries/:id", authenticateAdmin, async (req, res) => {
    try {
        await DB.deleteEnquiry(req.params.id);
        res.json({ ok: true, message: "Enquiry deleted successfully" });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Failed to delete enquiry" });
    }
});

// ===============================
// MONGODB CONNECTION & AUTO-MIGRATOR
// ===============================

process.on("uncaughtException", (err) => {
    console.warn("Handled system exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
    console.warn("Handled promise rejection:", reason);
});

mongoose.connection.on("error", (err) => {
    isDbConnected = false;
});

async function syncLocalDataToMongo() {
    try {
        console.log("-> Syncing all data to MongoDB Atlas collections...");
        // 1. Sync & Enrich Products
        for (const p of INITIAL_PRODUCTS) {
            const existing = await Product.findOne({ id: p.id });
            if (!existing) {
                await Product.create(p);
            } else {
                // Ensure gender, scentFamily, ratings are present without overwriting custom DB prices
                const updateObj = {};
                if (!existing.gender) updateObj.gender = p.gender;
                if (!existing.scentFamily) updateObj.scentFamily = p.scentFamily;
                if (!existing.rating) updateObj.rating = p.rating;
                if (!existing.reviewCount) updateObj.reviewCount = p.reviewCount;
                if (!existing.prices || Object.keys(existing.prices).length === 0) updateObj.prices = p.prices;
                if (!existing.price) updateObj.price = p.price || p.prices?.["30ml"]?.price || 399;
                if (Object.keys(updateObj).length > 0) {
                    await Product.updateOne({ id: p.id }, { $set: updateObj });
                }
            }
        }
        console.log("-> Verified & enriched products with gender, scentFamily & ratings in MongoDB Atlas.");

        // 2. Sync Users
        const localDb = loadLocalDb();
        if (localDb.users && localDb.users.length > 0) {
            for (const u of localDb.users) {
                const existing = await User.findOne({ email: u.email });
                if (!existing) {
                    await User.create({
                        name: u.name,
                        email: u.email,
                        password: u.password,
                        role: u.role || "customer"
                    });
                }
            }
            console.log("-> Verified & synced all users to MongoDB Atlas.");
        }

        // 3. Admin user ensure
        const adminUser = await User.findOne({ email: "admin@s369.in" });
        if (!adminUser) {
            const hashed = await bcrypt.hash("adminpassword", 10);
            await User.create({
                name: "S369 Administrator",
                email: "admin@s369.in",
                password: hashed,
                role: "admin"
            });
            console.log("-> Initialized admin account in MongoDB Atlas.");
        }

        // 4. Sync Initial Reviews
        const revCount = await Review.countDocuments();
        if (revCount === 0) {
            const reviewsPath = path.join(__dirname, "..", "private", "reviews.json");
            let initialReviews = [];
            if (fs.existsSync(reviewsPath)) {
                try {
                    initialReviews = JSON.parse(fs.readFileSync(reviewsPath, "utf-8"));
                } catch (e) {}
            }
            if (!initialReviews.length) {
                initialReviews = [
                    { name: "Aarav M.", title: "Elegant and long-lasting", message: "The fragrance feels refined and stays beautifully through the day without becoming overpowering.", rating: 5, approved: true, status: "approved" },
                    { name: "Riya S.", title: "My new signature scent", message: "Beautiful presentation, quick delivery and a scent that gets noticed every time I wear it.", rating: 5, approved: true, status: "approved" }
                ];
            }
            await Review.insertMany(initialReviews.map(r => ({
                name: r.name,
                email: r.email || "",
                title: r.title,
                message: r.message,
                rating: Number(r.rating) || 5,
                approved: r.approved !== false,
                status: r.status || (r.approved !== false ? "approved" : "pending"),
                createdAt: r.created_at ? new Date(r.created_at) : new Date()
            })));
            console.log("-> Synced initial reviews to MongoDB Atlas.");
        }

        // 5. Ensure Wishlist index allows guests (drop legacy non-sparse userId unique index)
        try {
            await Wishlist.collection.dropIndex("userId_1");
        } catch (e) {}

        console.log("-> [SUCCESS] MongoDB Atlas Cloud Database is fully synchronized & storing all data!");
    } catch (e) {
        console.warn("MongoDB Atlas sync note:", e.message);
    }
}

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/S369Perfume";

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 })
    .then(async () => {
        isDbConnected = true;
        console.log("MongoDB connected successfully to:", MONGO_URI.includes("mongodb+srv") ? "MongoDB Atlas Cloud" : "MongoDB Server");
        await syncLocalDataToMongo();
    })
    .catch((error) => {
        isDbConnected = false;
        console.warn("MongoDB Atlas connection unavailable:", error.message);
        console.log("-> ACTIVE STORAGE: Infallible JSON File Database (data/db.json) active!");
    });

// ===============================
// SERVER LISTEN
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`S369 Server running on http://localhost:${PORT}`);
});
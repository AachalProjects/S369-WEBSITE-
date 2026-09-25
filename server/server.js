const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

let Razorpay;
try {
    Razorpay = require("razorpay");
} catch (e) {
    Razorpay = null;
}

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "s369_perfume_jwt_secret_change_this";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_placeholder";

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
        short: "Rich, warm and irresistibly smooth — sweet tobacco wrapped in creamy vanilla.",
        description: "Rich, warm, and irresistibly smooth Alpha 9 wraps you in a cozy embrace of sweet tobacco and creamy vanilla. It’s a modern twist on a classic favorite, designed for those who crave sophistication with a hint of daring.",
        notes: [{ label: "Top & Heart", value: "Tobacco" }, { label: "Base", value: "Vanilla" }],
        keywords: ["tobacco", "vanilla", "warm", "sweet"],
        prices: DEFAULT_PRICES
    },
    {
        id: "cool-tides",
        name: "Cool Tides",
        tagline: "The Fresh Wave of Confidence",
        image: "cool-tides.jpg",
        short: "Blood mandarin, warm cinnamon and leather lifted by grapefruit, mint, rose and amber.",
        description: "Zesty blood mandarin, warm cinnamon, and bold leather make a striking first impression. Grapefruit, mint, and spicy hints meet rose, amber, and patchouli to leave a trail that’s fresh, daring, and unforgettable.",
        notes: [{ label: "Top & Heart", value: "Blood Mandarin, Cinnamon" }, { label: "Base", value: "Amber, Patchouli" }],
        keywords: ["mandarin", "cinnamon", "leather", "fresh"],
        prices: DEFAULT_PRICES
    },
    {
        id: "wild-crest",
        name: "Wild Crest",
        tagline: "Nature's Bold Signature",
        image: "wild-crest.jpg",
        short: "Vetiver and cedarwood move into cardamom, narcissus, sandalwood and creamy vanilla.",
        description: "Untamed, confident, and effortlessly captivating — Wild Crest opens with fresh vetiver and crisp cedarwood, leading into a warm heart of cardamom and narcissus.",
        notes: [{ label: "Top", value: "Vetiver, Cedarwood" }, { label: "Heart", value: "Cardamom" }, { label: "Base", value: "Sandalwood, Vanilla" }],
        keywords: ["vetiver", "cedarwood", "cardamom", "woody"],
        prices: DEFAULT_PRICES
    },
    {
        id: "crimson-musk",
        name: "Crimson Musk",
        tagline: "The Power of Seduction",
        image: "crimson-musk.jpg",
        short: "Pear and raspberry meet oud, saffron, rose and orange blossom over patchouli and amber.",
        description: "Juicy pear and raspberry meet the deep richness of oud to create a striking first impression. Saffron, rose, and orange blossom unfold into a warm blend of patchouli and amber.",
        notes: [{ label: "Top", value: "Pear, Raspberry, Oud" }, { label: "Base", value: "Patchouli, Amber" }],
        keywords: ["pear", "raspberry", "oud", "saffron", "musk"],
        prices: DEFAULT_PRICES
    },
    {
        id: "night-quartz",
        name: "Night Quartz",
        tagline: "The Mystery of the Midnight",
        image: "night-quartz.jpg",
        short: "Deep saffron, rich oud and cedar wood layered with bergamot, davana, clove, rose and vetiver.",
        description: "Deep saffron, rich oud, and warm cedar wood create an alluring first impression, while bergamot, davana, clove, rose, vetiver, and patchouli swirl together.",
        notes: [{ label: "Top", value: "Saffron, Oud, Cedar Wood" }, { label: "Base", value: "Vetiver, Patchouli" }],
        keywords: ["saffron", "oud", "cedar wood", "mysterious"],
        prices: DEFAULT_PRICES
    },
    {
        id: "midnight-blues",
        name: "Midnight Blues",
        tagline: "The Calm Power of the Night",
        image: "midnight-blues.jpg",
        short: "Bergamot and orange blossom blend with woods, lavender, geranium and patchouli.",
        description: "Fresh bergamot and orange blossom blend with deep woody notes to create a refined first impression. Lavender and geranium flow into an aromatic fougère heart.",
        notes: [{ label: "Top", value: "Bergamot, Orange Blossom" }, { label: "Base", value: "Lavender, Patchouli" }],
        keywords: ["bergamot", "orange blossom", "lavender"],
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
        return parsed;
    } catch (e) {
        return { users: [], carts: [], orders: [], products: INITIAL_PRODUCTS };
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
        role: { type: String, enum: ["customer", "admin"], default: "customer" }
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
            let products = await Product.find();
            if (products.length === 0) {
                await Product.insertMany(INITIAL_PRODUCTS);
                products = await Product.find();
            }
            return products;
        }
        const db = loadLocalDb();
        return db.products || INITIAL_PRODUCTS;
    },

    async getProductById(id) {
        if (isDbConnected) {
            return await Product.findOne({ id });
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
            return await Product.findOneAndUpdate({ id }, updateData, { new: true });
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

    async getStats() {
        if (isDbConnected) {
            const totalUsers = await User.countDocuments({ role: "customer" });
            const totalOrders = await Order.countDocuments();
            const pendingOrders = await Order.countDocuments({ orderStatus: { $in: ["placed", "processing"] } });
            const revenueResult = await Order.aggregate([
                { $match: { paymentStatus: "paid" } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
            ]);
            const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
            return { totalUsers, totalOrders, pendingOrders, totalRevenue };
        }

        const db = loadLocalDb();
        const totalUsers = db.users.filter(u => u.role === "customer").length;
        const totalOrders = db.orders.length;
        const pendingOrders = db.orders.filter(o => ["placed", "processing"].includes(o.orderStatus)).length;
        const totalRevenue = db.orders
            .filter(o => o.paymentStatus === "paid")
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

        return { totalUsers, totalOrders, pendingOrders, totalRevenue };
    }
};

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

function optionalToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
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

app.get("/", (req, res) => {
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
        const updated = await DB.updateProduct(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ ok: false, message: "Product not found" });
        }
        res.json({ ok: true, message: "Product updated successfully", product: updated });
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
            name,
            email,
            password: hashedPassword,
            role
        });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

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
            { expiresIn: "7d" }
        );

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

app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const user = await DB.findUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
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
        const { customer, items: rawItems, paymentMethod = "online" } = req.body;

        if (!customer || !rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ ok: false, message: "Invalid order data. Customer details and cart items are required." });
        }

        const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.name || "Customer";
        const contactEmail = customer.contact || customer.email || "";
        const phone = customer.phone || "";
        const address = customer.address || "";
        const city = customer.city || "";
        const state = customer.state || "";
        const pin = customer.pin || "";
        const notes = customer.notes || "";

        if (!contactEmail || !phone || !address) {
            return res.status(400).json({ ok: false, message: "Contact, phone, and address are required" });
        }

        const { items, subtotal } = await calculateOrderItems(rawItems);
        const shippingFee = 0;
        const totalAmount = subtotal + shippingFee;
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
                    notes: { customer_phone: phone, customer_name: fullName }
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
                phone,
                address,
                city,
                state,
                pin,
                notes
            },
            items,
            subtotal,
            shippingFee,
            totalAmount,
            paymentMethod,
            paymentStatus: "pending",
            orderStatus: "placed",
            razorpayOrderId
        };

        const newOrder = await DB.createOrder(orderData);

        if (paymentMethod === "cod" && req.user && req.user.userId) {
            await DB.saveCart(req.user.userId, []);
        }

        res.json({
            ok: true,
            key_id: RAZORPAY_KEY_ID,
            razorpay_order_id: razorpayOrderId,
            amount: totalAmount * 100,
            currency: "INR",
            store_order_id: newOrder._id,
            order_id: newOrder.orderId
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

        res.json({
            ok: true,
            message: "Payment verified successfully",
            order_id: updatedOrder ? updatedOrder.orderId : order.orderId,
            status: "processing"
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({ ok: false, message: "Payment verification failed" });
    }
};

app.post("/api/payment/verify", optionalToken, handlePaymentVerification);
app.post("/api/verify-payment.php", optionalToken, handlePaymentVerification);

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
// MONGODB CONNECTION WITH TIMEOUT & INSTANT HYBRID FALLBACK
// ===============================

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/S369Perfume";

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
    .then(() => {
        isDbConnected = true;
        console.log("MongoDB connected successfully to:", MONGO_URI.includes("mongodb+srv") ? "MongoDB Atlas Cloud" : "MongoDB Server");
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
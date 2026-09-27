// ======================================================
// S369 STORE.JS
// ======================================================


// ======================================================
// PRODUCT DRIVE IMAGES
// ======================================================

const PRODUCT_DRIVE_IMAGES = {
  "alpha-9": [
    "1HMmqsW7iQwsNdCS_1YBo7O4K2Yl_yLha",
    "1BmYMAHlwkunOng3ijHpBzrxyGGb88a0E",
    "1suLNsFQKJmHbtFlgK_iOR8i3qnfUhKGO",
    "1ODE20VUOKHuNxzLT0QAi1bMWqH-bLZGI",
    "126-X1RF55ySL3H-C024uMwWQLOpQwShG",
    "1ENB2F4RBURJKuZwJoQywjGsAU1vdLlME",
    "1pWYsHe64s0ziOKtETuiQDd_oNjDrfWON",
  ],

  "cool-tides": [
    "1gu1-cynZdAFvO1zOetvuPVQzn6V10BsZ",
    "1YZF1TPsD9i0jcnMjiqJ80hF3KgGYil-c",
    "1LpvdvlTH8t5_pfsMLI9FVmb_7ZnX295v",
    "1FlLuPZMCAPpk2DSAT1Go2FrhNrnaXvd5",
    "1GwmAxNo0MpTxDjFhgQoSOys65WYODd2_",
    "15AETjzx-w--1E5BRgw89xYuPFK95trT-",
    "1XeMYT6HWuXl7GDyrIFfOJ0_PBzg9xDCP",
  ],

  "wild-crest": [
    "133DhWUxbYZ9stV6PfhbXLuOSR0u3VZ-F",
    "1ZRhl2H1UwuNyF7RNaYnlWXQTgsm_r9UC",
    "1hws5xpJs4PzPtq15TaDAbZ4U5DAMQgvf",
    "1cBvByVP5DD8Cz771pmhOvwKwwBe0zo37",
    "1OUbynUB26aTPgOchsQBoqpv5TarQyluN",
    "1zE0SPQP_wlVGndKMfOD_u3U0BH_5R1X0",
  ],

  "crimson-musk": [
    "17tdlph1j5O6ZVZyMjxU0N3CdYdPxF8ag",
    "1_RdmXc1l9xLB5aYVjXHraegQ4ahVvt-d",
    "1H3ficDkS6ARA20nziUhhOUP8HbRWXIWU",
    "1VZ4QCuD30k_we95q6Kf1VjDAdJlAVREh",
    "18_SyO3AozmmclO7Rfw1Ravxrzu3CDIt9",
    "1xEQbpH7xGBL5StmbVEHUn_7tQkVz2MrZ",
  ],

  "night-quartz": [
    "1uR9bCJ-duq-iShIaa9jsj0dmXs5cOjzo",
    "1noaVPZ2_Xl92CMR16bARZGwoJoqY5O5j",
    "10XhVpn71RLj3wT4SsGbio4kWN1SmJywB",
    "1ayKVg4Wa1INCkGOrRWbBYXguCtzq7jxR",
    "1lzTV3AWSFBzcSnkfZUgqJBqGKkd_pxG8",
    "1UZSoTY86fwYQEI2E-2vcHvTEi_kt1uzJ",
  ],

  "midnight-blues": [
    "128H5LgtmG0MqgcCdUpjnw5LdeYwc_svw",
    "1B-EedS1zM0qnIOEfQA0pxpiGt-rm2ERK",
    "1GKoLcJGEnlVT1Owx23XqStTb0MMwCcmo",
    "1qQBMJLOwC2bLCw9dS89Y4hZKzsdnqBps",
    "1MJE8UDlders2TYfSWFCwdR958D4qf5vK",
    "19Gdsd37S8cvYYUn3cUNGH61gAveLmIJ9",
  ],
};


// ======================================================
// IMAGE HELPERS
// ======================================================

const driveThumb = (id, w = 1200) =>
  "https://drive.google.com/thumbnail?id=" +
  encodeURIComponent(id) +
  "&sz=w" +
  w;


const productImageSrc = (p) =>
  PRODUCT_DRIVE_IMAGES[p.id]?.[0]
    ? driveThumb(PRODUCT_DRIVE_IMAGES[p.id][0])
    : "assets/images/products/" + p.image;


// ======================================================
// CONFIG / PRODUCTS
// ======================================================

const PRODUCTS = window.S369_PRODUCTS || [];
const CONFIG = window.S369_CONFIG || {};
const SIZES = CONFIG.sizes || {};


// ======================================================
// API
// ======================================================

window.API_BASE = window.API_BASE || "http://localhost:5000";


// ======================================================
// BASIC HELPERS
// ======================================================

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);


const productById = (id) => {
  const pool = (window.S369_PRODUCTS && window.S369_PRODUCTS.length)
    ? window.S369_PRODUCTS
    : (window.S369?.PRODUCTS || PRODUCTS);
  return pool.find((p) => String(p.id) === String(id));
};


const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

const getToken = () =>
  localStorage.getItem("token") || getCookie("s369_token");

const getUser = () => {
  try {
    const raw = localStorage.getItem("user") || getCookie("s369_user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const checkAuthSession = async () => {
  try {
    const token = getToken();
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${window.API_BASE}/api/auth/me`, {
      method: "GET",
      headers,
      credentials: "include"
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        return data.user;
      }
    }
  } catch (e) {
    console.debug("Auth session check:", e);
  }
  return getUser();
};


// ======================================================
// CART - LOCAL CACHE
// ======================================================

const getCart = () => {
  try {
    return JSON.parse(
      localStorage.getItem("s369_cart") || "[]"
    );
  } catch (error) {
    console.error("Cart storage error:", error);
    return [];
  }
};

const setCart = (cart) => {
  localStorage.setItem(
    "s369_cart",
    JSON.stringify(cart)
  );
  window.dispatchEvent(
    new Event("s369-cart")
  );
};


// ======================================================
// LOAD CART FROM MONGODB / DB
// ======================================================

async function loadCartFromServer() {
  const token = getToken();

  try {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${window.API_BASE}/api/cart`,
      {
        method: "GET",
        headers,
        credentials: "include"
      }
    );

    if (response.status === 401) {
      return getCart();
    }

    if (!response.ok) {
      throw new Error(`Cart request failed: ${response.status}`);
    }

    const data = await response.json();
    const cart = (data.items || []).map((item) => ({
      id: item.productId,
      size: item.size,
      qty: item.quantity
    }));

    setCart(cart);
    return cart;
  } catch (error) {
    console.warn("Using local cart cache:", error.message);
    return getCart();
  }
}


// ======================================================
// SYNC CART WITH SERVER (MERGE GUEST + USER CART)
// ======================================================

async function syncCartWithServer() {
  const token = getToken();
  if (!token) return getCart();

  try {
    const local = getCart();
    const response = await fetch(`${window.API_BASE}/api/cart/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      credentials: "include",
      body: JSON.stringify({ items: local })
    });

    if (response.ok) {
      const data = await response.json();
      const cart = (data.items || []).map((item) => ({
        id: item.productId,
        size: item.size,
        qty: item.quantity
      }));
      setCart(cart);
      return cart;
    }
  } catch (e) {
    console.warn("Cart sync warning:", e);
  }
  return loadCartFromServer();
}


// ======================================================
// ADD ITEM TO MONGODB / DB CART
// ======================================================

async function addCartToServer(id, size, qty) {
  const token = getToken();

  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${window.API_BASE}/api/cart`,
      {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          productId: id,
          size: size,
          quantity: qty
        })
      }
    );

    if (response.status === 401) {
      // User is guest - store in local cart
      let localCart = getCart();
      const existing = localCart.find(i => i.id === id && i.size === size);
      if (existing) {
        existing.qty = Number(existing.qty || 1) + Number(qty);
      } else {
        localCart.push({ id, size, qty: Number(qty) });
      }
      setCart(localCart);
      return true;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not add item to cart");
    }

    const cart = (data.items || []).map((item) => ({
      id: item.productId,
      size: item.size,
      qty: item.quantity
    }));

    setCart(cart);
    return true;
  } catch (error) {
    console.error("Add cart API error, saving locally:", error);
    let localCart = getCart();
    const existing = localCart.find(i => i.id === id && i.size === size);
    if (existing) {
      existing.qty = Number(existing.qty || 1) + Number(qty);
    } else {
      localCart.push({ id, size, qty: Number(qty) });
    }
    setCart(localCart);
    return true;
  }
}


// ======================================================
// UPDATE ITEM IN MONGODB / DB CART
// ======================================================

async function updateCartItemOnServer(id, size, qty) {
  const token = getToken();

  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${window.API_BASE}/api/cart`,
      {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          productId: id,
          size: size,
          quantity: qty
        })
      }
    );

    if (response.status === 401) {
      let localCart = getCart();
      const item = localCart.find(i => i.id === id && i.size === size);
      if (item) item.qty = qty;
      setCart(localCart);
      return true;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not update cart");
    }

    const cart = (data.items || []).map((item) => ({
      id: item.productId,
      size: item.size,
      qty: item.quantity
    }));

    setCart(cart);
    return true;
  } catch (error) {
    let localCart = getCart();
    const item = localCart.find(i => i.id === id && i.size === size);
    if (item) item.qty = qty;
    setCart(localCart);
    return true;
  }
}


// ======================================================
// REMOVE ITEM FROM MONGODB / DB CART
// ======================================================

async function removeCartItemFromServer(id, size) {
  const token = getToken();

  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${window.API_BASE}/api/cart`,
      {
        method: "DELETE",
        headers,
        credentials: "include",
        body: JSON.stringify({
          productId: id,
          size: size
        })
      }
    );

    if (response.status === 401) {
      let localCart = getCart().filter(i => !(i.id === id && i.size === size));
      setCart(localCart);
      return true;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not remove item");
    }

    const cart = (data.items || []).map((item) => ({
      id: item.productId,
      size: item.size,
      qty: item.quantity
    }));

    setCart(cart);
    return true;
  } catch (error) {
    let localCart = getCart().filter(i => !(i.id === id && i.size === size));
    setCart(localCart);
    return true;
  }
}


// ======================================================
// ADD TO CART
// ======================================================

async function addToCart(id, size = "30ml", qty = 1) {
  const success = await addCartToServer(id, size, qty);

  if (success) {
    const product = productById(id);
    toast(`${product?.name || "Product"} · ${size} added to bag`);
  }
}


// ======================================================
// CART COUNT
// ======================================================

function cartCount() {

  return getCart().reduce(
    (total, item) =>
      total + Number(item.qty || 0),
    0
  );

}


// ======================================================
// CART SUBTOTAL
// ======================================================

function cartSubtotal() {
  return getCart().reduce((total, item) => {
    const p = productById(item.id);
    const price = p?.prices?.[item.size]?.price ?? p?.price ?? (SIZES[item.size]?.price || 399);
    return total + (Number(price) * Number(item.qty || 1));
  }, 0);
}


// ======================================================
// WISHLIST MODULE (Cache in localStorage + Sync to MongoDB Atlas)
// ======================================================

const normalizeWishlistItem = (item) => {
  if (typeof item === "string") {
    return {
      productId: item,
      notifyPriceDrop: true,
      notifyBackInStock: true,
      addedAt: new Date().toISOString()
    };
  }
  return {
    productId: String(item.productId || item.id || ""),
    notifyPriceDrop: item.notifyPriceDrop !== false,
    notifyBackInStock: item.notifyBackInStock !== false,
    addedAt: item.addedAt || new Date().toISOString()
  };
};

const getWishlist = () => {
  try {
    const raw = JSON.parse(localStorage.getItem("s369_wishlist") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeWishlistItem).filter(x => Boolean(x.productId));
  } catch (e) {
    return [];
  }
};

const getGuestId = () => {
  let gid = localStorage.getItem("s369_guest_id");
  if (!gid) {
    const match = document.cookie.match(/(?:^|;\s*)s369_guest_id=([^;]+)/);
    if (match) gid = decodeURIComponent(match[1]);
  }
  if (!gid) {
    gid = "gst_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("s369_guest_id", gid);
    document.cookie = `s369_guest_id=${gid}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return gid;
};

const getAuthHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const guestId = getGuestId();
  if (guestId) headers["x-guest-id"] = guestId;
  return headers;
};

const getWishlistIds = () => getWishlist().map(x => x.productId);

const isInWishlist = (id) => getWishlistIds().includes(String(id));

const setWishlist = (items) => {
  const normalized = Array.isArray(items) ? items.map(normalizeWishlistItem).filter(x => Boolean(x.productId)) : [];
  localStorage.setItem("s369_wishlist", JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("s369-wishlist", { detail: { items: normalized } }));
  updateCounters();
};

async function loadWishlistFromServer() {
  try {
    const res = await fetch(`${window.API_BASE}/api/wishlist`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        if (data.guestId) localStorage.setItem("s369_guest_id", data.guestId);
        setWishlist(data.items);
        return data.items;
      }
    }
  } catch (e) {
    console.warn("Could not load wishlist from server:", e);
  }
  return getWishlist();
}

async function toggleWishlist(id, options = {}) {
  const pId = String(id);
  const current = getWishlist();
  const exists = current.some(i => i.productId === pId);
  let updated;
  let action;

  if (exists) {
    updated = current.filter(i => i.productId !== pId);
    action = "removed";
  } else {
    updated = [
      ...current,
      {
        productId: pId,
        notifyPriceDrop: options.notifyPriceDrop !== false,
        notifyBackInStock: options.notifyBackInStock !== false,
        addedAt: new Date().toISOString()
      }
    ];
    action = "added";
  }

  setWishlist(updated);

  const product = productById(pId);
  const pName = product ? product.name : "Fragrance";

  toast(action === "added" ? `${pName} added to wishlist ❤️` : `${pName} removed from wishlist`);

  // Persist to MongoDB Atlas Cloud (both guest and authenticated)
  try {
    const res = await fetch(`${window.API_BASE}/api/wishlist`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        productId: pId,
        notifyPriceDrop: options.notifyPriceDrop !== false,
        notifyBackInStock: options.notifyBackInStock !== false
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        if (data.guestId) localStorage.setItem("s369_guest_id", data.guestId);
        setWishlist(data.items);
      }
    }
  } catch (err) {
    console.warn("Could not sync wishlist toggle to DB:", err);
  }

  return action === "added";
}

async function removeFromWishlist(id) {
  const pId = String(id);
  const current = getWishlist();
  const updated = current.filter(i => i.productId !== pId);
  setWishlist(updated);

  const product = productById(pId);
  const pName = product ? product.name : "Fragrance";
  toast(`${pName} removed from wishlist`);

  try {
    const res = await fetch(`${window.API_BASE}/api/wishlist/${pId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        if (data.guestId) localStorage.setItem("s369_guest_id", data.guestId);
        setWishlist(data.items);
      }
    }
  } catch (err) {
    console.warn("Could not delete from DB wishlist:", err);
  }
}

async function updateWishlistNotification(id, { notifyPriceDrop, notifyBackInStock }) {
  const pId = String(id);
  const current = getWishlist();
  const item = current.find(i => i.productId === pId);
  if (!item) return;

  if (typeof notifyPriceDrop === "boolean") item.notifyPriceDrop = notifyPriceDrop;
  if (typeof notifyBackInStock === "boolean") item.notifyBackInStock = notifyBackInStock;

  setWishlist(current);

  try {
    await fetch(`${window.API_BASE}/api/wishlist/${pId}/notifications`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ notifyPriceDrop, notifyBackInStock })
    });
  } catch (err) {
    console.warn("Could not update notifications in DB:", err);
  }
}

async function syncWishlistWithServer() {
  try {
    const local = getWishlist();
    const res = await fetch(`${window.API_BASE}/api/wishlist/sync`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ items: local })
    });

    const data = await res.json();
    if (data.ok && Array.isArray(data.items)) {
      if (data.guestId) localStorage.setItem("s369_guest_id", data.guestId);
      setWishlist(data.items);
      return data.items;
    }
  } catch (err) {
    console.warn("Wishlist sync error:", err);
  }
  return getWishlist();
}


// ======================================================
// TOAST
// ======================================================

function toast(msg) {

  let t = document.getElementById("toast");

  if (!t) {

    t = document.createElement("div");

    t.id = "toast";

    t.className = "toast";

    document.body.appendChild(t);

  }

  t.textContent = msg;

  t.classList.add("show");

  clearTimeout(window._toast);

  window._toast = setTimeout(
    () => t.classList.remove("show"),
    2200
  );

}


// ======================================================
// PRODUCT CARD
// ======================================================

function productCard(p) {

  const wish = isInWishlist(p.id);

  return `
    <article
      class="product-card reveal-card"
      data-product="${p.id}"
    >

      <div class="product-media">

        <a href="product.html?id=${p.id}">
          <img
            src="${productImageSrc(p)}"
            alt="S369 ${p.name} Eau de Parfum"
            loading="lazy"
            referrerpolicy="no-referrer"
          >
        </a>

        <span class="product-badge">
          EAU DE PARFUM
        </span>

        <div style="position:absolute; bottom:10px; left:10px; display:flex; gap:6px; z-index:2;">
          <span style="background:rgba(93,31,45,0.88); color:#fff; font-size:10.5px; font-weight:700; padding:3px 8px; border-radius:12px; letter-spacing:0.4px;">${p.gender || "Unisex"}</span>
          <span style="background:rgba(255,255,255,0.95); color:#111; font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.12);">★ ${p.rating || "4.9"}</span>
        </div>

        <button
          class="wishlist-btn ${wish ? "active" : ""}"
          data-wish="${p.id}"
          aria-label="${wish ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}"
          title="${wish ? "Remove from wishlist" : "Add to wishlist"}"
        >
          <svg class="heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="${wish ? "#ffffff" : "none"}" stroke="${wish ? "#ffffff" : "#5d1f2d"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

      </div>


      <div class="product-info">

        <div class="product-name-row">

          <div>

            <a href="product.html?id=${p.id}">
              <h3>${p.name}</h3>
            </a>

            <div class="tagline">
              ${p.scentFamily ? `<span style="color:#5d1f2d; font-weight:600;">${p.scentFamily}</span> · ` : ""}${p.tagline}
            </div>

          </div>


          <div class="price-block">

            <strong data-price>
              ${fmt(p.prices?.["30ml"]?.price || p.price || SIZES["30ml"].price)}
            </strong>

            <del data-mrp>
              ${fmt(p.prices?.["30ml"]?.mrp || (p.price ? p.price * 2 : SIZES["30ml"].mrp))}
            </del>

          </div>

        </div>


        <p class="short">
          ${p.short}
        </p>


        <div class="product-actions">

          <select
            data-card-size
            aria-label="Select size for ${p.name}"
          >
            <option>30ml</option>
            <option>50ml</option>
            <option>100ml</option>
          </select>

          <button data-add="${p.id}">
            Add to bag
          </button>

        </div>

      </div>

    </article>
  `;
}


// ======================================================
// PRODUCT CARD EVENTS
// ======================================================

function wireProductCards(
  scope = document
) {

  scope
    .querySelectorAll("[data-wish]")
    .forEach((button) => {
      button.onclick = async (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const pId = button.dataset.wish;
        const isAdded = await toggleWishlist(pId);
        button.classList.toggle("active", isAdded);
        button.setAttribute("title", isAdded ? "Remove from wishlist" : "Add to wishlist");
        button.setAttribute("aria-label", isAdded ? `Remove from wishlist` : `Save to wishlist`);
        button.innerHTML = isAdded
          ? `<svg class="heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`
          : `<svg class="heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5d1f2d" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
      };
    });


  scope
    .querySelectorAll(".product-card")
    .forEach((card) => {

      const select =
        card.querySelector(
          "[data-card-size]"
        );


      if (select) {

        select.onchange = () => {

          const addBtn = card.querySelector("[data-add]");
          const pId = addBtn?.dataset?.add;
          const prod = productById(pId);
          const sizeVal = select.value;
          const sizePricing = prod?.prices?.[sizeVal] || SIZES[sizeVal] || { price: 399, mrp: 799 };

          card.querySelector(
            "[data-price]"
          ).textContent =
            fmt(sizePricing.price);


          card.querySelector(
            "[data-mrp]"
          ).textContent =
            fmt(sizePricing.mrp);

        };

      }


      const add =
        card.querySelector(
          "[data-add]"
        );


      if (add) {

        add.onclick = () => {

          addToCart(
            add.dataset.add,
            select?.value || "30ml",
            1
          );

        };

      }

    });

}


// ======================================================
// COUNTERS
// ======================================================

function updateCounters() {

  document
    .querySelectorAll("[data-cart-count]")
    .forEach(
      (x) =>
        (x.textContent = cartCount())
    );


  document
    .querySelectorAll("[data-wish-count]")
    .forEach(
      (x) =>
        (x.textContent =
          getWishlist().length)
    );

}


// ======================================================
// HEADER
// ======================================================

function header(active = "") {

  return `
    <div class="announcement">
      S369 · Eau de Parfum
      <span>•</span>
      Available in 30ml / 50ml / 100ml
    </div>


    <header class="site-header">

      <a class="brand" href="index.html">
        <img
          src="assets/images/brand/logo-red.png"
          alt="S369 Perfume"
        >
      </a>


      <nav class="main-nav">

        <a
          class="${active === "home" ? "active" : ""}"
          href="index.html"
        >
          Home
        </a>

        <a
          class="${active === "shop" ? "active" : ""}"
          href="shop.html"
        >
          Shop
        </a>

        <a
          class="${active === "about" ? "active" : ""}"
          href="about.html"
        >
          Our Story
        </a>

        <a
          class="${active === "contact" ? "active" : ""}"
          href="contact.html"
        >
          Contact
        </a>

        <a
          class="${active === "track" ? "active" : ""}"
          href="track-order.html"
        >
          Track Order
        </a>

        <a
          class="${active === "login" ? "active" : ""}"
          href="login.html"
        >
          Account
        </a>
      </nav>


      <div class="header-actions">

        <button
          class="icon-action search-trigger"
          aria-label="Search"
        >
          <span class="word">Search</span> ⌕
        </button>


        <a
          class="icon-action"
          href="wishlist.html"
          aria-label="Wishlist"
        >
          ♡
          <span
            class="badge-count"
            data-wish-count
          >
            0
          </span>
        </a>


        <button
          class="icon-action cart-trigger"
          aria-label="Shopping bag"
        >
          Bag

          <span
            class="badge-count"
            data-cart-count
          >
            0
          </span>

        </button>


        <button
          class="menu-toggle"
          aria-label="Menu"
        >
          <span></span>
          <span></span>
        </button>

      </div>

    </header>


    <nav class="mobile-menu">

      <a href="index.html">Home</a>
      <a href="shop.html">Shop</a>
      <a href="about.html">Our Story</a>
      <a href="contact.html">Contact</a>
      <a href="wishlist.html">Wishlist</a>
      <a href="track-order.html">Track Orders</a>

      <a
        href="assets/docs/S369-Catalogue.pdf"
        target="_blank"
      >
        Catalogue
      </a>

    </nav>
  `;

}


// ======================================================
// FOOTER
// ======================================================

function footer() {

  return `
    <section class="newsletter">

      <div>

        <p class="eyebrow">
          THE S369 LIST
        </p>

        <h2>
          Private offers. New launches. Fragrance stories.
        </h2>

      </div>


      <form data-newsletter>

        <input
          type="email"
          required
          placeholder="Your email address"
        >

        <button>
          Join the list →
        </button>

      </form>

    </section>


    <footer class="footer">

      <div class="footer-logo">

        <img
          src="assets/images/brand/logo-cream.png"
          alt="S369 Perfume"
        >

        <p>
          Presence, bottled.
        </p>

      </div>


      <div class="footer-col">

        <b>Shop</b>

        <a href="shop.html">
          All fragrances
        </a>

        <a href="wishlist.html">
          Wishlist
        </a>

        <a href="cart.html">
          Shopping bag
        </a>

        <a href="track-order.html">
          Track orders
        </a>

      </div>


      <div class="footer-col">

        <b>Discover</b>

        <a href="about.html">
          Our story
        </a>

        <a
          href="assets/docs/S369-Catalogue.pdf"
          target="_blank"
        >
          Catalogue
        </a>

        <a href="contact.html">
          Contact
        </a>

      </div>


      <div class="footer-col">

        <b>Help</b>

        <a href="policies.html#shipping">
          Shipping
        </a>

        <a href="policies.html#returns">
          Returns
        </a>

        <a href="policies.html#privacy">
          Privacy
        </a>

        <a href="policies.html#terms">
          Terms
        </a>

      </div>


      <div class="footer-col">

        <b>Sizes</b>

        <span>30ml</span>
        <span>50ml</span>
        <span>100ml</span>
        <span>Eau de Parfum</span>

      </div>


      <div class="footer-bottom">

        <span>
          © 2026 S369 Perfume. All rights reserved.
        </span>

        <span>
          s369.in · Eau de Parfum · <a href="admin.html" style="color:inherit; text-decoration:none; opacity:0.85;">Admin Portal</a>
        </span>

      </div>

    </footer>
  `;

}


// ======================================================
// GLOBAL CHROME
// ======================================================

function globalChrome(active = "") {

  document.querySelector(
    "[data-header]"
  ).innerHTML = header(active);


  document.querySelector(
    "[data-footer]"
  ).innerHTML = footer();


  document.body.insertAdjacentHTML(
    "beforeend",

    `
      <div
        class="search-overlay"
        aria-hidden="true"
      >

        <button class="search-close">
          ×
        </button>

        <div class="search-box">

          <p class="eyebrow">
            SEARCH S369
          </p>

          <h2>
            Find your fragrance.
          </h2>

          <input
            type="search"
            placeholder="Search by fragrance or note…"
            autofocus
          >

          <div class="search-results"></div>

        </div>

      </div>


      <div class="drawer-bg"></div>


      <aside class="mini-cart">

        <div class="drawer-head">

          <h3>
            Your bag
          </h3>

          <button aria-label="Close bag">
            ×
          </button>

        </div>


        <div class="mini-items"></div>

        <div class="mini-footer"></div>

      </aside>
    `
  );


  wireGlobal();

  updateCounters();

  renderMiniCart();

  // Check auth session from cookie/token
  checkAuthSession().then((user) => {
    if (user) {
      document.querySelectorAll(".main-nav a[href='login.html']").forEach(a => {
        a.href = "account.html";
        a.textContent = user.name ? `Account (${user.name.split(" ")[0]})` : "Account";
      });
      document.querySelectorAll(".mobile-menu a[href='login.html']").forEach(a => {
        a.href = "account.html";
        a.textContent = user.name ? `Account (${user.name.split(" ")[0]})` : "Account";
      });
    }
  });

  // Fetch fresh products and pricing from MongoDB Atlas DB
  loadProductsFromApi()
    .then(() => {
      updateCounters();
      renderMiniCart();
    });

  // Load this user's MongoDB cart
  loadCartFromServer()
    .then(() => {

      updateCounters();

      renderMiniCart();

      window.dispatchEvent(
        new Event("s369-cart")
      );

    });

  // Load and sync this user's MongoDB wishlist
  syncWishlistWithServer()
    .then(() => {
      updateCounters();
      window.dispatchEvent(new Event("s369-wishlist"));
    });

  // Sticky navigation bar scroll state
  const headerEl = document.querySelector(".site-header");
  if (headerEl) {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        headerEl.classList.add("scrolled");
      } else {
        headerEl.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }

}


// ======================================================
// GLOBAL EVENTS
// ======================================================

function wireGlobal() {

  const mm =
    document.querySelector(
      ".mobile-menu"
    );

  const mt =
    document.querySelector(
      ".menu-toggle"
    );


  mt.onclick = () => {

    mm.classList.toggle("open");

    document.body.classList.toggle(
      "no-scroll",
      mm.classList.contains("open")
    );

  };


  // Newsletter
  document
    .querySelectorAll("[data-newsletter]")
    .forEach(
      (form) =>

        (form.onsubmit = async (e) => {

          e.preventDefault();


          const input =
            form.querySelector(
              'input[type="email"]'
            );


          const email =
            input?.value?.trim();


          if (!email) return;


          try {

            const r =
              await fetch(
                `${
                  CONFIG.apiBase ||
                  "api"
                }/subscribe.php`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body: JSON.stringify({
                    email
                  })
                }
              );


            const d =
              await r.json();


            if (!r.ok || !d.ok) {

              throw new Error(
                d.message ||
                "Could not subscribe."
              );

            }


            form.reset();

            toast(
              d.message ||
              "You are on the S369 list."
            );


          } catch (err) {

            toast(
              err.message ||
              "Could not subscribe."
            );

          }

        })
    );


  // Search
  const overlay =
    document.querySelector(
      ".search-overlay"
    );

  const input =
    overlay.querySelector("input");

  const results =
    overlay.querySelector(
      ".search-results"
    );


  document.querySelector(
    ".search-trigger"
  ).onclick = () => {

    overlay.classList.add("open");

    document.body.classList.add(
      "no-scroll"
    );

    setTimeout(
      () => input.focus(),
      50
    );

  };


  overlay.querySelector(
    ".search-close"
  ).onclick = () => {

    overlay.classList.remove(
      "open"
    );

    document.body.classList.remove(
      "no-scroll"
    );

  };


  input.oninput = () => {

    let q =
      input.value
        .trim()
        .toLowerCase();


    let matches = q
      ? PRODUCTS.filter(
          (p) =>
            (
              p.name +
              " " +
              p.tagline +
              " " +
              p.short +
              " " +
              p.keywords.join(" ")
            )
              .toLowerCase()
              .includes(q)
        ).slice(0, 6)
      : [];


    results.innerHTML =
      matches
        .map(
          (p) =>
            `
              <a
                class="search-result"
                href="product.html?id=${p.id}"
              >

                <img
                  src="assets/images/products/${p.image}"
                  alt=""
                >

                <div>

                  <b>
                    ${p.name}
                  </b>

                  <span>
                    ${p.tagline}
                  </span>

                </div>

                <span>
                  View →
                </span>

              </a>
            `
        )
        .join("");

  };


  // Mini cart
  const bg =
    document.querySelector(
      ".drawer-bg"
    );

  const drawer =
    document.querySelector(
      ".mini-cart"
    );


  document
    .querySelectorAll(".cart-trigger")
    .forEach(
      (button) =>

        (button.onclick = () => {

          drawer.classList.add(
            "open"
          );

          bg.classList.add(
            "show"
          );

          document.body.classList.add(
            "no-scroll"
          );

        })
    );


  const close = () => {

    drawer.classList.remove(
      "open"
    );

    bg.classList.remove(
      "show"
    );

    document.body.classList.remove(
      "no-scroll"
    );

  };


  bg.onclick = close;


  drawer.querySelector(
    ".drawer-head button"
  ).onclick = close;


  window.addEventListener(
    "s369-cart",
    () => {

      updateCounters();

      renderMiniCart();

    }
  );


  window.addEventListener(
    "s369-wishlist",
    updateCounters
  );

}


// ======================================================
// MINI CART
// ======================================================

function renderMiniCart() {

  const c = getCart();


  const items =
    document.querySelector(
      ".mini-items"
    );

  const foot =
    document.querySelector(
      ".mini-footer"
    );


  if (!items || !foot) {
    return;
  }


  if (!c.length) {

    items.innerHTML = `
      <div class="empty-mini">

        <h4>
          Your bag is empty.
        </h4>

        <p>
          Find a fragrance that feels like you.
        </p>

        <a
          class="btn btn-dark"
          href="shop.html"
        >
          Shop fragrances
        </a>

      </div>
    `;

    foot.innerHTML = "";

    return;

  }


  items.innerHTML =
    c
      .map((x) => {

        const p =
          productById(x.id);


        if (!p) {
          return "";
        }


        return `
          <div class="mini-line">

            <img
              src="assets/images/products/${p.image}"
              alt=""
            >

            <div>

              <b>
                ${p.name}
              </b>

              <span>
                ${x.size} · Qty ${x.qty}
              </span>

            </div>

            <strong>
              ${fmt(
                (p.prices?.[x.size]?.price ?? p.price ?? SIZES[x.size]?.price ?? 399) *
                x.qty
              )}
            </strong>

          </div>
        `;

      })
      .join("");


  foot.innerHTML = `

    <div class="summary-row">

      <span>
        Subtotal
      </span>

      <strong>
        ${fmt(cartSubtotal())}
      </strong>

    </div>


    <p class="hint">
      Shipping and payment are confirmed at checkout.
    </p>


    <a
      class="btn btn-dark btn-full"
      href="cart.html"
    >
      View bag & checkout
    </a>

  `;

}


// ======================================================
// WHATSAPP ORDER
// ======================================================

function whatsappOrder() {

  const c = getCart();


  if (!c.length) {

    toast(
      "Your bag is empty."
    );

    return;

  }


  let total =
    cartSubtotal();


  let lines = [
    "Hello, I would like to order from S369 Perfume:",
    ""
  ];


  c.forEach((x) => {

    const p =
      productById(x.id);


    if (!p) return;

    const unitPrice = p.prices?.[x.size]?.price ?? p.price ?? SIZES[x.size]?.price ?? 399;

    lines.push(
      `• ${p.name} — ${x.size} × ${x.qty} — ${
        fmt(
          unitPrice *
          x.qty
        )
      }`
    );

  });


  lines.push(
    "",
    `Subtotal: ${fmt(total)}`,
    "Please confirm availability, shipping and final payment details."
  );


  const number =
    (
      CONFIG.whatsappNumber ||
      ""
    ).replace(/\D/g, "");


  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(
      lines.join("\n")
    )}`,
    "_blank",
    "noopener"
  );

}


// ======================================================
// SHOP GRID
// ======================================================

function renderShopGrid(
  el,
  items = PRODUCTS
) {

  el.innerHTML =
    items
      .map(productCard)
      .join("");


  wireProductCards(el);


  const cards =
    [
      ...el.querySelectorAll(
        ".reveal-card"
      )
    ];


  if (
    "IntersectionObserver" in window
  ) {

    const io =
      new IntersectionObserver(
        (entries) =>
          entries.forEach(
            (entry) => {

              if (
                entry.isIntersecting
              ) {

                entry.target.classList.add(
                  "is-visible"
                );

                io.unobserve(
                  entry.target
                );

              }

            }
          ),
        {
          threshold: 0.12
        }
      );


    cards.forEach((card, i) => {

      card.style.setProperty(
        "--delay",
        (i % 6) * 80 + "ms"
      );

      io.observe(card);

    });

  } else {

    cards.forEach(
      (card) =>
        card.classList.add(
          "is-visible"
        )
    );

  }

}


// ======================================================
// GLOBAL S369 OBJECT
// ======================================================

async function loadProductsFromApi() {
  try {
    const res = await fetch(`${window.API_BASE}/api/products?_t=${Date.now()}`, {
      cache: "no-store"
    });
    const data = await res.json();
    if (data.ok && Array.isArray(data.products) && data.products.length > 0) {
      window.S369_PRODUCTS = data.products;
      if (window.S369) {
        window.S369.PRODUCTS = data.products;
      }
      return data.products;
    }
  } catch (e) {
    console.warn("Could not fetch dynamic products from API:", e);
  }
  return window.S369_PRODUCTS || [];
}

async function buyNow(id, size = "30ml", qty = 1) {
  const token = getToken();
  if (!token) {
    toast("Please login to proceed to checkout.");
    setTimeout(() => { window.location.href = "login.html"; }, 700);
    return;
  }
  const success = await addCartToServer(id, size, qty);
  if (success) {
    window.location.href = "checkout.html";
  }
}

window.S369 = {

  PRODUCTS,

  CONFIG,

  SIZES,

  fmt,

  productById,

  getCart,

  setCart,

  loadCartFromServer,

  syncCartWithServer,

  getToken,

  getUser,

  getCookie,

  checkAuthSession,

  addToCart,

  addCartToServer,

  buyNow,

  loadProductsFromApi,

  updateCartItemOnServer,

  removeCartItemFromServer,

  getWishlist,

  getWishlistIds,

  isInWishlist,

  setWishlist,

  cartCount,

  cartSubtotal,

  toggleWishlist,

  removeFromWishlist,

  updateWishlistNotification,

  syncWishlistWithServer,

  productCard,

  wireProductCards,

  updateCounters,

  globalChrome,

  renderShopGrid,

  whatsappOrder,

  toast,

  productImageSrc,

  PRODUCT_DRIVE_IMAGES,

  getGuestId,

  loadWishlistFromServer,

  driveThumb

};


// ======================================================
// HOME HERO VIDEO
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const hero =
      document.querySelector(
        ".hero"
      );


    if (!hero) return;


    const old =
      hero.querySelector(
        ":scope > img"
      );


    if (old) {
      old.classList.add(
        "hero-poster"
      );
    }


    const video =
      document.createElement(
        "video"
      );


    video.className =
      "hero-video";

    video.autoplay = true;

    video.muted = true;

    video.loop = true;

    video.playsInline = true;

    video.preload = "metadata";


    video.poster =
      old?.src ||
      "assets/images/hero.jpg";


    video.innerHTML = `
      <source
        src="https://drive.usercontent.google.com/download?id=1xH6_Qqqoc6AGAGnr47Hwx8SPLyIxrcxK&export=download&confirm=t"
        type="video/mp4"
      >
    `;


    video.addEventListener(
      "playing",
      () =>
        hero.classList.add(
          "video-ready"
        )
    );


    video.addEventListener(
      "error",
      () =>
        hero.classList.add(
          "video-fallback"
        )
    );


    hero.prepend(video);


    const toggle =
      document.createElement(
        "button"
      );


    toggle.className =
      "hero-sound";

    toggle.type = "button";

    toggle.textContent =
      "Sound off";


    toggle.setAttribute(
      "aria-label",
      "Toggle hero video sound"
    );


    toggle.onclick = () => {

      video.muted =
        !video.muted;

      toggle.textContent =
        video.muted
          ? "Sound off"
          : "Sound on";

    };


    hero.appendChild(toggle);


    video
      .play()
      .catch(() => {});

  }
);


// ======================================================
// HOME ANIMATIONS
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const video =
      document.querySelector(
        ".hero-video"
      );

    const source =
      video?.querySelector(
        "source"
      );


    if (source) {

      source.src =
        "https://drive.usercontent.google.com/download?id=1GVTIUQ5ACqtypCSrWk_0hzy3FcSbBiKN&export=download&confirm=t";

      video.load();

      video
        .play()
        .catch(() => {});

    }


    const targets =
      document.querySelectorAll(
        ".benefit-bar,.section-head,.lifestyle-gallery,.story-split,.notes-board,.reviews-layout"
      );


    targets.forEach(
      (x) =>
        x.classList.add(
          "home-reveal"
        )
    );


    if (
      "IntersectionObserver" in window
    ) {

      const io =
        new IntersectionObserver(
          (entries) =>
            entries.forEach(
              (entry) => {

                if (
                  entry.isIntersecting
                ) {

                  entry.target.classList.add(
                    "show"
                  );

                  io.unobserve(
                    entry.target
                  );

                }

              }
            ),
          {
            threshold: 0.12,
            rootMargin:
              "0px 0px -45px"
          }
        );


      targets.forEach(
        (x) => io.observe(x)
      );

    } else {

      targets.forEach(
        (x) =>
          x.classList.add(
            "show"
          )
      );

    }


    let ticking = false;


    addEventListener(
      "scroll",
      () => {

        if (ticking) return;

        ticking = true;


        requestAnimationFrame(
          () => {

            const hero =
              document.querySelector(
                ".hero-content"
              );


            if (
              hero &&
              scrollY < innerHeight
            ) {

              hero.style.transform =
                "translate3d(0," +
                scrollY * 0.12 +
                "px,0)";

            }


            ticking = false;

          }
        );

      },
      {
        passive: true
      }
    );

  }
);


// ======================================================
// HERO PRODUCT FILM
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const hero =
      document.querySelector(
        ".hero"
      );


    if (!hero) return;


    hero
      .querySelector(
        ".hero-video"
      )
      ?.pause();


    hero.classList.remove(
      "video-ready"
    );


    const sound =
      hero.querySelector(
        ".hero-sound"
      );


    if (sound) {
      sound.remove();
    }


    const film =
      document.createElement(
        "div"
      );


    film.className =
      "hero-product-film";


    hero.prepend(film);


    const shots = [

      "1HMmqsW7iQwsNdCS_1YBo7O4K2Yl_yLha",

      "1BmYMAHlwkunOng3ijHpBzrxyGGb88a0E",

      "1suLNsFQKJmHbtFlgK_iOR8i3qnfUhKGO"

    ];


    let i = 0;


    const show = () => {

      film.classList.remove(
        "visible"
      );


      setTimeout(() => {

        film.style.backgroundImage =
          `url('${driveThumb(
            shots[
              i % shots.length
            ],
            2000
          )}')`;


        film.classList.add(
          "visible"
        );


        i++;

      }, 450);

    };


    show();


    setInterval(
      show,
      6500
    );

  }
);


// ======================================================
// HERO LOCAL VIDEO
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const hero =
      document.querySelector(
        ".hero"
      );

    const video =
      hero?.querySelector(
        ".hero-video"
      );

    const source =
      video?.querySelector(
        "source"
      );


    if (
      !hero ||
      !video ||
      !source
    ) {
      return;
    }


    hero.classList.add(
      "pexels-hero"
    );


    hero
      .querySelector(
        ".hero-product-film"
      )
      ?.remove();


    source.src =
      "assets/videos/hero-perfume.mp4";


    video.poster =
      "assets/images/hero.jpg";


    video.load();


    video
      .play()
      .then(
        () =>
          hero.classList.add(
            "video-ready"
          )
      )
      .catch(
        () =>
          hero.classList.add(
            "video-fallback"
          )
      );

  }
);


// ======================================================
// LUXE PRODUCT PREVIEW
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    document.body.insertAdjacentHTML(
      "beforeend",

      `
        <div
          class="luxe-preview"
          id="luxePreview"
          aria-hidden="true"
        >

          <button
            class="luxe-close"
            aria-label="Close preview"
          >
            ×
          </button>


          <div class="luxe-preview-inner">

            <div class="luxe-preview-media">

              <img alt="">

            </div>


            <div class="luxe-preview-copy">

              <p class="eyebrow">
                S369 · EAU DE PARFUM
              </p>

              <h2></h2>

              <p class="luxe-preview-tag"></p>


              <div class="luxe-preview-actions">

                <a
                  class="btn btn-primary"
                  href="#"
                >
                  View fragrance
                </a>

                <button
                  class="btn btn-outline"
                  type="button"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>
      `
    );


    const modal =
      document.getElementById(
        "luxePreview"
      );


    const img =
      modal.querySelector(
        "img"
      );


    const title =
      modal.querySelector(
        "h2"
      );


    const tag =
      modal.querySelector(
        ".luxe-preview-tag"
      );


    const view =
      modal.querySelector(
        "a"
      );


    const close = () => {

      modal.classList.remove(
        "open"
      );

      modal.setAttribute(
        "aria-hidden",
        "true"
      );

      document.body.classList.remove(
        "no-scroll"
      );

    };


    document.addEventListener(
      "click",
      (e) => {

        const cardImage =
          e.target.closest(
            ".product-card .product-media img"
          );


        const galleryImage =
          e.target.closest(
            ".drive-shot img"
          );


        if (
          !cardImage &&
          !galleryImage
        ) {
          return;
        }


        e.preventDefault();


        const card =
          cardImage?.closest(
            ".product-card"
          );


        const p =
          card
            ? productById(
                card.dataset.product
              )
            : null;


        img.src =
          (
            cardImage ||
            galleryImage
          ).currentSrc ||
          (
            cardImage ||
            galleryImage
          ).src;


        img.alt =
          (
            cardImage ||
            galleryImage
          ).alt;


        title.textContent =
          p?.name ||
          "S369 Collection";


        tag.textContent =
          p?.tagline ||
          "A moment of luxury, captured.";


        view.href =
          p
            ? "product.html?id=" +
              p.id
            : "shop.html";


        view.textContent =
          p
            ? "View fragrance"
            : "View gallery";


        modal.classList.add(
          "open"
        );


        modal.setAttribute(
          "aria-hidden",
          "false"
        );


        document.body.classList.add(
          "no-scroll"
        );

      }
    );


    modal
      .querySelector(
        ".luxe-close"
      )
      .onclick = close;


    modal
      .querySelector(
        ".luxe-preview-actions button"
      )
      .onclick = close;


    modal.onclick = (e) => {

      if (
        e.target === modal
      ) {
        close();
      }

    };


    document.addEventListener(
      "keydown",
      (e) => {

        if (
          e.key === "Escape"
        ) {
          close();
        }

      }
    );

  }
);
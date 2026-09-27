(() => {
  const form = document.getElementById("checkoutForm");
  const itemsEl = document.getElementById("checkoutItems");
  const totalsEl = document.getElementById("checkoutTotals");
  const payBtn = document.getElementById("placeOrderBtn");
  const paymentStatus = document.getElementById("paymentAvailability");
  const couponInput = document.getElementById("couponInput");
  const couponMsg = document.getElementById("couponMsg");

  const cart = S369.getCart();
  let activeCoupon = null;

  const rawBase = window.API_BASE || (window.S369_CONFIG && window.S369_CONFIG.apiBase) || "http://localhost:5000";
  const API_BASE = rawBase.replace(/\/api\/?$/, "").replace(/\/$/, "");

  let publicCfg = {
    razorpay_enabled: true,
    shipping_flat: 0,
    key_id: "rzp_live_TgMDWZDCm3I8w5"
  };

  // If bag is empty, redirect to cart
  if (!cart || !cart.length) {
    location.href = "cart.html";
    return;
  }

  // Pre-fill user profile if logged in
  (async () => {
    const user = await S369.checkAuthSession();
    if (user) {
      const emailField = document.getElementById("contactInput");
      const firstNameField = document.getElementById("firstNameInput");
      const lastNameField = document.getElementById("lastNameInput");

      if (emailField && user.email) emailField.value = user.email;
      if (user.name) {
        const parts = user.name.trim().split(" ");
        if (firstNameField && !firstNameField.value) firstNameField.value = parts[0] || "";
        if (lastNameField && !lastNameField.value) lastNameField.value = parts.slice(1).join(" ") || "";
      }
    }
  })();

  function render() {
    itemsEl.innerHTML = cart
      .map((x) => {
        const p = S369.productById(x.id);
        const pName = p ? p.name : (x.id || "Perfume");
        const pImg = p ? S369.productImageSrc(p) : "assets/images/hero.jpg";
        const price = p?.prices?.[x.size]?.price ?? p?.price ?? (S369.SIZES[x.size] ? S369.SIZES[x.size].price : 399);
        return `
          <div class="checkout-item">
            <img src="${pImg}" alt="${pName}">
            <div class="checkout-item-details">
              <div class="checkout-item-name">${pName}</div>
              <div class="checkout-item-sub">${x.size} · Qty ${x.qty}</div>
            </div>
            <strong class="checkout-item-price">${S369.fmt(price * x.qty)}</strong>
          </div>
        `;
      })
      .join("");

    const sub = S369.cartSubtotal();
    const discount = activeCoupon ? activeCoupon.discount : 0;
    const shipping = Number(publicCfg.shipping_flat || 0);
    const total = Math.max(1, sub - discount + shipping);

    let totalsHtml = `
      <div class="summary-row">
        <span>Subtotal</span>
        <strong>${S369.fmt(sub)}</strong>
      </div>
    `;

    if (activeCoupon && discount > 0) {
      totalsHtml += `
        <div class="summary-row" style="color: #1b5e20;">
          <span>Coupon (${activeCoupon.code})</span>
          <strong>−${S369.fmt(discount)}</strong>
        </div>
      `;
    }

    totalsHtml += `
      <div class="summary-row">
        <span>Delivery / Shipping</span>
        <strong style="color: #1b5e20;">${shipping ? S369.fmt(shipping) : "FREE"}</strong>
      </div>
      <div class="summary-row total" style="font-size: 19px; font-weight: 700; color: #111; margin-top: 10px; padding-top: 14px; border-top: 2px solid #222;">
        <span>Final Total</span>
        <strong style="color: #5d1f2d;">${S369.fmt(total)}</strong>
      </div>
    `;

    totalsEl.innerHTML = totalsHtml;
  }

  // COUPON VALIDATION HANDLER
  window.applyCoupon = async function () {
    const code = couponInput ? couponInput.value.trim().toUpperCase() : "";
    if (!code) {
      if (couponMsg) {
        couponMsg.className = "coupon-msg error";
        couponMsg.textContent = "Please enter a coupon code.";
      }
      return;
    }

    const subtotal = S369.cartSubtotal();
    const applyBtn = document.getElementById("applyCouponBtn");
    if (applyBtn) applyBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal })
      });

      const data = await res.json();

      if (data.ok && data.valid) {
        activeCoupon = {
          code,
          discount: data.discount
        };
        if (couponMsg) {
          couponMsg.className = "coupon-msg success";
          couponMsg.textContent = `✓ ${data.message} Saved ${S369.fmt(data.discount)}`;
        }
        render();
      } else {
        activeCoupon = null;
        if (couponMsg) {
          couponMsg.className = "coupon-msg error";
          couponMsg.textContent = data.message || "Invalid or ineligible coupon code.";
        }
        render();
      }
    } catch (err) {
      console.error("Coupon error:", err);
      if (couponMsg) {
        couponMsg.className = "coupon-msg error";
        couponMsg.textContent = "Could not validate coupon at this time.";
      }
    } finally {
      if (applyBtn) applyBtn.disabled = false;
    }
  };

  async function api(path, payload) {
    const token = S369.getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const cleanPath = path.replace(/^\/?(api\/)?/, "");
    let r;
    try {
      r = await fetch(`${API_BASE}/api/${cleanPath}`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      console.error("Network error connecting to API:", networkErr);
      throw new Error(`Unable to connect to payment server (${networkErr.message}). Please ensure the server is running.`);
    }

    const data = await r
      .json()
      .catch(() => ({ ok: false, message: `Unexpected server response (HTTP ${r.status}).` }));

    if (!r.ok || !data.ok) {
      throw new Error(data.message || `Payment request failed with status ${r.status}.`);
    }

    return data;
  }

  async function loadPublicConfig() {
    try {
      if (S369.loadProductsFromApi) {
        await S369.loadProductsFromApi();
      }
      const r = await fetch(`${API_BASE}/api/config-public`, {
        cache: "no-store",
        credentials: "include"
      });
      const d = await r.json();
      if (d.ok) publicCfg = d;
    } catch (e) {
      console.warn("Using default public config:", e);
    }
    if (payBtn) payBtn.disabled = false;
    if (paymentStatus) {
      paymentStatus.textContent = "100% Secure Online Payment (Razorpay: UPI, Cards, NetBanking).";
    }
    render();
  }

  function customer() {
    const fd = Object.fromEntries(new FormData(form).entries());
    return {
      contact: fd.contact,
      firstName: fd.firstName,
      lastName: fd.lastName,
      address: fd.address,
      city: fd.city,
      state: fd.state,
      pin: fd.pin,
      phone: fd.phone,
      notes: fd.notes || "",
    };
  }

  function setBusy(busy, text = "Processing…") {
    if (!payBtn) return;
    payBtn.disabled = busy;
    payBtn.dataset.old ||= payBtn.textContent;
    payBtn.textContent = busy ? text : payBtn.dataset.old;
  }

  // CASH ON DELIVERY (COD) ORDER PLACEMENT
  async function placeCOD() {
    setBusy(true, "Placing COD Order…");
    try {
      const c = customer();
      const d = await api("payment/create", {
        customer: c,
        items: cart,
        paymentMethod: "cod",
        couponCode: activeCoupon ? activeCoupon.code : ""
      });

      localStorage.setItem("s369_last_phone", c.phone.replace(/\D/g, ""));
      sessionStorage.setItem("s369_last_order", d.order_id);

      // Clear backend cart & local cart
      const token = S369.getToken();
      if (token) {
        await fetch(`${API_BASE}/api/cart/clear`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        }).catch(() => {});
      }
      S369.setCart([]);

      location.href = `order-success.html?order=${encodeURIComponent(d.order_id)}&method=cod`;
    } catch (err) {
      console.error("COD Order error:", err);
      S369.toast(err.message || "Failed to place COD order.");
      setBusy(false);
    }
  }

  // ONLINE RAZORPAY PAYMENT PLACEMENT
  async function placeOnline() {
    setBusy(true, "Securing order with server…");
    try {
      const c = customer();
      const d = await api("payment/create", {
        customer: c,
        items: cart,
        paymentMethod: "online",
        couponCode: activeCoupon ? activeCoupon.code : ""
      });

      const razorpayKey = d.key_id || publicCfg.key_id;

      // Launch Razorpay Popup
      if (typeof Razorpay !== "undefined" && razorpayKey && !razorpayKey.includes("placeholder")) {
        setBusy(true, "Opening Razorpay checkout…");
        const options = {
          key: razorpayKey,
          amount: d.amount,
          currency: d.currency || "INR",
          name: "S369 Perfume",
          description: "Signature Eau de Parfum Order",
          order_id: d.razorpay_order_id,
          image: "assets/images/brand/logo-red.png",
          prefill: {
            name: `${c.firstName} ${c.lastName}`.trim(),
            contact: c.phone,
            email: c.contact.includes("@") ? c.contact : "",
          },
          notes: {
            store_order_id: d.store_order_id,
            order_id: d.order_id,
            coupon: activeCoupon ? activeCoupon.code : ""
          },
          theme: { color: "#5d1f2d" },
          handler: async (response) => {
            setBusy(true, "Verifying payment confirmation…");
            try {
              const v = await api("payment/verify", {
                store_order_id: d.store_order_id,
                ...response,
              });

              localStorage.setItem("s369_last_phone", c.phone.replace(/\D/g, ""));
              sessionStorage.setItem("s369_last_order", v.order_id);

              // Clear backend cart & local cart
              const token = S369.getToken();
              if (token) {
                await fetch(`${API_BASE}/api/cart/clear`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                  credentials: "include"
                }).catch(() => {});
              }
              S369.setCart([]);

              location.href = `order-success.html?order=${encodeURIComponent(v.order_id)}&method=online`;
            } catch (err) {
              S369.toast(err.message || "Payment verification failed.");
              setBusy(false);
            }
          },
          modal: {
            ondismiss: () => {
              setBusy(false);
              S369.toast("Payment was cancelled. You can retry when ready.");
            }
          },
        };

        const rzpInstance = new Razorpay(options);
        rzpInstance.on("payment.failed", (resp) => {
          setBusy(false);
          S369.toast(`Payment failed: ${resp.error.description || "Transaction declined."}`);
        });
        rzpInstance.open();

      } else {
        // Fallback for simulation / mock order
        setBusy(true, "Finalizing simulated payment…");
        const v = await api("payment/verify", {
          store_order_id: d.store_order_id,
          razorpay_order_id: d.razorpay_order_id,
          razorpay_payment_id: "pay_sim_" + Date.now(),
          razorpay_signature: "simulated_signature"
        });

        localStorage.setItem("s369_last_phone", c.phone.replace(/\D/g, ""));
        sessionStorage.setItem("s369_last_order", v.order_id);

        const token = S369.getToken();
        if (token) {
          await fetch(`${API_BASE}/api/cart/clear`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include"
          }).catch(() => {});
        }
        S369.setCart([]);

        location.href = `order-success.html?order=${encodeURIComponent(v.order_id)}&method=online`;
      }
    } catch (err) {
      console.error("Online payment error:", err);
      S369.toast(err.message || "Failed to process online payment.");
      setBusy(false);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const c = customer();
    // 1. Strict Name Validation (Alphabets only)
    if (!/^[A-Za-z\s]{2,30}$/.test(c.firstName.trim())) {
      S369.toast("First Name must contain only alphabets (min 2 characters).");
      const f = document.getElementById("firstNameInput");
      if (f) f.focus();
      return;
    }
    if (!/^[A-Za-z\s]{1,30}$/.test(c.lastName.trim())) {
      S369.toast("Last Name must contain only alphabets.");
      const l = document.getElementById("lastNameInput");
      if (l) l.focus();
      return;
    }

    // 2. Strict Indian Mobile Number (10 digits, starts with 6,7,8,9)
    const cleanPhone = (c.phone || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      S369.toast("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
      const p = document.getElementById("phoneInput");
      if (p) p.focus();
      return;
    }

    // 3. Strict 6-digit PIN code
    const cleanPin = (c.pin || "").replace(/\D/g, "");
    if (!/^[1-9]\d{5}$/.test(cleanPin)) {
      S369.toast("Please enter a valid 6-digit postal PIN code.");
      const pi = document.getElementById("pinInput");
      if (pi) pi.focus();
      return;
    }

    // COD is removed - directly initiate secure online Razorpay payment
    await placeOnline();
  });

  loadPublicConfig();
  render();
})();

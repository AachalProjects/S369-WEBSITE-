(() => {
  const form = document.getElementById("checkoutForm");
  const itemsEl = document.getElementById("checkoutItems");
  const totalsEl = document.getElementById("checkoutTotals");
  const payBtn = document.getElementById("placeOrderBtn");
  const paymentStatus = document.getElementById("paymentAvailability");
  const cart = S369.getCart();
  let publicCfg = {
    razorpay_enabled: true,
    shipping_flat: 0,
    key_id: "rzp_test_placeholder"
  };

  if (!cart.length) location.href = "cart.html";

  function render() {
    itemsEl.innerHTML = cart
      .map((x) => {
        const p = S369.productById(x.id);
        const pName = p ? p.name : x.id;
        const pImg = p ? `assets/images/products/${p.image}` : '';
        const price = S369.SIZES[x.size] ? S369.SIZES[x.size].price : 399;
        return `<div class="checkout-item"><img src="${pImg}" alt=""><div><b>${pName}</b><span>${x.size} · Qty ${x.qty}</span></div><strong>${S369.fmt(price * x.qty)}</strong></div>`;
      })
      .join("");
    const sub = S369.cartSubtotal(),
      shipping = Number(publicCfg.shipping_flat || 0),
      total = sub + shipping;
    totalsEl.innerHTML = `<div class="summary-row"><span>Subtotal</span><strong>${S369.fmt(sub)}</strong></div><div class="summary-row"><span>Shipping</span><strong>${shipping ? S369.fmt(shipping) : "Free"}</strong></div><div class="summary-row total"><span>Total</span><strong>${S369.fmt(total)}</strong></div>`;
  }

  async function api(path, payload) {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const r = await fetch(`${S369.CONFIG.apiBase}/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await r
      .json()
      .catch(() => ({ ok: false, message: "Unexpected server response." }));
    if (!r.ok || !data.ok)
      throw new Error(data.message || "Something went wrong.");
    return data;
  }

  async function loadPublicConfig() {
    try {
      const r = await fetch(`${S369.CONFIG.apiBase}/config-public.php`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (d.ok) publicCfg = d;
    } catch (e) {
      console.warn("Using default public config:", e);
    }
    if (payBtn) payBtn.disabled = false;
    if (paymentStatus) {
      paymentStatus.textContent = "Select Online Payment or Cash on Delivery below.";
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
        paymentMethod: "cod"
      });

      localStorage.setItem("s369_last_phone", c.phone.replace(/\D/g, ""));
      sessionStorage.setItem("s369_last_order", d.order_id);

      // Clear backend cart & local cart
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${S369.CONFIG.apiBase}/cart/clear`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
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
    setBusy(true, "Creating order…");
    try {
      const c = customer();
      const d = await api("payment/create", {
        customer: c,
        items: cart,
        paymentMethod: "online"
      });

      // If Razorpay SDK is present and not mock order, launch Razorpay popup
      if (typeof Razorpay !== "undefined" && d.key_id && !d.key_id.includes("placeholder") && !d.razorpay_order_id.includes("mock")) {
        setBusy(true, "Opening secure Razorpay payment…");
        const options = {
          key: d.key_id,
          amount: d.amount,
          currency: d.currency,
          name: "S369 Perfume",
          description: "S369 fragrance order",
          order_id: d.razorpay_order_id,
          image: "assets/images/brand/logo-red.png",
          prefill: {
            name: `${c.firstName} ${c.lastName}`,
            contact: c.phone,
            email: c.contact.includes("@") ? c.contact : "",
          },
          notes: { store_order_id: d.store_order_id },
          theme: { color: "#5d1f2d" },
          handler: async (response) => {
            setBusy(true, "Verifying payment…");
            try {
              const v = await api("payment/verify", {
                store_order_id: d.store_order_id,
                ...response,
              });
              localStorage.setItem("s369_last_phone", c.phone.replace(/\D/g, ""));
              sessionStorage.setItem("s369_last_order", v.order_id);
              
              // Clear backend cart & local cart
              const token = localStorage.getItem("token");
              if (token) {
                await fetch(`${S369.CONFIG.apiBase}/cart/clear`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {});
              }
              S369.setCart([]);
              
              location.href = `order-success.html?order=${encodeURIComponent(v.order_id)}&method=online`;
            } catch (err) {
              S369.toast(err.message);
              setBusy(false);
            }
          },
          modal: { ondismiss: () => setBusy(false) },
        };
        new Razorpay(options).open();
      } else {
        // Fallback for test / simulation mode
        setBusy(true, "Verifying test payment…");
        const v = await api("payment/verify", {
          store_order_id: d.store_order_id,
          razorpay_order_id: d.razorpay_order_id,
          razorpay_payment_id: "pay_sim_" + Date.now(),
          razorpay_signature: "simulated_signature"
        });

        localStorage.setItem("s369_last_phone", c.phone.replace(/\D/g, ""));
        sessionStorage.setItem("s369_last_order", v.order_id);

        const token = localStorage.getItem("token");
        if (token) {
          await fetch(`${S369.CONFIG.apiBase}/cart/clear`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
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

    const paymentMethod = form.querySelector('input[name="payment"]:checked')?.value || "online";

    if (paymentMethod === "cod") {
      await placeCOD();
    } else {
      await placeOnline();
    }
  });

  loadPublicConfig();
  render();
})();

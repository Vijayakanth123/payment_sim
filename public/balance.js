async function loadBalance() {
  const password  = document.getElementById("password").value;
  const statusEl  = document.getElementById("status");
  const section   = document.getElementById("balanceSection");
  const box       = document.getElementById("balanceBox");

  if (!password) {
    statusEl.className   = "status-text error";
    statusEl.textContent = "Please enter your password";
    return;
  }

  statusEl.className   = "status-text";
  statusEl.textContent = "Verifying…";
  section.style.display = "none";

  try {
    const res  = await fetch("/api/accounts/secure-balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // ── show the section ──────────────────────────────────────────────
    section.style.display = "block";
    box.innerHTML = "";

    if (!data.accounts || data.accounts.length === 0) {
      box.innerHTML = `
        <div class="state-box">
          <div class="icon">🏦</div>
          <p>No accounts found</p>
        </div>`;
    } else {
      data.accounts.forEach((acc, i) => {
        const div = document.createElement("div");
        div.className = "account-card";
        div.style.animationDelay = `${i * 80}ms`;
        div.innerHTML = `
          <div class="bank-name">${acc.bank_name}</div>
          <div class="acc-number">Account: ${acc.account_number}</div>
          <div class="balance">₹${parseFloat(acc.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        `;
        box.appendChild(div);
      });
    }

    statusEl.className   = "status-text found";
    statusEl.textContent = "✓ Verified";

  } catch (err) {
    section.style.display = "none";
    statusEl.className    = "status-text error";
    statusEl.textContent  = err.message;
  }
}
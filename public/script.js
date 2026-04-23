let receiver     = null;
let bankReceiver = null;

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = (type === "success" ? "✓  " : "✕  ") + msg;
  t.className = "toast show";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Settle mode detection ────────────────────────────────────────────────────
function checkSettleMode() {
  const params       = new URLSearchParams(window.location.search);
  if (!params.get("settle")) return;

  const settleUserId = params.get("settleUserId");
  const settleName   = params.get("settleName");
  const settleAmount = params.get("settleAmount");
  const groupId      = params.get("groupId");

  // store globals
  window._settleGroupId      = groupId;
  window._settleTargetUserId = settleUserId;
  window._settleName         = settleName;
  window._isSettleMode       = true;

  // banner
  const banner = document.getElementById("settleBanner");
  banner.style.display = "flex";
  document.getElementById("settleBannerTitle").textContent = `Settling with ${settleName}`;
  document.getElementById("settleBannerSub").textContent   =
    `₹${parseFloat(settleAmount).toLocaleString("en-IN")} · locked`;

  // header
  document.getElementById("pageTitle").textContent    = "Settle Up";
  document.getElementById("pageSubtitle").textContent = `Group payment to ${settleName}`;

  // lock amount
  const amountField = document.getElementById("amount");
  amountField.value    = settleAmount;
  amountField.readOnly = true;

  // disable & grey out tab buttons
  document.getElementById("userBtn").disabled = true;
  document.getElementById("bankBtn").disabled = true;

  // hide normal search row, show locked receiver
  document.getElementById("searchRow").style.display    = "none";
  document.getElementById("lockedReceiver").style.display = "flex";
  document.getElementById("lockedAvatar").textContent   = initials(settleName);
  document.getElementById("lockedName").textContent     = settleName;

  // auto-load receiver accounts using their username (your API accepts username/mobile)
  // We search by the name we already have; if the server exposes a user endpoint by id use that
  loadReceiverAccountsForSettle(settleUserId, settleName);
}

// Uses /api/users/:id if available, otherwise falls back to search-receiver by username
async function loadReceiverAccountsForSettle(userId, name) {
  const select = document.getElementById("accountSelect");
  select.innerHTML = "<option disabled selected>Loading accounts…</option>";

  // Strategy: try fetching by userId directly first
  try {
    const accRes  = await fetch(`/api/accounts/user/${userId}`, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const accData = await accRes.json();

    if (accRes.ok && accData.accounts?.length) {
      populateReceiverAccounts(accData.accounts);
      return;
    }
  } catch (_) { /* fall through */ }

  // Fallback: use existing search-receiver endpoint with username
  try {
    const res  = await fetch("/api/transactions/search-receiver", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ identifier: name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    receiver = data.receiver;
    populateReceiverAccounts(data.accounts);
  } catch (err) {
    select.innerHTML = "<option disabled>Could not load accounts</option>";
    showToast("Could not load receiver accounts: " + err.message, "error");
  }
}

function populateReceiverAccounts(accounts) {
  const select = document.getElementById("accountSelect");
  select.innerHTML = "";
  accounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc._id;
    opt.text  = `${acc.bank_name} - ${acc.account_number}`;
    select.appendChild(opt);
  });
}

// ─── Search receiver (normal mode) ───────────────────────────────────────────
async function searchReceiver() {
  const identifier = document.getElementById("identifier").value.trim();
  const statusEl   = document.getElementById("status");
  const boxEl      = document.getElementById("receiverBox");

  if (!identifier) { statusEl.textContent = "Enter a username or mobile number"; return; }

  statusEl.className   = "status-text";
  statusEl.textContent = "Searching…";
  boxEl.classList.remove("show");

  try {
    const res  = await fetch("/api/transactions/search-receiver", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ identifier })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    receiver = data.receiver;

    boxEl.innerHTML = `
      <div class="r-name">${receiver.username}</div>
      <div class="r-sub">${receiver.mobile_number}</div>
    `;
    boxEl.classList.add("show");

    populateReceiverAccounts(data.accounts);

    statusEl.className   = "status-text found";
    statusEl.textContent = "✓ User found";
  } catch (err) {
    receiver = null;
    boxEl.classList.remove("show");
    document.getElementById("accountSelect").innerHTML = "";
    statusEl.className   = "status-text error";
    statusEl.textContent = err.message;
  }
}

// ─── Search by bank account number ───────────────────────────────────────────
async function searchByAccount() {
  const accountNumber = document.getElementById("accountNumber").value.trim();
  const statusEl      = document.getElementById("bankStatus");
  const boxEl         = document.getElementById("bankReceiverBox");

  statusEl.className   = "status-text";
  statusEl.textContent = "Searching…";
  boxEl.classList.remove("show");

  try {
    const res  = await fetch("/api/transactions/search-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ account_number: accountNumber })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    bankReceiver = data.receiver;

    boxEl.innerHTML = `
      <div class="r-name">${bankReceiver.username}</div>
      <div class="r-sub">${bankReceiver.mobile_number}</div>
    `;
    boxEl.classList.add("show");

    const select = document.getElementById("bankAccountSelect");
    select.innerHTML = "";
    data.accounts.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc._id;
      opt.text  = `${acc.bank_name} - ${acc.account_number}`;
      select.appendChild(opt);
    });

    statusEl.className   = "status-text found";
    statusEl.textContent = "✓ Account found";
  } catch (err) {
    bankReceiver = null;
    boxEl.classList.remove("show");
    document.getElementById("bankAccountSelect").innerHTML = "";
    statusEl.className   = "status-text error";
    statusEl.textContent = err.message;
  }
}

// ─── Load my accounts ─────────────────────────────────────────────────────────
async function loadMyAccounts() {
  try {
    const res  = await fetch("/api/accounts/my-accounts", {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const data = await res.json();
    const select = document.getElementById("fromAccountSelect");
    select.innerHTML = "";
    data.accounts.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc._id;
      opt.text  = `${acc.bank_name} - ${acc.account_number} (₹${acc.balance})`;
      select.appendChild(opt);
    });
  } catch (err) {
    showToast("Failed to load your accounts", "error");
  }
}

// ─── Pay ──────────────────────────────────────────────────────────────────────
async function pay() {
  const fromAccountId = document.getElementById("fromAccountSelect").value;
  const amount        = document.getElementById("amount").value;
  const passcode      = document.getElementById("passcode").value;
  const toAccountId   =
    document.getElementById("accountSelect").value ||
    document.getElementById("bankAccountSelect").value;

  if (!toAccountId)   { showToast("Select a receiver account", "error"); return; }
  if (!amount || +amount <= 0) { showToast("Enter a valid amount", "error"); return; }
  if (!passcode)      { showToast("Enter your passcode", "error"); return; }

  const payBtn = document.getElementById("payBtn");
  payBtn.disabled     = true;
  payBtn.textContent  = "Processing…";

  try {
    const res  = await fetch("/api/transactions/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        passcode
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // ── settle mode: mark expenses as settled ──────────────────────────────
    if (window._isSettleMode) {
      try {
        await fetch(`/api/groups/${window._settleGroupId}/settle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ targetUserId: window._settleTargetUserId })
        });
      } catch (_) { /* payment succeeded, settle log is best-effort */ }

      showToast(`Settled ₹${Number(amount).toLocaleString("en-IN")} with ${window._settleName}!`);
      setTimeout(() => window.history.back(), 1800);
      return;
    }

    showToast("Payment successful!");
    document.getElementById("passcode").value = "";

  } catch (err) {
    showToast(err.message, "error");
  } finally {
    payBtn.disabled    = false;
    payBtn.textContent = "Pay Now";
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function showUserPay() {
  document.getElementById("userSection").style.display = "block";
  document.getElementById("bankSection").style.display = "none";
  document.getElementById("userBtn").classList.add("active");
  document.getElementById("bankBtn").classList.remove("active");
  clearBankUI();
}

function showBankPay() {
  document.getElementById("userSection").style.display = "none";
  document.getElementById("bankSection").style.display = "block";
  document.getElementById("bankBtn").classList.add("active");
  document.getElementById("userBtn").classList.remove("active");
  clearUserUI();
}

function clearUserUI() {
  if (window._isSettleMode) return; // don't wipe locked receiver
  document.getElementById("identifier").value     = "";
  document.getElementById("receiverBox").innerHTML = "";
  document.getElementById("receiverBox").classList.remove("show");
  document.getElementById("accountSelect").innerHTML = "";
  document.getElementById("status").textContent   = "";
}

function clearBankUI() {
  document.getElementById("accountNumber").value       = "";
  document.getElementById("bankReceiverBox").innerHTML = "";
  document.getElementById("bankReceiverBox").classList.remove("show");
  document.getElementById("bankAccountSelect").innerHTML = "";
  document.getElementById("bankStatus").textContent    = "";
}

// ─── Other existing functions (kept intact) ───────────────────────────────────
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

async function loadGroups() {
  try {
    const res  = await fetch("/api/groups/my-groups", {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const data = await res.json();
    const container = document.getElementById("groupsList");
    container.innerHTML = "";
    if (data.groups.length === 0) { container.innerHTML = "<p>No groups yet</p>"; return; }
    data.groups.forEach(group => {
      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${group.name}</h3>
        <p>Members: ${group.members.map(m => m.username).join(", ")}</p>
        <button onclick="openGroup('${group._id}')">Enter Group</button><hr>
      `;
      container.appendChild(div);
    });
  } catch (err) { console.error(err); }
}

function openGroup(groupId) {
  window.location.href = "group.html?id=" + groupId;
}

async function viewBalance() {
  try {
    const res  = await fetch("/api/accounts/my-accounts", {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const data = await res.json();
    const box  = document.getElementById("balanceBox");
    box.innerHTML = "";
    if (!data.accounts?.length) { box.innerHTML = "<p>No accounts found</p>"; return; }
    data.accounts.forEach(acc => {
      const div = document.createElement("div");
      div.innerHTML = `
        <p><b>${acc.bank_name}</b></p>
        <p>Account: ${acc.account_number}</p>
        <p>Balance: ₹${acc.balance}</p><hr>
      `;
      box.appendChild(div);
    });
  } catch (err) { showToast("Failed to fetch balance", "error"); }
}

function goBack() { window.location.href = "index.html"; }
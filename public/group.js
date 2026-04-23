// ─── State ────────────────────────────────────────────────────────────────────
let selectedUsers  = [];
let lastFoundUser  = null;
let pendingSettle  = null;   // { userId, name, amount } for the confirm modal

// ─── Init ─────────────────────────────────────────────────────────────────────
window.onload = function () {
  loadGroup();
  loadBalances();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGroupId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token"),
  };
}

// ─── Avatar colour from name ──────────────────────────────────────────────────
function avatarColor(name) {
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue},52%,48%)`;
}

function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.classList.remove("show"); }, 3200);
}

// ─── Load group info ──────────────────────────────────────────────────────────
async function loadGroup() {
  const groupId = getGroupId();
  try {
    const res  = await fetch(`/api/groups/${groupId}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const g = data.group;

    // header
    document.getElementById("headerGroupName").textContent = g.name;
    document.getElementById("headerMeta").textContent =
      `${g.members.length} member${g.members.length !== 1 ? "s" : ""}`;

    // detail card
    document.getElementById("groupDetails").innerHTML = `
      <h3>${g.name}</h3>
      <p>Members: ${g.members.map(m => m.username).join(", ")}</p>
    `;
  } catch (err) {
    document.getElementById("groupDetails").innerHTML =
      `<p style="color:#e03c2b">Failed to load group: ${err.message}</p>`;
  }
}

// ─── Load balances ────────────────────────────────────────────────────────────
async function loadBalances() {
  const groupId = getGroupId();
  const list    = document.getElementById("balanceList");

  try {
    const res  = await fetch(`/api/groups/${groupId}/balances`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderBalances(data.balances);
  } catch (err) {
    list.innerHTML = `
      <div class="state-box">
        <div class="icon">⚠️</div>
        <p>${err.message}</p>
      </div>`;
  }
}

// ─── Render balance cards ─────────────────────────────────────────────────────
function renderBalances(balances) {
  const list = document.getElementById("balanceList");

  if (!balances || balances.length === 0) {
    list.innerHTML = `
      <div class="state-box">
        <div class="icon">🎉</div>
        <p>All settled up! No pending balances.</p>
      </div>`;
    updateSummary([]);
    return;
  }

  updateSummary(balances);

  list.innerHTML = "";
  balances.forEach((entry, i) => {
    const iOwe  = entry.direction === "i_owe";
    const abs   = Math.abs(entry.amount);
    const card  = document.createElement("div");
    card.className = `balance-card ${iOwe ? "i-owe" : "owes-me"}`;
    card.style.animationDelay = `${i * 60}ms`;
    card.dataset.userId = entry.userId;

    card.innerHTML = `
      <div class="avatar" style="background:${avatarColor(entry.name)}">
        ${initials(entry.name)}
      </div>
      <div class="card-info">
        <div class="name">${entry.name}</div>
        <span class="direction-tag">${iOwe ? "You owe" : "Owes you"}</span>
      </div>
      <div class="card-right">
        <div class="card-amount">₹${abs.toLocaleString("en-IN")}</div>
        ${iOwe
          ? `<button class="btn-settle" onclick="openModal('${entry.userId}','${entry.name}',${abs})">
               Settle
             </button>`
          : ""}
      </div>
    `;
    list.appendChild(card);
  });
}

// ─── Summary strip ────────────────────────────────────────────────────────────
function updateSummary(balances) {
  const totalOwe  = balances.filter(b => b.direction === "i_owe")
                            .reduce((s, b) => s + Math.abs(b.amount), 0);
  const totalOwed = balances.filter(b => b.direction === "owed_to_me")
                            .reduce((s, b) => s + b.amount, 0);

  document.getElementById("totalOwe").textContent =
    "₹" + totalOwe.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  document.getElementById("totalOwed").textContent =
    "₹" + totalOwed.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(userId, name, amount) {
  const groupId = getGroupId();
  window.location.href = `pay.html?settleUserId=${userId}&settleName=${encodeURIComponent(name)}&settleAmount=${amount}&groupId=${groupId}&settle=true`;
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  pendingSettle = null;
}

// close on backdrop click
document.getElementById("modalOverlay").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

// ─── Confirm settle ───────────────────────────────────────────────────────────
async function confirmSettle() {
  if (!pendingSettle) return;

  const { userId, name, amount } = pendingSettle;
  const groupId  = getGroupId();
  const confirmBtn = document.getElementById("modalConfirmBtn");

  confirmBtn.disabled    = true;
  confirmBtn.textContent = "Processing…";

  // also disable the card's Settle button
  const card = document.querySelector(`.balance-card[data-user-id="${userId}"] .btn-settle`);
  if (card) card.disabled = true;

  try {
    const res  = await fetch(`/api/groups/${groupId}/settle`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ targetUserId: userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeModal();
    showToast(`Settled ₹${amount.toLocaleString("en-IN")} with ${name}!`);

    // reload balances to reflect new state
    await loadBalances();
  } catch (err) {
    closeModal();
    showToast(err.message, "error");
    if (card) card.disabled = false;
  } finally {
    confirmBtn.disabled    = false;
    confirmBtn.textContent = "Yes, Settle";
  }
}

// ─── Search user ──────────────────────────────────────────────────────────────
async function searchUser() {
  const identifier = document.getElementById("searchUser").value;
  const status = document.getElementById("searchStatus");
  status.innerText = "Searching...";
  try {
    const res = await fetch("/api/users/search", {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ identifier }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    lastFoundUser = data.user;
    document.getElementById("searchResult").innerHTML = `
      <p>${data.user.username} (${data.user.mobile_number})</p>
      <button onclick="addParticipant()">Add</button>
    `;
    status.innerText = "User found";
  } catch (err) {
    lastFoundUser = null;
    document.getElementById("searchResult").innerHTML = "";
    status.innerText = err.message;
  }
}

function addParticipant() {
  if (!lastFoundUser) return;
  if (selectedUsers.find(u => u._id === lastFoundUser._id)) {
    alert("Already added");
    return;
  }
  selectedUsers.push(lastFoundUser);
  renderParticipants();
}

function renderParticipants() {
  const list = document.getElementById("participantList");
  list.innerHTML = "";
  selectedUsers.forEach(user => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${user.username}
      <button onclick="removeParticipant('${user._id}')">Remove</button>
    `;
    list.appendChild(li);
  });
}

function removeParticipant(id) {
  selectedUsers = selectedUsers.filter(u => u._id !== id);
  renderParticipants();
}

async function createGroup() {
  const name = document.getElementById("groupName").value;
  if (!name) { alert("Enter group name"); return; }
  if (selectedUsers.length === 0) { alert("Add at least one participant"); return; }
  try {
    const res = await fetch("/api/groups/create", {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ name, participants: selectedUsers.map(u => u._id) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert("Group created");
    selectedUsers = [];
    renderParticipants();
    document.getElementById("groupName").value = "";
  } catch (err) {
    alert(err.message);
  }
}

function goToSplit() {
  const groupId = getGroupId();
  window.location.href = `split.html?groupId=${groupId}`;
}
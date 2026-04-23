let members = [];

function getGroupId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("groupId");
}

// load group members
async function loadMembers() {
  const groupId = getGroupId();

  const res = await fetch(`/api/groups/${groupId}`, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });

  const data = await res.json();

  members = data.group.members;

  const box = document.getElementById("membersBox");
  box.innerHTML = "";

  members.forEach(m => {
    const div = document.createElement("div");

    div.innerHTML = `
      <label>${m.username}</label>
      <input type="number" id="share-${m._id}" placeholder="0" />
    `;

    box.appendChild(div);
  });
}

async function submitExpense() {
  const groupId = getGroupId();
  const description = document.getElementById("desc").value;
  const totalAmount = Number(document.getElementById("amount").value);

  const splits = members.map(m => ({
    userId: m._id,
    share: Number(document.getElementById(`share-${m._id}`).value) || 0
  }));

  try {
    const res = await fetch("/api/expenses/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({
        groupId,
        description,
        totalAmount,
        splits
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    alert("Expense added");
    window.location.href = `group.html?id=${groupId}`;

  } catch (err) {
    document.getElementById("status").innerText = err.message;
  }
}
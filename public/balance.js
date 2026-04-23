async function loadBalance() {
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  status.innerText = "Verifying...";

  try {
    const res = await fetch("/api/accounts/secure-balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const box = document.getElementById("balanceBox");
    box.innerHTML = "";

    data.accounts.forEach(acc => {
      const div = document.createElement("div");

      div.innerHTML = `
        <p><b>${acc.bank_name}</b></p>
        <p>Account: ${acc.account_number}</p>
        <p>Balance: ₹${acc.balance}</p>
        <hr>
      `;

      box.appendChild(div);
    });

    status.innerText = "Success";

  } catch (err) {
    status.innerText = err.message;
  }
}
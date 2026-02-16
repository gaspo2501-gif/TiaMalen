let view = "inicio";

let sales = JSON.parse(localStorage.getItem("tm_sales") || "[]");
let clients = JSON.parse(localStorage.getItem("tm_clients") || "[]");
let expenses = JSON.parse(localStorage.getItem("tm_expenses") || "[]");

function saveAll() {
  localStorage.setItem("tm_sales", JSON.stringify(sales));
  localStorage.setItem("tm_clients", JSON.stringify(clients));
  localStorage.setItem("tm_expenses", JSON.stringify(expenses));
}

function setView(v) {
  view = v;
  render();
}

function addSale(category, amount, method, clientId=null) {
  const sale = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    category,
    amount,
    method,
    clientId
  };

  sales.unshift(sale);

  if (method === "Fiado" && clientId) {
    clients = clients.map(c =>
      c.id === clientId ? {...c, balance: c.balance + amount} : c
    );
  }

  saveAll();
  render();
}

function addClient(name) {
  clients.push({
    id: Date.now().toString(),
    name,
    balance: 0
  });
  saveAll();
  render();
}

function addPayment(clientId, amount) {
  clients = clients.map(c =>
    c.id === clientId ? {...c, balance: c.balance - amount} : c
  );
  saveAll();
  render();
}

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Reporte Despensa Tía Malen", 20, 20);

  doc.autoTable({
    startY: 30,
    head: [["Categoría", "Monto"]],
    body: sales.map(s => [s.category, "$" + s.amount])
  });

  doc.save("reporte.pdf");
}

function render() {
  const app = document.getElementById("app");

  if (view === "inicio") {
    const caja = sales.filter(s => s.method !== "Fiado")
      .reduce((sum,s)=>sum+s.amount,0);

    const fiado = clients.reduce((sum,c)=>sum+c.balance,0);

    app.innerHTML = `
      <div class="card">
        <h2>Caja Real</h2>
        <p>$${caja.toLocaleString()}</p>
      </div>

      <div class="card">
        <h2>Fiado Pendiente</h2>
        <p>$${fiado.toLocaleString()}</p>
      </div>
    `;
  }

  if (view === "ventas") {
    app.innerHTML = `
      <div class="card">
        <h2>Nueva Venta</h2>

        <input id="monto" type="number" placeholder="Monto"/><br><br>

        <select id="metodo">
          <option>Efectivo</option>
          <option>MercadoPago</option>
          <option>Fiado</option>
        </select><br><br>

        <button onclick="handleVenta()">Registrar</button>
      </div>
    `;
  }

  if (view === "clientes") {
    app.innerHTML = `
      <div class="card">
        <h2>Clientes</h2>
        <input id="clienteNombre" placeholder="Nuevo cliente"/>
        <button onclick="handleCliente()">Agregar</button>

        <ul>
          ${clients.map(c => `
            <li>
              ${c.name} - $${c.balance}
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  if (view === "reportes") {
    app.innerHTML = `
      <div class="card">
        <h2>Reportes</h2>
        <button onclick="generatePDF()">Exportar PDF</button>
      </div>
    `;
  }
}

function handleVenta() {
  const amount = Number(document.getElementById("monto").value);
  const method = document.getElementById("metodo").value;

  addSale("General", amount, method);
}

function handleCliente() {
  const name = document.getElementById("clienteNombre").value;
  addClient(name);
}

render();

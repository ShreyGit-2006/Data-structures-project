// ---------------- Views (unchanged core structure, with small tweaks to use new helpers) ----------------
const Views = {
  dashboard() {
    return `
      <section class="grid md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xl font-semibold">Books</h2>
            <span class="text-sm text-gray-500">Favorites threshold: ${favoritesThreshold}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-200">
                <tr>
                  <th class="p-2">Book ID</th>
                  <th class="p-2">Title</th>
                  <th class="p-2">Author</th>
                  <th class="p-2">Total</th>
                  <th class="p-2">Available</th>
                  <th class="p-2">Active Loans</th>
                  <th class="p-2">Reserved</th>
                </tr>
              </thead>
              <tbody>
                ${filterBooks(books).map(b => `
                  <tr class="border-b">
                    <td class="p-2">${b.bookId}</td>
                    <td class="p-2 flex items-center gap-2">
                      ${isFavoriteBook(b) ? '<i data-lucide="heart" class="w-4 h-4 text-rose-600"></i>' : ''}
                      ${b.title}
                    </td>
                    <td class="p-2">${b.author}</td>
                    <td class="p-2">${b.totalCopies}</td>
                    <td class="p-2">${b.availableCopies}</td>
                    <td class="p-2">${activeLoansCountByBook(b.bookId)}</td>
                    <td class="p-2">${(reservations[b.bookId]||[]).length}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>

          <h3 class="mt-6 text-lg font-semibold">Active Loans</h3>
          <div class="overflow-x-auto">
            <table class="w-full mt-2 text-left">
              <thead class="bg-gray-200">
                <tr>
                  <th class="p-2">Loan ID</th>
                  <th class="p-2">Book ID</th>
                  <th class="p-2">Member ID</th>
                  <th class="p-2">Checkout</th>
                  <th class="p-2">Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${loans.map(L => `
                  <tr class="border-b">
                    <td class="p-2">${L.loanId}</td>
                    <td class="p-2">${L.bookId}</td>
                    <td class="p-2">${L.memberId}</td>
                    <td class="p-2">${L.checkoutDate}</td>
                    <td class="p-2">${L.dueDate}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-xl shadow p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-xl font-semibold">Reservations</h2>
              <div class="flex items-center gap-2">
                <button id="floatingViewHistory" class="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded">
                  <i data-lucide="clock" class="w-4 h-4"></i> Loan History
                </button>
                <button id="floatingUndo" class="inline-flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 rounded">
                  <i data-lucide="corner-up-left" class="w-4 h-4"></i> Undo
                </button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead class="bg-gray-200">
                  <tr>
                    <th class="p-2">Book ID</th>
                    <th class="p-2">Queue</th>
                  </tr>
                </thead>
                <tbody>
                  ${filterBooks(books).map(b => {
                    const q = reservations[b.bookId] || [];
                    return `
                      <tr class="border-b">
                        <td class="p-2">${b.bookId}</td>
                        <td class="p-2">${q.join(', ')}</td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow p-5">
            <h2 class="text-xl font-semibold mb-3">Teacher Recommendations</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead class="bg-gray-200">
                  <tr>
                    <th class="p-2">Teacher</th>
                    <th class="p-2">Book IDs</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.keys(recs).sort().map(t => `
                    <tr class="border-b">
                      <td class="p-2">${t}</td>
                      <td class="p-2">${recs[t].join(', ')}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  addBook() {
    return `
      <section class="max-w-xl bg-white rounded-xl shadow p-5">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i data-lucide="book-open"></i> Add Book</h2>
        <form id="bookForm" class="space-y-2">
          <input type="number" id="bookId" placeholder="Book ID" class="w-full border rounded p-2" required>
          <input type="text" id="bookTitle" placeholder="Title" class="w-full border rounded p-2" required>
          <input type="text" id="bookAuthor" placeholder="Author" class="w-full border rounded p-2" required>
          <input type="number" id="bookCopies" placeholder="Total Copies" class="w-full border rounded p-2" required>
          <button class="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700">Add Book</button>
        </form>
      </section>
    `;
  },

  addMember() {
    return `
      <section class="max-w-xl bg-white rounded-xl shadow p-5">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i data-lucide="user-plus"></i> Add Member</h2>
        <form id="memberForm" class="space-y-2">
          <input type="number" id="memberId" placeholder="Member ID" class="w-full border rounded p-2" required>
          <input type="text" id="memberName" placeholder="Name" class="w-full border rounded p-2" required>
          <input type="number" id="maxLoans" placeholder="Max Loan Limit (default 5)" class="w-full border rounded p-2">
          <button class="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700">Add Member</button>
        </form>
      </section>
    `;
  },

  checkoutReturn() {
    return `
      <section class="max-w-xl bg-white rounded-xl shadow p-5">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i data-lucide="clipboard-list"></i> Checkout / Return Book</h2>
        <form id="checkoutForm" class="space-y-2">
          <input type="number" id="checkoutBookId" placeholder="Book ID" class="w-full border rounded p-2" required>
          <input type="number" id="checkoutMemberId" placeholder="Member ID" class="w-full border rounded p-2" required>
          <input type="number" id="checkoutQty" placeholder="Quantity (default 1)" min="1" class="w-full border rounded p-2">
          <div class="flex gap-2">
            <button id="checkoutBtn" type="button" class="bg-indigo-600 text-white flex-1 py-2 rounded hover:bg-indigo-700">Checkout</button>
            <button id="returnBtn" type="button" class="bg-red-600 text-white flex-1 py-2 rounded hover:bg-red-700">Return</button>
          </div>
        </form>
        <p class="text-sm text-gray-500 mt-3">Quantity applies to both checkout and return; constrained by availability and member loan limit.</p>
      </section>
    `;
  },

  reservations() {
    return `
      <section class="bg-white rounded-xl shadow p-5">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i data-lucide="list-ordered"></i> Reservations</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-gray-200">
              <tr>
                <th class="p-2">Book ID</th>
                <th class="p-2">Queue (Member IDs)</th>
              </tr>
            </thead>
            <tbody>
              ${filterBooks(books).map(b => {
                const q = reservations[b.bookId] || [];
                return `
                  <tr class="border-b">
                    <td class="p-2">${b.bookId}</td>
                    <td class="p-2">${q.join(', ')}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  },

  recommendations() {
    return `
      <section class="space-y-6">
        <div class="max-w-xl bg-white rounded-xl shadow p-5">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i data-lucide="star"></i> Teacher Recommendation</h2>
          <form id="recommendForm" class="space-y-2">
            <input type="text" id="teacherName" placeholder="Teacher Name" class="w-full border rounded p-2" required>
            <input type="number" id="recommendBookId" placeholder="Book ID" class="w-full border rounded p-2" required>
            <button class="bg-yellow-500 text-white w-full py-2 rounded hover:bg-yellow-600">Add Recommendation</button>
          </form>
        </div>

        <div class="bg-white rounded-xl shadow p-5">
          <h3 class="text-lg font-semibold mb-3">All Recommendations</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-gray-200">
                <tr>
                  <th class="p-2">Teacher</th>
                  <th class="p-2">Book IDs</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(recs).sort().map(t => `
                  <tr class="border-b">
                    <td class="p-2">${t}</td>
                    <td class="p-2">${recs[t].join(', ')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  },

  members() {
    return `
      <section class="bg-white rounded-xl shadow p-5">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i data-lucide="users"></i> All Members</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-200">
              <tr>
                <th class="p-2">Member ID</th>
                <th class="p-2">Name</th>
                <th class="p-2">Max Loans</th>
                <th class="p-2">Current Loans</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(m => `
                <tr class="border-b">
                  <td class="p-2">${m.memberId}</td>
                  <td class="p-2">${m.name}</td>
                  <td class="p-2">${m.maxLoans || 5}</td>
                  <td class="p-2">${loans.filter(L => L.memberId === m.memberId).length}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  },

  favorites() {
    const favs = filterBooks(books).filter(isFavoriteBook);
    return `
      <section class="space-y-6">
        <div class="bg-white rounded-xl shadow p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
              <i data-lucide="heart"></i> Favorites
            </h2>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">Threshold</label>
              <input id="favThreshold" type="number" min="1" class="w-20 border rounded px-2 py-1"
                value="${favoritesThreshold}">
            </div>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            Books are favorites when active loans ≥ threshold. Current threshold: ${favoritesThreshold}.
          </p>
        </div>

        <div class="bg-white rounded-xl shadow p-5 overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-200">
              <tr>
                <th class="p-2">Book ID</th>
                <th class="p-2">Title</th>
                <th class="p-2">Author</th>
                <th class="p-2">Active Loans</th>
              </tr>
            </thead>
            <tbody>
              ${favs.map(b => `
                <tr class="border-b">
                  <td class="p-2">${b.bookId}</td>
                  <td class="p-2 flex items-center gap-2">
                    <i data-lucide="heart" class="w-4 h-4 text-rose-600"></i>${b.title}
                  </td>
                  <td class="p-2">${b.author}</td>
                  <td class="p-2">${activeLoansCountByBook(b.bookId)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${favs.length === 0 ? '<div class="text-sm text-gray-500 mt-3">No favorites yet.</div>' : ''}
        </div>
      </section>
    `;
  },

  notFound() {
    return `<div class="text-center text-gray-600">Page not found</div>`;
  }
};

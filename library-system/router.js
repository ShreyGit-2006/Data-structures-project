// ---------------- Router (mostly same) ----------------
const routeTitle = document.getElementById('routeTitle');
const app = document.getElementById('app');
const routes = {
  '/': { view: 'dashboard', title: 'Dashboard' },
  '/dashboard': { view: 'dashboard', title: 'Dashboard' },
  '/add-book': { view: 'addBook', title: 'Add Book' },
  '/add-member': { view: 'addMember', title: 'Add Member' },
  '/checkout-return': { view: 'checkoutReturn', title: 'Checkout / Return' },
  '/reservations': { view: 'reservations', title: 'Reservations' },
  '/recommendations': { view: 'recommendations', title: 'Recommendations' },
  '/members': { view: 'members', title: 'Members' },
  '/favorites': { view: 'favorites', title: 'Favorites' },
};

const router = {
  parse() {
    const hash = window.location.hash || '#/dashboard';
    const path = hash.replace('#', '');
    return path || '/dashboard';
  },
  mountEventsForView(viewName){
    if(viewName === 'addBook'){
      document.getElementById('bookForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id = Number(document.getElementById('bookId').value);
        if(findBook(id)){ alert('Book ID already exists'); return; }
        const book = {
          bookId: id,
          title: document.getElementById('bookTitle').value,
          author: document.getElementById('bookAuthor').value,
          totalCopies: Number(document.getElementById('bookCopies').value),
          availableCopies: Number(document.getElementById('bookCopies').value)
        };
        try {
          await apiRequest('/api/books', { method: 'POST', body: JSON.stringify(book), headers: { 'Content-Type': 'application/json' } });
          await loadData();
          router.render();
          window.location.hash = '#/dashboard';
        } catch (err) {
          alert('Failed to add book');
        }
      });
    }
    if(viewName === 'addMember'){
      document.getElementById('memberForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id = Number(document.getElementById('memberId').value);
        if(findMember(id)){ alert('Member ID already exists'); return; }
        const member = {
          memberId: id,
          name: document.getElementById('memberName').value,
          maxLoans: Number(document.getElementById('maxLoans').value) || 5
        };
        try {
          await apiRequest('/api/members', { method: 'POST', body: JSON.stringify(member), headers: { 'Content-Type': 'application/json' } });
          await loadData();
          router.render();
          window.location.hash = '#/members';
        } catch (err) {
          alert('Failed to add member');
        }
      });
    }
    if(viewName === 'checkoutReturn'){
      document.getElementById('checkoutBtn')?.addEventListener('click', async ()=>{
        const bid = Number(document.getElementById('checkoutBookId').value);
        const mid = Number(document.getElementById('checkoutMemberId').value);
        const qty = Number(document.getElementById('checkoutQty').value) || 1;
        if(!bid || !mid) return alert('Enter both Book ID and Member ID');
        try {
          await apiRequest('/api/loans/checkout', { method: 'POST', body: JSON.stringify({ bookId: bid, memberId: mid, qty }), headers: { 'Content-Type': 'application/json' } });
          await loadData();
          router.render();
          document.getElementById('checkoutForm').reset();
        } catch (err) {
          alert('Checkout failed');
        }
      });
      document.getElementById('returnBtn')?.addEventListener('click', async ()=>{
        const bid = Number(document.getElementById('checkoutBookId').value);
        const mid = Number(document.getElementById('checkoutMemberId').value);
        const qty = Number(document.getElementById('checkoutQty').value) || 1;
        if(!bid || !mid) return alert('Enter both Book ID and Member ID');
        try {
          await apiRequest('/api/loans/return', { method: 'POST', body: JSON.stringify({ bookId: bid, memberId: mid, qty }), headers: { 'Content-Type': 'application/json' } });
          await loadData();
          router.render();
          document.getElementById('checkoutForm').reset();
        } catch (err) {
          alert('Return failed');
        }
      });
    }
    if(viewName === 'recommendations'){
      document.getElementById('recommendForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const teacher = document.getElementById('teacherName').value.trim().toUpperCase();
        const bid = Number(document.getElementById('recommendBookId').value);
        if(!findBook(bid)){
          if(!confirm('Book not found. Add placeholder book with this ID?')) return;
        try {
          await apiRequest('/api/books', { method: 'POST', body: JSON.stringify({ bookId: bid, title: 'Unknown', author: 'Unknown', totalCopies: 1, availableCopies: 1 }), headers: { 'Content-Type': 'application/json' } });
          } catch (err) {
            alert('Failed to add placeholder book');
            return;
          }
        }
        try {
          await apiRequest('/api/recommendations', { method: 'POST', body: JSON.stringify({ teacher, bookId: bid }), headers: { 'Content-Type': 'application/json' } });
          await loadData();
          router.render();
        } catch (err) {
          alert('Failed to add recommendation');
        }
      });
    }
    if(viewName === 'favorites'){
      document.getElementById('favThreshold')?.addEventListener('change', async (e)=>{
        const v = Math.max(1, parseInt(e.target.value || '10', 10));
        favoritesThreshold = v;
        try {
          await apiRequest('/api/settings/favoritesThreshold', { method: 'PUT', body: JSON.stringify({ threshold: v }), headers: { 'Content-Type': 'application/json' } });
          router.render();
        } catch (err) {
          alert('Failed to update threshold');
        }
      });
    }

    // Floating small-screen buttons (bind each time view mounts)
    const floatingUndo = document.getElementById('floatingUndo');
    if(floatingUndo){
      floatingUndo.addEventListener('click', ()=>undoLastAction());
    }
    const floatingViewHistory = document.getElementById('floatingViewHistory');
    if(floatingViewHistory){
      floatingViewHistory.addEventListener('click', showLoanHistoryModal);
    }
  },
  highlightNav(path){
    document.querySelectorAll('.nav-link').forEach(a => {
      const active = a.getAttribute('href') === '#'+path;
      a.classList.toggle('bg-blue-100', active);
      a.classList.toggle('text-blue-700', active);
    });
  },
  render(){
    const path = this.parse();
    const viewName = (routes[path]?.view) || 'notFound';
    const title = (routes[path]?.title) || 'Not Found';
    document.getElementById('routeTitle').textContent = title;
    const html = (Views[viewName] || Views.notFound)();
    app.innerHTML = html;
    lucide.createIcons();
    this.highlightNav(path);
    this.mountEventsForView(viewName);

    // show/hide header controls depending on view
    const undoBtn = document.getElementById('undoBtn');
    const viewLoanBtn = document.getElementById('viewLoanHistoryBtn');
    if(path === '/dashboard' || path === '/'){
      undoBtn?.classList.remove('hidden');
      viewLoanBtn?.classList.remove('hidden');
    } else {
      undoBtn?.classList.add('hidden');
      viewLoanBtn?.classList.add('hidden');
    }
  },
  init(){
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
};

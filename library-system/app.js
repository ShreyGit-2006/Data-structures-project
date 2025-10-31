// Icons
lucide.createIcons();

// Helper function for API requests with auth
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    throw new Error('No auth token');
  }
  const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response;
}

// Sidebar collapse
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleSidebar');
const openBtn = document.getElementById('openSidebar');
let collapsed = false;
function applySidebarState() {
  if (collapsed) {
    sidebar.classList.add('w-16');
    sidebar.classList.remove('w-64');
    document.querySelectorAll('#sidebar .link-text').forEach(el => el.classList.add('hidden'));
    toggleBtn.title = 'Expand';
  } else {
    sidebar.classList.remove('w-16');
    sidebar.classList.add('w-64');
    document.querySelectorAll('#sidebar .link-text').forEach(el => el.classList.remove('hidden'));
    toggleBtn.title = 'Collapse';
  }
}
toggleBtn.addEventListener('click', () => { collapsed = !collapsed; applySidebarState(); });
openBtn.addEventListener('click', () => { collapsed = false; applySidebarState(); });
applySidebarState();

// Global search input binding
const searchInput = document.getElementById('globalSearch');
if (searchInput){
  searchInput.addEventListener('input', (e)=>{
    searchQuery = e.target.value.trim().toLowerCase();
    router.render();
  });
}

// Sidebar static actions
document.getElementById('exportData').addEventListener('click', ()=>{
  const payload = { books, members, loans, reservations, recs, loanCounter, favoritesThreshold };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'library_export.json'; a.click(); URL.revokeObjectURL(url);
});
document.getElementById('clearData').addEventListener('click', ()=>{
  if(!confirm('Clear ALL stored data?')) return;
  localStorage.clear();
  books = []; members = []; loans = []; reservations = {}; recs = {}; loanCounter = 1000; favoritesThreshold = 10; searchQuery = '';
  // reset history & actions
  while(!actionHistory.isEmpty()) actionHistory.pop();
  // reset linked list
  loanHistory.head = null; loanHistory.size = 0;
  router.render();
  alert('Cleared');
});

// Logout button (redirects to login page)
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  if(!confirm('Logout and return to login page?')) return;
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// Socket.io connection (for real-time updates)
const socket = io();

// Load initial data from API
async function loadData() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    const [booksRes, membersRes, loansRes, reservationsRes, recsRes] = await Promise.all([
      fetch('/api/books', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/members', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/loans', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/reservations', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/recommendations', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (booksRes.ok) books = await booksRes.json();
    if (membersRes.ok) members = await membersRes.json();
    if (loansRes.ok) loans = await loansRes.json();
    if (reservationsRes.ok) reservations = Object.fromEntries(await reservationsRes.json());
    if (recsRes.ok) recs = Object.fromEntries(await recsRes.json());

    persistAll();
    router.render();
  } catch (error) {
    console.error('Error loading data:', error);
    // Redirect to login if API fails
    window.location.href = 'login.html';
  }
}

// Socket listeners for real-time updates
socket.on('bookAdded', (data) => {
  books.push(data);
  persistAll();
  router.render();
});

socket.on('memberAdded', (data) => {
  members.push(data);
  persistAll();
  router.render();
});

socket.on('dataUpdated', () => {
  loadData();
});

// Start the app
loadData();
router.init();

// Expose utility (for console debugging)
window._lib = { books, members, loans, reservations, recs, loanHistory, actionHistory };

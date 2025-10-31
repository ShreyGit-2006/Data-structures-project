// ---------- Data stores (original) ----------
let books = JSON.parse(localStorage.getItem('books') || '[]');
let members = JSON.parse(localStorage.getItem('members') || '[]');
let loans = JSON.parse(localStorage.getItem('loans') || '[]');
let reservations = JSON.parse(localStorage.getItem('reservations') || '{}');
let recs = JSON.parse(localStorage.getItem('recs') || '{}');
let loanCounter = parseInt(localStorage.getItem('loanCounter') || '1000', 10);

// Favorites/search state
let favoritesThreshold = parseInt(localStorage.getItem('favoritesThreshold') || '10', 10);
let searchQuery = '';

const todayStr = () => new Date().toISOString().slice(0,10);
const addDaysStr = (days) => { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };

function persistAll(){
  localStorage.setItem('books', JSON.stringify(books));
  localStorage.setItem('members', JSON.stringify(members));
  localStorage.setItem('loans', JSON.stringify(loans));
  localStorage.setItem('reservations', JSON.stringify(reservations));
  localStorage.setItem('recs', JSON.stringify(recs));
  localStorage.setItem('loanCounter', String(loanCounter));
  localStorage.setItem('favoritesThreshold', String(favoritesThreshold));
}

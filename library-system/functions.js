// Helpers
function findBook(bookId){ return books.find(b => b.bookId === Number(bookId)); }
function findMember(memberId){ return members.find(m => m.memberId === Number(memberId)); }
function loansByBookId(bookId){ return loans.filter(L => L.bookId === Number(bookId)); }
function activeLoansCountByBook(bookId){ return loansByBookId(bookId).length; }
function isFavoriteBook(book){ return activeLoansCountByBook(book.bookId) >= favoritesThreshold; }

function filterBooks(arr){
  if(!searchQuery) return arr;
  return arr.filter(b=>{
    const s = `${b.bookId} ${b.title} ${b.author}`.toLowerCase();
    return s.includes(searchQuery);
  });
}

async function recordAction(type, data){
  // For backend, we can send to server or just keep local for undo
  actionHistory.push({ type, data, ts: new Date().toISOString() });
  if(actionHistory.size() > 100) actionHistory.items.shift();
  document.getElementById('undoBtn')?.classList.remove('hidden');
}

// ---------------- Modified Checkout / Return with records ----------------

// Quantity-aware checkout/return (modified to record actions & loanHistory)
function checkoutBookQty(bookId, memberId, qty){
  const b = findBook(bookId); const m = findMember(memberId);
  if(!b) { alert('Book not found'); return false; }
  if(!m) { alert('Member not found'); return false; }

  const currentLoans = loans.filter(L => L.memberId === Number(memberId)).length;
  const capacity = (m.maxLoans || 5) - currentLoans;
  if(capacity <= 0){ alert('Member reached max loans'); return false; }

  const want = Math.max(1, qty|0);
  const canFromAvailability = Math.max(0, b.availableCopies);
  const toIssue = Math.min(want, capacity, canFromAvailability);

  const createdLoanIds = [];
  if(toIssue > 0){
    const cd = todayStr();
    const due = addDaysStr(14);
    for(let i=0;i<toIssue;i++){
      const loanId = loanCounter++;
      const loanObj = { loanId, bookId: b.bookId, memberId: m.memberId, checkoutDate: cd, dueDate: due };
      loans.push(loanObj);
      // add to loan history as LOAN action
      loanHistory.add({ loanId, bookId: b.bookId, memberId: m.memberId, action: 'LOAN', date: cd });
      createdLoanIds.push(loanId);
    }
    b.availableCopies -= toIssue;
  }

  const notIssued = want - toIssue;
  if(notIssued > 0){
    if(!reservations[b.bookId]) reservations[b.bookId] = [];
    if(!reservations[b.bookId].includes(m.memberId)){
      reservations[b.bookId].push(m.memberId);
    }
    alert(`Issued ${toIssue}. Added to reservation queue for remaining ${notIssued}.`);
  } else {
    alert(`Issued ${toIssue}.`);
  }

  // record action for undo
  if(createdLoanIds.length > 0){
    recordAction('checkout', { bookId: b.bookId, memberId: m.memberId, loanIds: createdLoanIds, qty: createdLoanIds.length });
  } else {
    // if nothing created, don't push checkout action
  }

  persistAll(); router.render(); return true;
}

function returnBookQty(bookId, memberId, qty){
  const b = findBook(bookId); const m = findMember(memberId);
  if(!b || !m) { alert('Book or Member not found'); return false; }

  const matches = loans.filter(L => L.bookId === Number(bookId) && L.memberId === Number(memberId));
  if(matches.length === 0){ alert('No matching loans for this member and book'); return false; }

  const want = Math.max(1, qty|0);
  const toReturn = Math.min(want, matches.length);
  const returnedLoanIds = [];
  let reassigned = 0;
  for(let i=0;i<toReturn;i++){
    const idx = loans.findIndex(L => L.bookId === Number(bookId) && L.memberId === Number(memberId));
    if(idx !== -1){
      const removed = loans.splice(idx,1)[0];
      returnedLoanIds.push(removed.loanId || null);
    }

    const q = reservations[b.bookId] || [];
    if(q.length > 0){
      const nextMid = q.shift();
      const cd = todayStr();
      const due = addDaysStr(14);
      const loanId = loanCounter++;
      loans.push({ loanId, bookId: b.bookId, memberId: Number(nextMid), checkoutDate: cd, dueDate: due });
      // record reassigned loan in history
      loanHistory.add({ loanId, bookId: b.bookId, memberId: Number(nextMid), action: 'LOAN (from reservation)', date: cd });
      reassigned++;
    } else {
      b.availableCopies += 1;
    }
  }

  // record action for undo (return)
  recordAction('return', { bookId: b.bookId, memberId: m.memberId, loanIds: returnedLoanIds, qty: returnedLoanIds.length, reassigned });

  persistAll(); router.render();
  if(reassigned > 0){
    alert(`Returned ${toReturn}. Auto-assigned ${reassigned} to next reservations.`);
  } else {
    alert(`Returned ${toReturn}. Available copies: ${b.availableCopies}.`);
  }
  return true;
}

// ---------------- Add/Member/Recs should record actions ----------------
function addBookDirect(book){
  books.push(book);
  persistAll();
  recordAction('addBook', { bookId: book.bookId });
  router.render();
  alert('Book added');
}
function addMemberDirect(member){
  members.push(member);
  persistAll();
  recordAction('addMember', { memberId: member.memberId });
  router.render();
  alert('Member added');
}
function addRecommendationDirect(teacher, bid){
  if(!recs[teacher]) recs[teacher]=[];
  if(!recs[teacher].includes(bid)) recs[teacher].push(bid);
  persistAll();
  recordAction('recommend', { teacher, bookId: bid });
  router.render();
  alert('Recommendation recorded');
}

// ---------------- Undo Implementation ----------------
function undoLastAction(){
  if(actionHistory.isEmpty()){ alert('No actions to undo.'); return; }
  const last = actionHistory.pop();
  const t = last.type;
  const d = last.data;

  if(t === 'addBook'){
    // remove the book if exists and no active loans for it
    const idx = books.findIndex(b => b.bookId === d.bookId);
    if(idx !== -1){
      // but only remove if no active loans exist for the book
      const active = loansByBookId(d.bookId).length;
      if(active > 0){
        alert('Cannot undo addBook: active loans exist for this book.');
        // since undo failed, push back action to history
        actionHistory.push(last);
        return;
      }
      books.splice(idx,1);
      persistAll();
      router.render();
      alert(`Undo: Book ${d.bookId} removed.`);
      return;
    } else {
      alert('Undo: Book not found (maybe already removed).');
      return;
    }
  }

  if(t === 'addMember'){
    const idx = members.findIndex(m => m.memberId === d.memberId);
    if(idx !== -1){
      // only remove if member has no active loans
      const active = loans.filter(L => L.memberId === d.memberId).length;
      if(active > 0){
        alert('Cannot undo addMember: member has active loans.');
        actionHistory.push(last);
        return;
      }
      members.splice(idx,1);
      persistAll();
      router.render();
      alert(`Undo: Member ${d.memberId} removed.`);
      return;
    } else {
      alert('Undo: Member not found (maybe already removed).');
      return;
    }
  }

  if(t === 'checkout'){
    // remove the created loans and restore availableCopies
    const { bookId, memberId, loanIds } = d;
    let removedCount = 0;
    loanIds.forEach(lid => {
      const idx = loans.findIndex(L => L.loanId === lid);
      if(idx !== -1){
        loans.splice(idx,1);
        removedCount++;
      }
    });
    // restore copies
    const b = findBook(bookId);
    if(b) b.availableCopies += removedCount;
    persistAll();
    router.render();
    alert(`Undo: Removed ${removedCount} loan(s) from last checkout.`);
    return;
  }

  if(t === 'return'){
    // For returned loans, undo is complex because some returns might have caused reassignments.
    // We'll attempt to restore the returned loans to the member if possible by creating new loan entries.
    const { bookId, memberId, loanIds, qty, reassigned } = d;
    const b = findBook(bookId);
    const restoredIds = [];
    // restore as new loans (can't resurrect original loanIds reliably)
    for(let i=0;i<qty;i++){
      if(b && b.availableCopies > 0){
        const loanId = loanCounter++;
        const cd = todayStr();
        const due = addDaysStr(14);
        loans.push({ loanId, bookId, memberId, checkoutDate: cd, dueDate: due });
        loanHistory.add({ loanId, bookId, memberId, action: 'LOAN (undo-return)', date: cd });
        b.availableCopies -= 1;
        restoredIds.push(loanId);
      } else {
        // if no copies available (because they were reassigned), skip
      }
    }
    persistAll();
    router.render();
    alert(`Undo: Restored ${restoredIds.length} loan(s) for Member ${memberId} (best-effort).`);
    return;
  }

  if(t === 'recommend'){
    const { teacher, bookId } = d;
    if(recs[teacher]){
      const idx = recs[teacher].indexOf(bookId);
      if(idx !== -1) recs[teacher].splice(idx,1);
      if(recs[teacher].length === 0) delete recs[teacher];
    }
    persistAll(); router.render();
    alert(`Undo: Recommendation removed.`);
    return;
  }

  alert('Undo: Action type not recognized.');
}

// ---------------- Loan History Modal UI ----------------
const loanModal = document.getElementById('loanHistoryModal');
const viewLoanBtn = document.getElementById('viewLoanHistoryBtn');
const closeLoanModal = document.getElementById('closeLoanModal');
const loanHistoryBody = document.getElementById('loanHistoryBody');

function showLoanHistoryModal(){
  // populate table from linked list
  const arr = loanHistory.toArray();
  loanHistoryBody.innerHTML = arr.map(row => `
    <tr class="border-b">
      <td class="p-2">${row.idx}</td>
      <td class="p-2">${row.loanId ?? '-'}</td>
      <td class="p-2">${row.bookId}</td>
      <td class="p-2">${row.memberId}</td>
      <td class="p-2">${row.action}</td>
      <td class="p-2">${row.date}</td>
    </tr>
  `).join('') || '<tr><td class="p-2" colspan="6">No history yet.</td></tr>';

  loanModal.classList.remove('hidden');
  loanModal.classList.add('flex');
}
viewLoanBtn.addEventListener('click', showLoanHistoryModal);
closeLoanModal.addEventListener('click', ()=>{ loanModal.classList.add('hidden'); loanModal.classList.remove('flex'); });

// Also bind modal open for small screens (buttons hidden on md; provide floating action on dashboard)
// We'll show the floating buttons on the dashboard view where appropriate during render.

// Wire undo button
document.getElementById('undoBtn').addEventListener('click', ()=> {
  undoLastAction();
});

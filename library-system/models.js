// ---------------- Data Structure ----------------

// Stack for Undo
class Stack {
  constructor(){ this.items = []; }
  push(x){ this.items.push(x); }
  pop(){ return this.items.pop(); }
  peek(){ return this.items[this.items.length - 1]; }
  isEmpty(){ return this.items.length === 0; }
  size(){ return this.items.length; }
}
const actionHistory = new Stack();

// Linked List for Loan History
class LLNode {
  constructor(entry) { this.entry = entry; this.next = null; }
}
class LinkedList {
  constructor(){ this.head = null; this.size = 0; }
  add(entry){
    const n = new LLNode(entry);
    if(!this.head) this.head = n;
    else {
      let cur = this.head;
      while(cur.next) cur = cur.next;
      cur.next = n;
    }
    this.size++;
  }
  toArray(){
    const out = [];
    let cur = this.head;
    let idx = 0;
    while(cur){
      out.push({ idx: idx++, ...cur.entry });
      cur = cur.next;
    }
    return out;
  }
}
const loanHistory = new LinkedList();

// When page loads, rebuild loanHistory from existing loans (historical)
(function rebuildLoanHistoryFromLoans(){
  // if any loans exist, create history entries
  loans.forEach(L => {
    loanHistory.add({
      loanId: L.loanId || null,
      bookId: L.bookId,
      memberId: L.memberId,
      action: 'LOAN (existing)',
      date: L.checkoutDate || todayStr()
    });
  });
})();

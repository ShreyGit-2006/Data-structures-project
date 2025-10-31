const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../library-system')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/library')
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedDefaultLibrarian();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const Book = mongoose.model('Book', new mongoose.Schema({
  bookId: { type: Number, unique: true },
  title: String,
  author: String,
  totalCopies: Number,
  availableCopies: Number
}));

const Member = mongoose.model('Member', new mongoose.Schema({
  memberId: { type: Number, unique: true },
  name: String,
  maxLoans: { type: Number, default: 5 }
}));

const Loan = mongoose.model('Loan', new mongoose.Schema({
  loanId: { type: Number, unique: true },
  bookId: Number,
  memberId: Number,
  checkoutDate: String,
  dueDate: String
}));

const Reservation = mongoose.model('Reservation', new mongoose.Schema({
  bookId: Number,
  memberIds: [Number]
}));

const Recommendation = mongoose.model('Recommendation', new mongoose.Schema({
  teacher: String,
  bookIds: [Number]
}));

const Librarian = mongoose.model('Librarian', new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
}));

// Seed default librarian user
async function seedDefaultLibrarian() {
  try {
    const existingLibrarian = await Librarian.findOne({ username: 'admin' });
    if (!existingLibrarian) {
      const hashedPassword = await bcrypt.hash('password', 10);
      const defaultLibrarian = new Librarian({
        username: 'admin',
        password: hashedPassword
      });
      await defaultLibrarian.save();
      console.log('Default librarian user created: username=admin, password=password');
    }
  } catch (err) {
    console.error('Error seeding default librarian:', err);
  }
}

// JWT secret
const JWT_SECRET = 'library-jwt-secret';

// Middleware to check JWT authentication
function ensureAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const librarian = await Librarian.findOne({ username });
    if (!librarian) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, librarian.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: librarian._id, username: librarian.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

app.get('/api/books', ensureAuthenticated, async (req, res) => {
  const books = await Book.find();
  res.json(books);
});

app.post('/api/books', ensureAuthenticated, async (req, res) => {
  const book = new Book(req.body);
  if (book.availableCopies === undefined) book.availableCopies = book.totalCopies;
  await book.save();
  io.emit('bookAdded', book);
  res.json(book);
});

app.get('/api/members', ensureAuthenticated, async (req, res) => {
  const members = await Member.find();
  res.json(members);
});

app.post('/api/members', ensureAuthenticated, async (req, res) => {
  const member = new Member(req.body);
  await member.save();
  io.emit('memberAdded', member);
  res.json(member);
});

app.get('/api/loans', ensureAuthenticated, async (req, res) => {
  const loans = await Loan.find();
  res.json(loans);
});

app.post('/api/loans/checkout', ensureAuthenticated, async (req, res) => {
  const { bookId, memberId, qty } = req.body;
  try {
    const book = await Book.findOne({ bookId });
    const member = await Member.findOne({ memberId });
    if (!book || !member) return res.status(404).json({ message: 'Book or member not found' });

    const currentLoans = await Loan.countDocuments({ memberId });
    if (currentLoans >= member.maxLoans) return res.status(400).json({ message: 'Member reached max loans' });

    const toIssue = Math.min(qty, book.availableCopies, member.maxLoans - currentLoans);
    if (toIssue <= 0) return res.status(400).json({ message: 'No copies available' });

    const loans = [];
    for (let i = 0; i < toIssue; i++) {
      const loanId = Date.now() + i;
      const loan = new Loan({
        loanId,
        bookId,
        memberId,
        checkoutDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      await loan.save();
      loans.push(loan);
    }

    book.availableCopies -= toIssue;
    await book.save();

    io.emit('dataUpdated', { type: 'loans', data: await Loan.find() });
    io.emit('dataUpdated', { type: 'books', data: await Book.find() });
    res.json({ message: `${toIssue} books checked out`, loans });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/loans/return', ensureAuthenticated, async (req, res) => {
  const { bookId, memberId, qty } = req.body;
  try {
    const loans = await Loan.find({ bookId, memberId }).limit(qty);
    if (loans.length === 0) return res.status(404).json({ message: 'No matching loans' });

    for (const loan of loans) {
      await Loan.findByIdAndDelete(loan._id);
    }

    const book = await Book.findOne({ bookId });
    book.availableCopies += loans.length;
    await book.save();

    io.emit('dataUpdated', { type: 'loans', data: await Loan.find() });
    io.emit('dataUpdated', { type: 'books', data: await Book.find() });
    res.json({ message: `${loans.length} books returned` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/reservations', ensureAuthenticated, async (req, res) => {
  const reservations = await Reservation.find();
  res.json(reservations);
});

app.post('/api/reservations', ensureAuthenticated, async (req, res) => {
  const reservation = new Reservation(req.body);
  await reservation.save();
  io.emit('dataUpdated', { type: 'reservations', data: await Reservation.find() });
  res.json(reservation);
});

app.get('/api/recommendations', ensureAuthenticated, async (req, res) => {
  const recommendations = await Recommendation.find();
  res.json(recommendations);
});

app.post('/api/recommendations', ensureAuthenticated, async (req, res) => {
  const recommendation = new Recommendation(req.body);
  await recommendation.save();
  io.emit('dataUpdated', { type: 'recs', data: await Recommendation.find() });
  res.json(recommendation);
});

app.post('/api/clear', ensureAuthenticated, async (req, res) => {
  await Book.deleteMany({});
  await Member.deleteMany({});
  await Loan.deleteMany({});
  await Reservation.deleteMany({});
  await Recommendation.deleteMany({});
  io.emit('dataUpdated', { type: 'books', data: [] });
  io.emit('dataUpdated', { type: 'members', data: [] });
  io.emit('dataUpdated', { type: 'loans', data: [] });
  io.emit('dataUpdated', { type: 'reservations', data: [] });
  io.emit('dataUpdated', { type: 'recs', data: [] });
  res.json({ message: 'All data cleared' });
});

app.put('/api/settings/favoritesThreshold', ensureAuthenticated, async (req, res) => {
  // This is just a placeholder - threshold is handled client-side
  res.json({ message: 'Threshold updated' });
});

// Socket.io for real-time
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the library system at: http://localhost:${PORT}/login.html`);
});

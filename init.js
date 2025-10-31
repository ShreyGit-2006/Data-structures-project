const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/library');

const Librarian = mongoose.model('Librarian', new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
}));

async function createDefaultLibrarian() {
  try {
    const existing = await Librarian.findOne({ username: 'admin' });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('password', 10);
      const librarian = new Librarian({
        username: 'admin',
        password: hashedPassword
      });
      await librarian.save();
      console.log('Default librarian created: username=admin, password=password');
    } else {
      console.log('Default librarian already exists');
    }
  } catch (err) {
    console.error('Error creating default librarian:', err);
  } finally {
    mongoose.connection.close();
  }
}

createDefaultLibrarian();

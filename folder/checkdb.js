const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/library');
    console.log('Connected to MongoDB\n');

    console.log('Books:');
    const books = await mongoose.connection.db.collection('books').find().toArray();
    console.log(JSON.stringify(books, null, 2));

    console.log('\nMembers:');
    const members = await mongoose.connection.db.collection('members').find().toArray();
    console.log(JSON.stringify(members, null, 2));

    console.log('\nLoans:');
    const loans = await mongoose.connection.db.collection('loans').find().toArray();
    console.log(JSON.stringify(loans, null, 2));

    console.log('\nReservations:');
    const reservations = await mongoose.connection.db.collection('reservations').find().toArray();
    console.log(JSON.stringify(reservations, null, 2));

    console.log('\nRecommendations:');
    const recommendations = await mongoose.connection.db.collection('recommendations').find().toArray();
    console.log(JSON.stringify(recommendations, null, 2));

    process.exit();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDatabase();

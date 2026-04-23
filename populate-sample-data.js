const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import your models
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

async function populateSampleData() {
  try {
    // Connect to database
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    console.log('Connected to database...');

    // Sample Doctors
    const doctors = [
      {
        name: 'Dr. Rajesh Kumar',
        specialty: 'Cardiology',
        availableSlots: [
          { date: new Date('2026-04-20'), time: '10:00 AM', isBooked: false },
          { date: new Date('2026-04-20'), time: '2:00 PM', isBooked: true }
        ]
      },
      {
        name: 'Dr. Priya Sharma',
        specialty: 'Dermatology',
        availableSlots: [
          { date: new Date('2026-04-21'), time: '11:00 AM', isBooked: false }
        ]
      }
    ];

    // Sample Patients
    const patients = [
      {
        name: 'Amit Singh',
        email: 'amit@example.com',
        phone: '9876543210',
        age: 35
      },
      {
        name: 'Sneha Patel',
        email: 'sneha@example.com',
        phone: '8765432109',
        age: 28
      }
    ];

    // Insert sample data
    await Doctor.insertMany(doctors);
    await Patient.insertMany(patients);

    console.log('✅ Sample data populated!');
    console.log(`📊 ${doctors.length} doctors added`);
    console.log(`👥 ${patients.length} patients added`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Population failed:', error);
  }
}

populateSampleData();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Doctor = require('./models/Doctor');

async function addDoctors() {
  try {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    console.log('Connected to in-memory MongoDB');

    const doctors = [
      { name: 'Dr. Rajesh Kumar', specialty: 'Cardiologist' },
      { name: 'Dr. Priya Sharma', specialty: 'Dermatologist' },
      { name: 'Dr. Amit Singh', specialty: 'Neurologist' },
      { name: 'Dr. Sunita Patel', specialty: 'Gynecologist' },
      { name: 'Dr. Vikram Rao', specialty: 'Orthopedic Surgeon' },
      { name: 'Dr. Meera Joshi', specialty: 'Pediatrician' },
      { name: 'Dr. Arjun Nair', specialty: 'Ophthalmologist' },
      { name: 'Dr. Kavita Reddy', specialty: 'Endocrinologist' },
      { name: 'Dr. Sanjay Gupta', specialty: 'General Physician' },
      { name: 'Dr. Anjali Desai', specialty: 'Psychiatrist' },
      { name: 'Dr. Ramesh Iyer', specialty: 'Urologist' },
      { name: 'Dr. Pooja Bhat', specialty: 'Dentist' },
      { name: 'Dr. Karan Malhotra', specialty: 'ENT Specialist' },
      { name: 'Dr. Neha Agarwal', specialty: 'Radiologist' },
      { name: 'Dr. Rohit Verma', specialty: 'Oncologist' }
    ];

    for (const doc of doctors) {
      const existing = await Doctor.findOne({ name: doc.name });
      if (!existing) {
        const doctor = new Doctor({
          name: doc.name,
          specialty: doc.specialty,
          availableSlots: [
            { date: new Date('2024-04-15'), time: '10:00 AM', isBooked: false },
            { date: new Date('2024-04-15'), time: '11:00 AM', isBooked: false },
            { date: new Date('2024-04-16'), time: '10:00 AM', isBooked: false },
            { date: new Date('2024-04-16'), time: '11:00 AM', isBooked: false },
            { date: new Date('2024-04-17'), time: '10:00 AM', isBooked: false },
            { date: new Date('2024-04-17'), time: '11:00 AM', isBooked: false }
          ]
        });
        await doctor.save();
        console.log(`Added ${doc.name}`);
      } else {
        console.log(`${doc.name} already exists`);
      }
    }

    console.log('Doctors added successfully');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

addDoctors();
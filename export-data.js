const mongoose = require('mongoose');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import your models
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

async function exportData() {
  try {
    // Connect to the same database as your server
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    console.log('Connected to database...');

    // Fetch all data
    const doctors = await Doctor.find();
    const patients = await Patient.find();
    const appointments = await Appointment.find();

    const data = {
      exportedAt: new Date(),
      doctors: doctors,
      patients: patients,
      appointments: appointments
    };

    // Save to JSON file
    fs.writeFileSync('database-export.json', JSON.stringify(data, null, 2));
    console.log('✅ Database exported to database-export.json');

    // Also create a readable summary
    const summary = {
      totalDoctors: doctors.length,
      totalPatients: patients.length,
      totalAppointments: appointments.length,
      pendingAppointments: appointments.filter(app => app.status === 'booked').length,
      completedAppointments: appointments.filter(app => app.status === 'completed').length
    };

    fs.writeFileSync('database-summary.json', JSON.stringify(summary, null, 2));
    console.log('✅ Summary exported to database-summary.json');

    await mongoose.disconnect();
    console.log('✅ Export complete!');

  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

exportData();
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const Doctor = require('./models/Doctor');

const {
  router: authRoutes,
  sessionMiddleware
} = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const patientRoutes = require('./routes/patients');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:']
    }
  }
}));
app.use(express.json());
app.use(sessionMiddleware);
app.use((req, res, next) => {
  if (
    req.path === '/' ||
    req.path.endsWith('.html') ||
    req.path.endsWith('.js')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

async function connectDB() {
  const configuredMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital-booking';

  try {
    await mongoose.connect(configuredMongoUri);
    console.log(`MongoDB connected (${configuredMongoUri})`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

async function populateSampleDataOnStartup() {
  try {
    const doctorCount = await Doctor.countDocuments();

    if (doctorCount === 0) {
      console.log('Database is empty, populating sample data...');

      const sampleDoctors = [
        {
          name: 'Dr. Rajesh Kumar',
          specialty: 'Cardiology',
          availableSlots: [
            { date: new Date('2026-04-20'), time: '10:00 AM', isBooked: false },
            { date: new Date('2026-04-20'), time: '2:00 PM', isBooked: false },
            { date: new Date('2026-04-21'), time: '9:00 AM', isBooked: false },
            { date: new Date('2026-04-21'), time: '3:00 PM', isBooked: false }
          ]
        },
        {
          name: 'Dr. Priya Sharma',
          specialty: 'Dermatology',
          availableSlots: [
            { date: new Date('2026-04-21'), time: '11:00 AM', isBooked: false },
            { date: new Date('2026-04-22'), time: '2:00 PM', isBooked: false },
            { date: new Date('2026-04-22'), time: '4:00 PM', isBooked: false }
          ]
        },
        {
          name: 'Dr. Anil Patel',
          specialty: 'Orthopedics',
          availableSlots: [
            { date: new Date('2026-04-20'), time: '11:00 AM', isBooked: false },
            { date: new Date('2026-04-23'), time: '10:00 AM', isBooked: false },
            { date: new Date('2026-04-23'), time: '3:00 PM', isBooked: false }
          ]
        },
        {
          name: 'Dr. Neha Singh',
          specialty: 'Pediatrics',
          availableSlots: [
            { date: new Date('2026-04-20'), time: '4:00 PM', isBooked: false },
            { date: new Date('2026-04-21'), time: '10:00 AM', isBooked: false },
            { date: new Date('2026-04-24'), time: '2:00 PM', isBooked: false }
          ]
        }
      ];

      await Doctor.insertMany(sampleDoctors);
      console.log('Sample doctors populated successfully.');
    } else {
      console.log(`Database already has ${doctorCount} doctor(s)`);
    }
  } catch (err) {
    console.log('Error during data population:', err);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Hospital Booking API is running',
    endpoints: ['/api/auth/login', '/api/auth/register', '/api/health']
  });
});

app.get('/', (req, res) => {
  if (req.user?.role === 'admin') {
    return res.redirect('/admin.html');
  }

  if (req.user?.role === 'user') {
    return res.redirect('/book.html');
  }

  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/book.html', (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }

  if (req.user.role !== 'user') {
    return res.redirect('/admin.html');
  }

  return res.sendFile(path.join(__dirname, 'public', 'book.html'));
});

app.get('/admin.html', (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }

  if (req.user.role !== 'admin') {
    return res.redirect('/book.html');
  }

  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
  await connectDB();
  await populateSampleDataOnStartup();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

process.on('SIGINT', async () => {
  await mongoose.connection.close();

  process.exit(0);
});

startServer();

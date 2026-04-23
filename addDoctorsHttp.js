const http = require('http');

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

function addDoctor(doctor, callback) {
  const data = JSON.stringify({
    name: doctor.name,
    specialty: doctor.specialty,
    availableSlots: [
      { date: '2024-04-15', time: '10:00 AM', isBooked: false },
      { date: '2024-04-15', time: '11:00 AM', isBooked: false },
      { date: '2024-04-16', time: '10:00 AM', isBooked: false },
      { date: '2024-04-16', time: '11:00 AM', isBooked: false },
      { date: '2024-04-17', time: '10:00 AM', isBooked: false },
      { date: '2024-04-17', time: '11:00 AM', isBooked: false }
    ]
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log(`Added ${doctor.name}: ${res.statusCode}`);
      callback();
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request for ${doctor.name}: ${e.message}`);
    callback();
  });

  req.write(data);
  req.end();
}

function addAllDoctors() {
  let index = 0;
  function next() {
    if (index < doctors.length) {
      addDoctor(doctors[index], next);
      index++;
    } else {
      console.log('All doctors added');
    }
  }
  next();
}

setTimeout(addAllDoctors, 10000); // Wait 10 seconds for server to be ready
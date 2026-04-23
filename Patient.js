const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    min: 0
  },
  address: {
    type: String
  },
  medicalHistory: {
    type: String
  }
});

module.exports = mongoose.model('Patient', patientSchema);
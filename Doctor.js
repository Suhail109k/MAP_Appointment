const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    required: true
  },
  availableSlots: [{
    date: Date,
    time: String, // e.g., "10:00 AM"
    isBooked: {
      type: Boolean,
      default: false
    }
  }]
});

module.exports = mongoose.model('Doctor', doctorSchema);

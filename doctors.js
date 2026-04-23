const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const { requireAdmin } = require('./auth');

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get doctor availability
router.get('/:id/availability', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const availableSlots = doctor.availableSlots.filter(slot => !slot.isBooked);
    res.json(availableSlots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new doctor (for admin purposes)
router.post('/', requireAdmin, async (req, res) => {
  if (!req.body.name || !req.body.specialty) {
    return res.status(400).json({ message: 'Name and specialty are required' });
  }

  // Check for duplicate doctor name
  const existingDoctor = await Doctor.findOne({ name: req.body.name });
  if (existingDoctor) {
    return res.status(400).json({ message: 'Doctor with this name already exists' });
  }

  const slots = req.body.availableSlots ? req.body.availableSlots.map(slot => ({
    date: new Date(slot.date),
    time: slot.time,
    isBooked: slot.isBooked || false
  })) : [];

  const doctor = new Doctor({
    name: req.body.name,
    specialty: req.body.specialty,
    availableSlots: slots
  });

  try {
    const newDoctor = await doctor.save();
    res.status(201).json(newDoctor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

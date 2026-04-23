const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { requireAdmin } = require('./auth');

// Get all patients
router.get('/', requireAdmin, async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific patient by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new patient
router.post('/', requireAdmin, async (req, res) => {
  const patient = new Patient({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    age: req.body.age,
    address: req.body.address,
    medicalHistory: req.body.medicalHistory
  });

  try {
    const newPatient = await patient.save();
    res.status(201).json(newPatient);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Update a patient
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.name = req.body.name || patient.name;
    patient.email = req.body.email || patient.email;
    patient.phone = req.body.phone || patient.phone;
    patient.age = req.body.age !== undefined ? req.body.age : patient.age;
    patient.address = req.body.address || patient.address;
    patient.medicalHistory = req.body.medicalHistory || patient.medicalHistory;

    const updatedPatient = await patient.save();
    res.json(updatedPatient);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Delete a patient
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    await Patient.deleteOne({ _id: patient._id });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

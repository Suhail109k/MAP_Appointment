const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { requireAdmin, requireAuth, requireUser } = require('./auth');

// Book an appointment
router.post('/', requireUser, async (req, res) => {
  if (!req.body.doctorId || !req.body.patientEmail || !req.body.patientName || !req.body.patientPhone || !req.body.date || !req.body.time || !req.body.reason || !req.body.problem) {
    return res.status(400).json({ message: 'All fields are required: doctorId, patientEmail, patientName, patientPhone, date, time, reason, problem' });
  }

  try {
    const sessionEmail = req.user.email;
    const requestEmail = String(req.body.patientEmail).trim().toLowerCase();

    if (requestEmail !== sessionEmail) {
      return res.status(403).json({ message: 'You can book appointments only with your signed-in email' });
    }

    // Check if patient exists, if not create
    let patient = await Patient.findOne({ email: sessionEmail });
    const user = await User.findOne({ email: sessionEmail });
    if (!patient) {
      patient = new Patient({
        name: req.body.patientName,
        email: sessionEmail,
        phone: req.body.patientPhone
      });
      await patient.save();
    } else {
      patient.name = req.body.patientName;
      patient.phone = req.body.patientPhone;
      await patient.save();
    }

    if (user) {
      user.name = req.body.patientName;
      user.phone = req.body.patientPhone;
      await user.save();
    }

    // Check if slot is available
    const doctor = await Doctor.findById(req.body.doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const slot = doctor.availableSlots.find(s => {
      const slotDate = new Date(s.date);
      const reqDate = new Date(req.body.date);
      return slotDate.getFullYear() === reqDate.getFullYear() &&
             slotDate.getMonth() === reqDate.getMonth() &&
             slotDate.getDate() === reqDate.getDate() &&
             s.time === req.body.time &&
             !s.isBooked;
    });

    if (!slot) return res.status(400).json({ message: 'Slot not available' });

    // Create appointment
    const appointment = new Appointment({
      doctor: req.body.doctorId,
      patient: patient._id,
      date: req.body.date,
      time: req.body.time,
      reason: req.body.reason,
      problem: req.body.problem,
      notes: req.body.notes || ''
    });

    const newAppointment = await appointment.save();

    // Mark slot as booked
    slot.isBooked = true;
    await doctor.save();

    res.status(201).json(newAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update appointment status or notes
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const medicine = typeof req.body.medicine === 'string' ? req.body.medicine.trim() : req.body.medicine;

    if (req.body.status) {
      const allowedStatuses = ['booked', 'completed', 'cancelled'];
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid appointment status' });
      }
      if (req.body.status === 'completed' && !medicine) {
        return res.status(400).json({ message: 'Medicine is required when completing an appointment' });
      }
      appointment.status = req.body.status;
    }

    if (req.body.notes !== undefined) {
      appointment.notes = req.body.notes;
    }

    if (req.body.medicine !== undefined) {
      appointment.medicine = medicine || '';
    }

    const updatedAppointment = await appointment.save();
    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update appointment notes
router.put('/:id/notes', requireAdmin, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.notes = req.body.notes;
    const updatedAppointment = await appointment.save();
    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all appointments
router.get('/', requireAdmin, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('doctor')
      .populate('patient');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/list', requireUser, async (req, res) => {
  try {
    const patient = await Patient.findOne({ email: req.user.email });

    if (!patient) {
      return res.json([]);
    }

    const appointments = await Appointment.find({ patient: patient._id })
      .populate('doctor')
      .populate('patient')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get appointment by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor')
      .populate('patient');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'user' && appointment.patient.email !== req.user.email) {
      return res.status(403).json({ message: 'You can view only your own appointments' });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;

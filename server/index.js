require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(require('path').join(__dirname, '../client')));

// ---------- Models ----------
const required = (type) => ({ type, required: true, trim: true });

const Resident = mongoose.model('Resident', new mongoose.Schema({
  firstName: required(String),
  lastName: required(String),
  birthdate: { type: Date, required: true },
  sex: { type: String, enum: ['Male', 'Female'], required: true },
  purok: required(String),
  address: { type: String, trim: true },
  contactNumber: { type: String, trim: true, match: [/^[0-9+\-\s]{7,15}$/, 'Invalid contact number'] },
}, { timestamps: true }));

const Request = mongoose.model('Request', new mongoose.Schema({
  resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  type: {
    type: String, required: true,
    enum: ['Barangay Clearance', 'Certificate of Residency', 'Certificate of Indigency'],
  },
  purpose: { type: String, trim: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Released'], default: 'Pending' },
}, { timestamps: true }));

// Wraps async handlers so errors become JSON responses
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  const bad = ['ValidationError', 'CastError'].includes(e.name);
  res.status(bad ? 400 : 500).json({ error: e.message });
});

// ---------- Residents ----------
app.get('/api/residents', wrap(async (req, res) => {
  const q = (req.query.q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = q ? { $or: [{ firstName: new RegExp(q, 'i') }, { lastName: new RegExp(q, 'i') }] } : {};
  res.json(await Resident.find(filter).sort({ lastName: 1 }));
}));

app.post('/api/residents', wrap(async (req, res) => {
  res.status(201).json(await Resident.create(req.body));
}));

app.put('/api/residents/:id', wrap(async (req, res) => {
  const updated = await Resident.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: 'Resident not found' });
  res.json(updated);
}));

app.delete('/api/residents/:id', wrap(async (req, res) => {
  const deleted = await Resident.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Resident not found' });
  await Request.deleteMany({ resident: req.params.id }); // remove their requests too
  res.json({ ok: true });
}));

// ---------- Requests ----------
app.get('/api/requests', wrap(async (req, res) => {
  res.json(await Request.find().populate('resident', 'firstName lastName').sort({ createdAt: -1 }));
}));

app.post('/api/requests', wrap(async (req, res) => {
  if (!(await Resident.exists({ _id: req.body.resident }))) {
    return res.status(400).json({ error: 'Choose a valid resident' });
  }
  res.status(201).json(await Request.create(req.body));
}));

app.put('/api/requests/:id', wrap(async (req, res) => {
  const updated = await Request.findByIdAndUpdate(
    req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: 'Request not found' });
  res.json(updated);
}));

// ---------- Dashboard ----------
app.get('/api/stats', wrap(async (req, res) => {
  const [residents, pending, released] = await Promise.all([
    Resident.countDocuments(),
    Request.countDocuments({ status: 'Pending' }),
    Request.countDocuments({ status: 'Released' }),
  ]);
  res.json({ residents, pending, released });
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API running on port ' + (process.env.PORT || 5000))))
  .catch((e) => console.error('MongoDB connection failed:', e.message));

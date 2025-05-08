const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({}, { strict: false }); // Flexible schema

module.exports = mongoose.model('Attendance', attendanceSchema, 'attendances'); // Explicit collection name

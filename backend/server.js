require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Attendance = require('./models/Attendance');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// GET records between two dates
app.get('/api/attendances', async (req, res) => {
    const { from, to } = req.query;
  
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to date' });
    }
  
    try {
      const fromParts = req.query.from.split('-'); // yyyy-mm-dd
const toParts = req.query.to.split('-');

const from = new Date(Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0));
const to = new Date(Date.UTC(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59, 999));


const records = await Attendance.find({
  date: {
    $gte: from,
    $lte: to,
  },
});
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  });
  

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

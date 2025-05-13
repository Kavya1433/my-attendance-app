require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Attendance = require("./models/Attendance");

const app = express();
app.use(cors({
  origin:process.env.ORIGIN_HOST
}));
app.use(express.json());

const connectDB = async()=>{
  try {
    const mongoConnection = await mongoose.connect(process.env.MONGO_URI);
    console.log("Database Connected : ",mongoConnection.connection.host);
  } catch (error) {
    console.log("Database Connection Error : ",error);
  }
}

// GET records between two dates
app.get("/api/attendances", async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Missing from or to date" });
  }

  try {
    const fromParts = req.query.from.split("-"); // yyyy-mm-dd
    const toParts = req.query.to.split("-");

    const from = new Date(
      Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0)
    );
    const to = new Date(
      Date.UTC(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59, 999)
    );

    const records = await Attendance.find({
      date: {
        $gte: from,
        $lte: to,
      },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

app.get("/",(req,res)=>{
  res.status(200).json({message:"Atendance server running..."})
})

connectDB().then(()=>{
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  })
})

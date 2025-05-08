import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function App() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchRollNo, setSearchRollNo] = useState('');
  const [processedRecords, setProcessedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [totals, setTotals] = useState({
    Breakfast: 0,
    Lunch: 0,
    Snacks: 0,
    Dinner: 0,
  });

  const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'pm' && hours !== 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const categorizeMeal = (timeStr) => {
    const time = parseTime(timeStr);
    if (time >= 450 && time <= 600) return 'Breakfast'; // 7:30–10:00 AM
    if (time >= 720 && time <= 870) return 'Lunch';     // 12:00–2:30 PM
    if (time >= 1020 && time <= 1115) return 'Snacks';   // 5:00–6:35 PM
    if (time >= 1170 && time <= 1290) return 'Dinner';   // 7:30–9:30 PM
    return null;
  };

  const fetchData = async () => {
    setLoading(true);
    setFetched(false);
    setTotals({ Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 });

    try {
      const res = await axios.get('http://localhost:3001/api/attendances', {
        params: { from: fromDate, to: toDate },
      });

      const filteredData = searchRollNo
        ? res.data.filter((rec) => rec.rollNo.toLowerCase().includes(searchRollNo.toLowerCase()))
        : res.data;

      const grouped = {};
      const mealCounts = { Breakfast: new Set(), Lunch: new Set(), Snacks: new Set(), Dinner: new Set() };

      filteredData.forEach((rec) => {
        const meal = categorizeMeal(rec.time);
        if (!meal) return;

        const dateKey = new Date(rec.date).toISOString().split('T')[0];
        const key = `${rec.uniqueId}_${dateKey}`;

        if (!grouped[key]) {
          grouped[key] = {
            uniqueId: rec.uniqueId,
            name: rec.name,
            rollNo: rec.rollNo,
            date: dateKey,
            Breakfast: 'Absent',
            Lunch: 'Absent',
            Snacks: 'Absent',
            Dinner: 'Absent',
          };
        }

        grouped[key][meal] = 'Present';
        mealCounts[meal].add(`${rec.uniqueId}_${dateKey}`);
      });

      setProcessedRecords(Object.values(grouped));

      setTotals({
        Breakfast: mealCounts.Breakfast.size,
        Lunch: mealCounts.Lunch.size,
        Snacks: mealCounts.Snacks.size,
        Dinner: mealCounts.Dinner.size,
      });

    } catch (err) {
      alert('Error fetching records');
    } finally {
      setFetched(true);
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(processedRecords);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, 'attendance_summary.xlsx');
  };

  return (
    <div className="container">
      <h2>Attendance Summary</h2>
      <div className="form-group">
        <label>From: </label>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <label>To: </label>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        <label>Roll No: </label>
        <input
          type="text"
          value={searchRollNo}
          onChange={(e) => setSearchRollNo(e.target.value)}
          placeholder="Enter roll number"
        />
        <button onClick={fetchData} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
      </div>

      {fetched && processedRecords.length === 0 && (
        <p className="no-data">No records found for the selected date range.</p>
      )}

      {processedRecords.length > 0 && (
        <>
          <div className="totals">
            <p>Total Present: 
              <strong> Breakfast:</strong> {totals.Breakfast} | 
              <strong> Lunch:</strong> {totals.Lunch} | 
              <strong> Snacks:</strong> {totals.Snacks} | 
              <strong> Dinner:</strong> {totals.Dinner}
            </p>
            <button onClick={downloadExcel}>Download Excel</button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Unique ID</th>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Date</th>
                  <th>Breakfast</th>
                  <th>Lunch</th>
                  <th>Snacks</th>
                  <th>Dinner</th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((r, i) => (
                  <tr key={i}>
                    <td>{r.uniqueId}</td>
                    <td>{r.name}</td>
                    <td>{r.rollNo}</td>
                    <td>{r.date}</td>
                    <td>{r.Breakfast}</td>
                    <td>{r.Lunch}</td>
                    <td>{r.Snacks}</td>
                    <td>{r.Dinner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        .container {
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f6f8;
        }

        h2 {
          text-align: center;
          color: #2c3e50;
        }

        .form-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
        }

        input[type="date"], input[type="text"], button {
          padding: 8px;
          border-radius: 5px;
          font-size: 14px;
          border: 1px solid #ccc;
        }

        button {
          background-color: #007bff;
          color: white;
          border: none;
          cursor: pointer;
        }

        button:disabled {
          background-color: #a0c8f0;
          cursor: not-allowed;
        }

        .no-data {
          text-align: center;
          font-style: italic;
          color: #888;
          margin-top: 30px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        th, td {
          padding: 12px;
          text-align: center;
          border: 1px solid #ddd;
          font-size: 14px;
        }

        thead {
          background-color: #007bff;
          color: white;
        }

        tbody tr:nth-child(even) {
          background-color: #f2f2f2;
        }

        tbody tr:hover {
          background-color: #e1f5fe;
        }

        .totals {
          text-align: center;
          margin: 15px 0;
        }

        .totals button {
          margin-top: 10px;
          padding: 8px 12px;
        }

        @media (max-width: 768px) {
          th, td {
            padding: 8px;
            font-size: 12px;
          }

          .form-group {
            flex-direction: column;
            align-items: flex-start;
          }

          button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default App;

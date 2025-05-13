import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { BACKEND_URL } from './constants';

function App() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchRollNo, setSearchRollNo] = useState('');
  const [processedRecords, setProcessedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState(null);
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

  const validateInputs = () => {
    if (!fromDate || !toDate) {
      setError("Please select both from and to dates");
      return false;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
      setError("From date cannot be greater than To date");
      return false;
    }
    
    return true;
  };

  const fetchData = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    setFetched(false);
    setError(null);
    setTotals({ Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 });

    try {
      const res = await axios.get(`${BACKEND_URL}/api/attendances`, {
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
      setError(err.response?.data?.message || "Failed to fetch attendance data");
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Attendance Summary</h1>
      </header>
      
      <div className="card">
        <div className="form-container">
          <div className="form-group">
            <label htmlFor="fromDate">From Date</label>
            <input 
              id="fromDate"
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="toDate">To Date</label>
            <input 
              id="toDate"
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="rollNo">Roll Number</label>
            <input
              id="rollNo"
              type="text"
              value={searchRollNo}
              onChange={(e) => setSearchRollNo(e.target.value)}
              placeholder="Filter by roll number"
            />
          </div>
          
          <button 
            className="fetch-button" 
            onClick={fetchData} 
            disabled={loading}
          >
            {loading ? (
              <span className="button-content">
                <span className="loader"></span>
                <span>Fetching...</span>
              </span>
            ) : (
              <span>Fetch Records</span>
            )}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}
      </div>
      
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      )}

      {fetched && !loading && processedRecords.length === 0 && (
        <div className="no-data-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <path d="M13 2v7h7"></path>
          </svg>
          <p>No records found for the selected criteria.</p>
          <p className="subtext">Try adjusting your date range or roll number filter.</p>
        </div>
      )}

      {!loading && processedRecords.length > 0 && (
        <div className="results-container">
          <div className="card summary-card">
            <h2>Summary</h2>
            <div className="totals-grid">
              <div className="total-item">
                <span className="meal-label">Breakfast</span>
                <span className="meal-count">{totals.Breakfast}</span>
              </div>
              <div className="total-item">
                <span className="meal-label">Lunch</span>
                <span className="meal-count">{totals.Lunch}</span>
              </div>
              <div className="total-item">
                <span className="meal-label">Snacks</span>
                <span className="meal-count">{totals.Snacks}</span>
              </div>
              <div className="total-item">
                <span className="meal-label">Dinner</span>
                <span className="meal-count">{totals.Dinner}</span>
              </div>
            </div>
            <button onClick={downloadExcel} className="download-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Excel
            </button>
          </div>

          <div className="table-container">
            <table className="attendance-table">
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
                {processedRecords.map((record, index) => (
                  <tr key={index}>
                    <td>{record.uniqueId}</td>
                    <td>{record.name}</td>
                    <td>{record.rollNo}</td>
                    <td>{formatDate(record.date)}</td>
                    <td className={record.Breakfast === 'Present' ? 'present' : 'absent'}>
                      {record.Breakfast}
                    </td>
                    <td className={record.Lunch === 'Present' ? 'present' : 'absent'}>
                      {record.Lunch}
                    </td>
                    <td className={record.Snacks === 'Present' ? 'present' : 'absent'}>
                      {record.Snacks}
                    </td>
                    <td className={record.Dinner === 'Present' ? 'present' : 'absent'}>
                      {record.Dinner}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          background-color: #f5f7fa;
          color: #333;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          margin-bottom: 24px;
          text-align: center;
        }
        
        h1 {
          color: #1a56db;
          font-size: 28px;
          font-weight: 600;
        }
        
        h2 {
          color: #2d3748;
          font-size: 20px;
          margin-bottom: 16px;
        }
        
        .card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .form-container {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 200px;
        }
        
        label {
          color: #4a5568;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        
        input[type="date"],
        input[type="text"] {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          padding: 10px 12px;
          transition: border-color 0.2s;
        }
        
        input[type="date"]:focus,
        input[type="text"]:focus {
          border-color: #3182ce;
          outline: none;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
        }
        
        .fetch-button {
          background-color: #1a56db;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          min-height: 40px;
          min-width: 120px;
          padding: 10px 16px;
          transition: background 0.2s;
        }
        
        .button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .fetch-button:hover {
          background-color: #1e429f;
        }
        
        .fetch-button:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fff5f5;
          border-left: 4px solid #f56565;
          border-radius: 4px;
          color: #c53030;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 0;
          text-align: center;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
          border: 4px solid rgba(66, 153, 225, 0.1);
          border-radius: 50%;
          border-top-color: #1a56db;
          height: 48px;
          width: 48px;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .loader {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }
        
        .no-data-card {
          align-items: center;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 48px;
          text-align: center;
        }
        
        .no-data-card svg {
          color: #a0aec0;
          margin-bottom: 8px;
        }
        
        .subtext {
          color: #718096;
          font-size: 14px;
        }
        
        .results-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .summary-card {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        
        .totals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .total-item {
          background-color: #f7fafc;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          padding: 16px;
          text-align: center;
        }
        
        .meal-label {
          color: #4a5568;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .meal-count {
          color: #1a56db;
          font-size: 24px;
          font-weight: 700;
        }
        
        .download-button {
          align-items: center;
          background-color: #38a169;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          display: flex;
          font-size: 14px;
          font-weight: 500;
          gap: 8px;
          justify-content: center;
          margin-top: 8px;
          padding: 10px 16px;
          transition: background 0.2s;
        }
        
        .download-button:hover {
          background-color: #2f855a;
        }
        
        .table-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          overflow: auto;
        }
        
        .attendance-table {
          border-collapse: collapse;
          width: 100%;
        }
        
        .attendance-table th,
        .attendance-table td {
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          padding: 12px 16px;
          text-align: left;
        }
        
        .attendance-table th {
          background-color: #f7fafc;
          color: #4a5568;
          font-weight: 600;
          position: sticky;
          top: 0;
        }
        
        .attendance-table tbody tr:hover {
          background-color: #f7fafc;
        }
        
        .present {
          color: #38a169;
          font-weight: 500;
        }
        
        .absent {
          color: #e53e3e;
        }
        
        @media (max-width: 768px) {
          .form-container {
            flex-direction: column;
          }
          
          .form-group {
            width: 100%;
          }
          
          .fetch-button {
            width: 100%;
          }
          
          .attendance-table {
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
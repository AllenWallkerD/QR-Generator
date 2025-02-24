import React, { useEffect, useState } from 'react';
import { fetchAllAttendance } from '../services/firestore';
import '../styles/StudentDataTable.css';

const DEFAULT_LAT = 43.218843810825405;
const DEFAULT_LNG = 76.92844706286535;
const DISTANCE_THRESHOLD_KM = 0.05;

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function formatTimeOnly(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const StudentDataTable = () => {
  const [attendanceList, setAttendanceList] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAllAttendance();
        console.log("Fetched attendance data:", data);
        setAttendanceList(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const teacherLat = parseFloat(localStorage.getItem("teacherLatitude")) || DEFAULT_LAT;
  const teacherLng = parseFloat(localStorage.getItem("teacherLongitude")) || DEFAULT_LNG;

  return (
    <div className="table-container">
      <h2 className="table-title">Сабақтағы студенттер</h2>
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Аты</th>
            <th>Студент ID</th>
            <th>Уақыт</th>
          </tr>
        </thead>
        <tbody>
          {attendanceList.map((item) => {
            const { _id, name, studentId, scannedAt, latitude, longitude } = item;

            let formattedTime = "";
            if (scannedAt) {
              const dateObj = scannedAt.toDate
                ? scannedAt.toDate()
                : new Date(scannedAt);
              formattedTime = formatTimeOnly(dateObj);
            }

            let valid = "no";
            if (latitude !== undefined && longitude !== undefined) {
              const distance = getDistanceFromLatLonInKm(
                teacherLat,
                teacherLng,
                latitude,
                longitude
              );
              valid = distance <= DISTANCE_THRESHOLD_KM ? "yes" : "no";
            }

            return (
              <tr key={_id}>
                <td className="name-cell">
                  <span className={`valid-indicator ${valid}`} />
                  <span className="name-text">{name}</span>
                </td>
                <td>{studentId}</td>
                <td>{formattedTime}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StudentDataTable;

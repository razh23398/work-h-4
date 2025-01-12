import React, { useState, useEffect } from 'react';
    import Calendar from 'react-calendar';
    import 'react-calendar/dist/Calendar.css';
    import './EmployeePortal.css';
    import { db } from '../firebase';
    import {
      collection,
      onSnapshot,
      doc,
      updateDoc,
      arrayUnion,
    } from 'firebase/firestore';

    function EmployeePortal() {
      const [date, setDate] = useState(new Date());
      const [selectedDate, setSelectedDate] = useState(null);
      const [shifts, setShifts] = useState([]);
      const [shiftRequest, setShiftRequest] = useState(null);
      const [assignedShifts, setAssignedShifts] = useState([]);
      const [registeredShifts, setRegisteredShifts] = useState([]);
      const restaurantId = sessionStorage.getItem('restaurantId');
      const userRole = sessionStorage.getItem('userRole');
      const [employeeId, setEmployeeId] = useState(null);
      const [submitStatus, setSubmitStatus] = useState({});

      useEffect(() => {
        if (restaurantId) {
          const shiftsRef = collection(
            db,
            'restaurants',
            restaurantId,
            'shifts'
          );
          const unsubscribeShifts = onSnapshot(shiftsRef, (snapshot) => {
            const shiftsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setShifts(shiftsData);
          });

          const fetchEmployeeId = async () => {
            if (userRole === 'employee') {
              const employeesRef = collection(
                db,
                'restaurants',
                restaurantId,
                'employees'
              );
              const unsubscribeEmployees = onSnapshot(employeesRef, (snapshot) => {
                snapshot.forEach((doc) => {
                  if (doc.data().username === sessionStorage.getItem('username')) {
                    setEmployeeId(doc.id);
                  }
                });
              });
              return () => {
                unsubscribeEmployees();
              };
            }
          };
          fetchEmployeeId();

          return () => {
            unsubscribeShifts();
          };
        }
      }, [restaurantId, userRole]);

      useEffect(() => {
        if (employeeId && shifts) {
          const assigned = shifts
            .filter((shift) => shift.neededEmployees > 0)
            .map((shift) => shift.date);
          setAssignedShifts(assigned);

          const registered = shifts
            .filter((shift) => shift.requests?.includes(employeeId))
            .map((shift) => shift.date);
          setRegisteredShifts(registered);
        }
      }, [shifts, employeeId]);

      const handleDateChange = (date) => {
        setDate(date);
        setSelectedDate(date);
      };

      const handleRequestShift = async (shift) => {
        if (selectedDate && employeeId) {
          const shiftDocRef = doc(
            db,
            'restaurants',
            restaurantId,
            'shifts',
            shift.id
          );
          setSubmitStatus((prev) => ({ ...prev, [shift.id]: 'submitting' }));
          try {
            await updateDoc(shiftDocRef, {
              requests: arrayUnion(employeeId),
            });
            setShiftRequest(selectedDate);
            setRegisteredShifts((prev) => [...prev, shift.date]);
            setSubmitStatus((prev) => ({ ...prev, [shift.id]: 'submitted' }));
            setTimeout(() => {
              setSubmitStatus((prev) => ({ ...prev, [shift.id]: null }));
            }, 2000);
          } catch (error) {
            console.error('Error requesting shift:', error);
            setSubmitStatus((prev) => ({ ...prev, [shift.id]: 'error' }));
            setTimeout(() => {
              setSubmitStatus((prev) => ({ ...prev, [shift.id]: null }));
            }, 2000);
          }
        }
      };

      const isDateAssigned = (date) => {
        return shifts.some(
          (shift) =>
            shift.date === date.toLocaleDateString() && shift.neededEmployees > 0
        );
      };

      const isDateRegistered = (date) => {
        return registeredShifts.includes(date.toLocaleDateString());
      };

      const tileClassName = ({ date, view }) => {
        if (view === 'month') {
          if (isDateRegistered(date)) {
            return 'registered-shift';
          } else if (isDateAssigned(date)) {
            return 'assigned-shift';
          }
        }
        return null;
      };

      const getShiftsForDay = () => {
        return shifts.filter(
          (shift) => shift.date === selectedDate?.toLocaleDateString()
        );
      };

      return (
        <div className="employee-portal">
          <h1>Employee Portal</h1>
          <div className="calendar-container">
            <Calendar
              onChange={handleDateChange}
              value={date}
              onClickDay={(value) => handleDateChange(value)}
              tileClassName={tileClassName}
            />
          </div>

          {selectedDate && (
            <div className="shift-info">
              <h2>
                {isDateAssigned(selectedDate)
                  ? 'Open Shifts'
                  : 'No Shifts Available'}
              </h2>
              {getShiftsForDay().map((shift) => (
                <div key={shift.id}>
                  <p>
                    {shift.shiftType.charAt(0).toUpperCase() +
                      shift.shiftType.slice(1)} Shift:
                  </p>
                  {!shift.requests?.includes(employeeId) && (
                    <button onClick={() => handleRequestShift(shift)}>
                      Submit
                    </button>
                  )}
                  {submitStatus[shift.id] === 'submitting' && (
                    <span className="submit-status">Submitting...</span>
                  )}
                  {submitStatus[shift.id] === 'submitted' && (
                    <span className="submit-status success">Submitted!</span>
                  )}
                  {submitStatus[shift.id] === 'error' && (
                    <span className="submit-status error">Error!</span>
                  )}
                </div>
              ))}
              {shiftRequest && (
                <p>
                  Shift requested for: {shiftRequest.toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          <div className="assigned-shifts">
            <h2>Registered Shifts</h2>
            <ul>
              {registeredShifts.map((shift, index) => (
                <li key={index}>
                  {shift}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    export default EmployeePortal;

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './ManagerPortal.css';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  arrayRemove,
} from 'firebase/firestore';

function ManagerPortal() {
  const [date, setDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
  });
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [shiftQueue, setShiftQueue] = useState([]);
  const restaurantId = sessionStorage.getItem('restaurantId');
  const [fullyStaffedDays, setFullyStaffedDays] = useState({});

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

      const employeesRef = collection(
        db,
        'restaurants',
        restaurantId,
        'employees'
      );
      const unsubscribeEmployees = onSnapshot(employeesRef, (snapshot) => {
        const employeesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployees(employeesData);
      });

      return () => {
        unsubscribeShifts();
        unsubscribeEmployees();
      };
    }
  }, [restaurantId]);

  useEffect(() => {
    if (shifts.length > 0 && employees.length > 0) {
      const queue = [];
      shifts.forEach((shift) => {
        if (shift.requests && shift.requests.length > 0) {
          shift.requests.forEach((employeeId) => {
            const employee = employees.find((emp) => emp.id === employeeId);
            if (employee) {
              queue.push({
                employeeName: `${employee.firstName} ${employee.lastName}`,
                employeeId: employeeId,
                date: shift.date,
                shiftType: shift.shiftType,
                shiftId: shift.id,
              });
            }
          });
        }
      });

      // Sort the queue by date and then by shift type
      queue.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        const shiftOrder = { morning: 1, noon: 2, evening: 3 };
        return shiftOrder[a.shiftType] - shiftOrder[b.shiftType];
      });

      setShiftQueue(queue);

      // Calculate fully staffed days
      const staffedDays = {};
      shifts.forEach((shift) => {
        if (!staffedDays[shift.date]) {
          staffedDays[shift.date] = { needed: 0, assigned: 0 };
        }
        staffedDays[shift.date].needed += shift.neededEmployees;
        staffedDays[shift.date].assigned += shift.assignedEmployees ? shift.assignedEmployees.length : 0;
      });

      const fullyStaffed = Object.keys(staffedDays).reduce((acc, date) => {
        acc[date] = staffedDays[date].needed > 0 && staffedDays[date].needed === staffedDays[date].assigned;
        return acc;
      }, {});
      setFullyStaffedDays(fullyStaffed);
    }
  }, [shifts, employees]);

  const handleDateChange = (date) => {
    setDate(date);
    setSelectedDate(date);
    setIsModalOpen(true);
    setSelectedShifts(
      shifts.filter((shift) => shift.date === date.toLocaleDateString())
    );
    setIsEditing(false);
  };

  const openModal = (date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
    setSelectedShifts(
      shifts.filter((shift) => shift.date === date.toLocaleDateString())
    );
    setIsEditing(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedShifts([]);
    setIsEditing(false);
  };

  const handleAddShift = async (shiftType, employeesNeeded) => {
    if (selectedDate && shiftType && employeesNeeded !== undefined) {
      const shiftsRef = collection(
        db,
        'restaurants',
        restaurantId,
        'shifts'
      );
      try {
        await addDoc(shiftsRef, {
          date: selectedDate.toLocaleDateString(),
          shiftType: shiftType,
          neededEmployees: parseInt(employeesNeeded, 10),
          assignedEmployees: [],
          requests: [],
        });
      } catch (error) {
        console.error('Error adding shift:', error);
      }
    }
  };

  const handleAddEmployee = async () => {
    if (
      newEmployee.firstName &&
      newEmployee.lastName &&
      newEmployee.username &&
      newEmployee.password
    ) {
      const employeesRef = collection(
        db,
        'restaurants',
        restaurantId,
        'employees'
      );
      try {
        await addDoc(employeesRef, newEmployee);
        setNewEmployee({
          firstName: '',
          lastName: '',
          username: '',
          password: '',
        });
      } catch (error) {
        console.error('Error adding employee:', error);
      }
    }
  };

  const handleUpdateShift = async (shift) => {
    const shiftsRef = collection(
      db,
      'restaurants',
      restaurantId,
      'shifts'
    );
    const shiftDocRef = doc(shiftsRef, shift.id);
    try {
      await updateDoc(shiftDocRef, {
        ...shift,
      });
    } catch (error) {
      console.error('Error updating shift:', error);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    const shiftsRef = collection(
      db,
      'restaurants',
      restaurantId,
      'shifts'
    );
    const shiftDocRef = doc(shiftsRef, shiftId);
    try {
      await deleteDoc(shiftDocRef);
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const handleSaveAllShifts = async () => {
    for (const shift of selectedShifts) {
      if (shift.id && shift.id !== 'morning' && shift.id !== 'noon' && shift.id !== 'evening') {
        if (shift.neededEmployees === 0) {
          await handleDeleteShift(shift.id);
        } else {
          await handleUpdateShift(shift);
        }
      } else if (shift.neededEmployees > 0) {
        await handleAddShift(shift.shiftType, shift.neededEmployees);
      }
    }
    closeModal();
  };

  const handleShiftChange = (shiftId, field, value) => {
    setSelectedShifts((prevShifts) =>
      prevShifts.map((shift) =>
        shift.id === shiftId ? { ...shift, [field]: value } : shift
      )
    );
  };

  const handleEditClick = () => {
    setIsEditing(true);
    if (selectedShifts.length === 0) {
      const initialShifts = [
        { shiftType: 'morning', neededEmployees: 0, id: 'morning', assignedEmployees: [] },
        { shiftType: 'noon', neededEmployees: 0, id: 'noon', assignedEmployees: [] },
        { shiftType: 'evening', neededEmployees: 0, id: 'evening', assignedEmployees: [] },
      ];
      setSelectedShifts(initialShifts);
    }
  };

  const handleAcceptShift = async (shiftRequest) => {
    const shiftDocRef = doc(
      db,
      'restaurants',
      restaurantId,
      'shifts',
      shiftRequest.shiftId
    );
    try {
      const shiftDoc = await getDoc(shiftDocRef);
      if (shiftDoc.exists()) {
        const shiftData = shiftDoc.data();
        const updatedAssignedEmployees = shiftData.assignedEmployees ? [...shiftData.assignedEmployees, shiftRequest.employeeId] : [shiftRequest.employeeId];
        await updateDoc(shiftDocRef, {
          assignedEmployees: updatedAssignedEmployees,
          requests: arrayRemove(shiftRequest.employeeId),
        });
        setShiftQueue((prevQueue) =>
          prevQueue.filter(
            (item) =>
              !(
                item.employeeId === shiftRequest.employeeId &&
                item.shiftId === shiftRequest.shiftId
              )
          )
        );
        setShifts((prevShifts) =>
          prevShifts.map((shift) =>
            shift.id === shiftRequest.shiftId
              ? { ...shift, assignedEmployees: updatedAssignedEmployees, requests: shift.requests.filter(id => id !== shiftRequest.employeeId) }
              : shift
          )
        );
        setSelectedShifts((prevShifts) =>
          prevShifts.map((shift) =>
            shift.id === shiftRequest.shiftId
              ? { ...shift, assignedEmployees: updatedAssignedEmployees }
              : shift
          )
        );
      }
    } catch (error) {
      console.error('Error accepting shift:', error);
    }
  };

  const handleDeleteShiftRequest = async (shiftRequest) => {
    const shiftDocRef = doc(
      db,
      'restaurants',
      restaurantId,
      'shifts',
      shiftRequest.shiftId
    );
    try {
      await updateDoc(shiftDocRef, {
        requests: arrayRemove(shiftRequest.employeeId),
      });
      setShiftQueue((prevQueue) =>
        prevQueue.filter(
          (item) =>
            !(
              item.employeeId === shiftRequest.employeeId &&
              item.shiftId === shiftRequest.shiftId
            )
        )
      );
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === shiftRequest.shiftId
            ? { ...shift, requests: shift.requests.filter(id => id !== shiftRequest.employeeId) }
            : shift
        )
      );
    } catch (error) {
      console.error('Error deleting shift request:', error);
    }
  };

  const handleRemoveEmployee = async (shiftId, employeeId) => {
    const shiftDocRef = doc(
      db,
      'restaurants',
      restaurantId,
      'shifts',
      shiftId
    );
    try {
      const shiftDoc = await getDoc(shiftDocRef);
      if (shiftDoc.exists()) {
        const shiftData = shiftDoc.data();
        const updatedAssignedEmployees = shiftData.assignedEmployees.filter(id => id !== employeeId);
        await updateDoc(shiftDocRef, {
          assignedEmployees: updatedAssignedEmployees,
        });
        setShifts((prevShifts) =>
          prevShifts.map((shift) =>
            shift.id === shiftId
              ? { ...shift, assignedEmployees: updatedAssignedEmployees }
              : shift
          )
        );
        setSelectedShifts((prevShifts) =>
          prevShifts.map((shift) =>
            shift.id === shiftId
              ? { ...shift, assignedEmployees: updatedAssignedEmployees }
              : shift
          )
        );
      }
    } catch (error) {
      console.error('Error removing employee:', error);
    }
  };

  const isDateAssigned = (date) => {
    return shifts.some((shift) => shift.date === date.toLocaleDateString());
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      let className = isDateAssigned(date) ? 'assigned-shift' : '';
      if (fullyStaffedDays[date.toLocaleDateString()]) {
        className = 'fully-staffed';
      }
      return className;
    }
    return null;
  };

  return (
    <div className="manager-portal">
      <h1>Manager Portal</h1>
      <div className="calendar-container">
        <Calendar
          onChange={handleDateChange}
          value={date}
          onClickDay={(value) => openModal(value)}
          tileClassName={tileClassName}
        />
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeModal}>
              &times;
            </span>
            <h2>Shifts for {selectedDate?.toLocaleDateString()}</h2>
            {selectedShifts.map((shift, index) => (
              <div key={index} className="shift-item">
                <div className="form-group">
                  <label>
                    {shift.shiftType.charAt(0).toUpperCase() +
                      shift.shiftType.slice(1)} Shift:
                  </label>
                  <input
                    type="number"
                    value={shift.neededEmployees}
                    onChange={(e) =>
                      handleShiftChange(
                        shift.id,
                        'neededEmployees',
                        parseInt(e.target.value, 10)
                      )
                    }
                    disabled={!isEditing}
                  />
                  {shift.assignedEmployees && shift.assignedEmployees.length > 0 && (
                    <div>
                      <h4>Assigned Employees:</h4>
                      <ul>
                        {shift.assignedEmployees.map((employeeId) => {
                          const employee = employees.find((emp) => emp.id === employeeId);
                          return employee ? (
                            <li key={employeeId}>
                              {employee.firstName} {employee.lastName}
                              <button onClick={() => handleRemoveEmployee(shift.id, employeeId)}>-</button>
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!isEditing ? (
              <button onClick={handleEditClick}>Edit</button>
            ) : (
              <button onClick={handleSaveAllShifts}>Save All Shifts</button>
            )}
          </div>
        </div>
      )}

      <div className="employee-management">
        <h2>Employee Management</h2>
        <table className="employee-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Username</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.firstName}</td>
                <td>{employee.lastName}</td>
                <td>{employee.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="add-employee-form">
          <h3>Add New Employee</h3>
          <input
            type="text"
            placeholder="First Name"
            value={newEmployee.firstName}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, firstName: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newEmployee.lastName}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, lastName: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Username"
            value={newEmployee.username}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, username: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Password"
            value={newEmployee.password}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, password: e.target.value })
            }
          />
          <button onClick={handleAddEmployee}>Add Employee</button>
        </div>
      </div>

      <div className="shift-queue">
        <h2>Shift Requests</h2>
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Shift Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shiftQueue.map((item, index) => (
              <tr key={index}>
                <td>{item.employeeName}</td>
                <td>{item.date}</td>
                <td>{item.shiftType}</td>
                <td>
                  <button onClick={() => handleAcceptShift(item)}>Accept</button>
                  <button onClick={() => handleDeleteShiftRequest(item)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManagerPortal;

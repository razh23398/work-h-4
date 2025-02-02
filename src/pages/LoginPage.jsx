import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import './LoginPage.css';

function LoginPage() {
  const [restaurantCode, setRestaurantCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');

    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(
        restaurantsRef,
        where('restaurantCode', '==', restaurantCode)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLoginError('Invalid restaurant code.');
        return;
      }

      const restaurantDoc = querySnapshot.docs[0];
      const restaurantId = restaurantDoc.id;
      const restaurantData = restaurantDoc.data();

      if (role === 'manager') {
        const managerUsername = restaurantData.manager?.username?.trim().toLowerCase();
        const managerPassword = restaurantData.manager?.password?.trim().toLowerCase();
        const enteredUsername = username.trim().toLowerCase();
        const enteredPassword = password.trim().toLowerCase();

        console.log('Manager Login Attempt:', {
          enteredUsername,
          enteredPassword,
          managerUsername,
          managerPassword,
        });

        if (
          managerUsername === enteredUsername &&
          managerPassword === enteredPassword
        ) {
          sessionStorage.setItem('restaurantId', restaurantId);
          sessionStorage.setItem('userRole', 'manager');
          sessionStorage.setItem('username', username);
          navigate('/manager');
        } else {
          setLoginError('Invalid manager credentials.');
        }
      } else if (role === 'employee') {
        const employeesRef = collection(
          db,
          'restaurants',
          restaurantId,
          'employees'
        );
        const enteredUsername = username.trim().toLowerCase();
        const enteredPassword = password.trim().toLowerCase();
        const employeeQuery = query(
          employeesRef,
          where('username', '==', enteredUsername),
          where('password', '==', enteredPassword)
        );
        const employeeSnapshot = await getDocs(employeeQuery);

        console.log('Employee Login Attempt:', {
          enteredUsername,
          enteredPassword,
        });

        if (!employeeSnapshot.empty) {
          sessionStorage.setItem('restaurantId', restaurantId);
          sessionStorage.setItem('userRole', 'employee');
          sessionStorage.setItem('username', username);
          navigate('/employee');
        } else {
          setLoginError('Invalid employee credentials.');
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      setLoginError('An error occurred during login.');
    }
  };

  return (
    <div className="login-page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Restaurant Code:</label>
          <input
            type="text"
            value={restaurantCode}
            onChange={(e) => setRestaurantCode(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        {loginError && <p className="error-message">{loginError}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;

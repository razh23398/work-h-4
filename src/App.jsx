import React from 'react';
    import { Routes, Route } from 'react-router-dom';
    import ManagerPortal from './pages/ManagerPortal';
    import EmployeePortal from './pages/EmployeePortal';
    import LoginPage from './pages/LoginPage';

    function App() {
      return (
        <Routes>
          <Route path="/manager" element={<ManagerPortal />} />
          <Route path="/employee" element={<EmployeePortal />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      );
    }

    export default App;

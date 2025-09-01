import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LoginPage } from './auth/AuthPages';
import ProtectedRoute from './auth/ProtectedRoute';
import InstallmentTrackerApp from '../InstallmentTrackerApp';
import LogoutButton from './auth/LogoutButton';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <div className="relative">
                <div className="absolute top-4 right-4">
                  <LogoutButton />
                </div>
                <InstallmentTrackerApp />
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
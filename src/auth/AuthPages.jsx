import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useAuth } from './AuthContext';

export const LoginPage = () => {
  const { currentUser } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  
  // If user is already logged in, redirect to home
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          Installment Tracker
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {showRegister ? (
          <>
            <RegisterForm onRegisterSuccess={() => setShowRegister(false)} />
            <div className="mt-4 text-center">
              <button 
                onClick={() => setShowRegister(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                Already have an account? Login
              </button>
            </div>
          </>
        ) : (
          <>
            <LoginForm onLoginSuccess={() => {}} />
            <div className="mt-4 text-center">
              <button 
                onClick={() => setShowRegister(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                Need an account? Register
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
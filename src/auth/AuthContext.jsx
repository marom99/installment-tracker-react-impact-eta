import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Mock user data for demonstration
const MOCK_USERS = [
  { id: 1, username: 'admin', password: 'password', name: 'Administrator' },
  { id: 2, username: 'user', password: 'password', name: 'Regular User' },
];

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check for saved user on initial load
  useEffect(() => {
    const savedUser = localStorage.getItem('authUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('authUser');
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = (username, password) => {
    setError('');
    const user = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      // Remove password from stored user object
      const { password, ...userWithoutPassword } = user;
      setCurrentUser(userWithoutPassword);
      localStorage.setItem('authUser', JSON.stringify(userWithoutPassword));
      return true;
    } else {
      setError('Invalid username or password');
      return false;
    }
  };

  // Register function (for mock purposes)
  const register = (username, password, name) => {
    setError('');
    // Check if username already exists
    if (MOCK_USERS.some((u) => u.username === username)) {
      setError('Username already exists');
      return false;
    }

    // In a real app, you would send this to a server
    // For this mock version, we'll just pretend it worked
    const newUser = {
      id: MOCK_USERS.length + 1,
      username,
      name,
    };

    setCurrentUser(newUser);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    return true;
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('authUser');
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
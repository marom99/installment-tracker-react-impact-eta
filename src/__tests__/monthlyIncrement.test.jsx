import React from 'react';
import { render, screen } from '@testing-library/react';
import InstallmentTrackerApp from '../../InstallmentTrackerApp.jsx';

const STORAGE_KEY = 'installments-v4';

// Save the original Date constructor
const RealDate = Date;

// Mock function to set a specific date
function mockDate(isoDate) {
  global.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate(isoDate);
      }
      return new RealDate(...args);
    }
    static now() {
      return new RealDate(isoDate).getTime();
    }
  };
}

// Restore the original Date constructor
function restoreDate() {
  global.Date = RealDate;
}

describe('Monthly Increment Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    restoreDate();
  });

  afterEach(() => {
    restoreDate();
  });

  test('months paid should increment on the first day of a new month', () => {
    // Setup: Create an installment with specific months paid
    const initialInstallment = [
      { 
        id: '1', 
        bank: 'TestBank', 
        transaction: 'Monthly Test', 
        monthlyPayment: 1000, 
        monthsPaid: 3, 
        totalMonths: 12, 
        note: '' 
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialInstallment));
    
    // Mock the date to be the first day of a month
    mockDate('2023-08-01T12:00:00Z');
    
    // Render the app with the mocked date
    render(<InstallmentTrackerApp />);
    
    // Get the localStorage data to verify the value was updated
    const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(storedData[0].monthsPaid).toBe(4);
  });

  test('months paid should not increment on days other than the first of the month', () => {
    // Setup: Create an installment with specific months paid
    const initialInstallment = [
      { 
        id: '1', 
        bank: 'TestBank', 
        transaction: 'Monthly Test', 
        monthlyPayment: 1000, 
        monthsPaid: 3, 
        totalMonths: 12, 
        note: '' 
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialInstallment));
    
    // Mock the date to be the second day of a month
    mockDate('2023-08-02T12:00:00Z');
    
    // Render the app with the mocked date
    render(<InstallmentTrackerApp />);
    
    // Get the localStorage data to verify the value was not updated
    const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(storedData[0].monthsPaid).toBe(3);
  });

  test('months paid should not exceed total months', () => {
    // Setup: Create an installment with months paid almost at the limit
    const initialInstallment = [
      { 
        id: '1', 
        bank: 'TestBank', 
        transaction: 'Monthly Test', 
        monthlyPayment: 1000, 
        monthsPaid: 11, 
        totalMonths: 12, 
        note: '' 
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialInstallment));
    
    // Mock the date to be the first day of a month
    mockDate('2023-08-01T12:00:00Z');
    
    // Render the app with the mocked date
    render(<InstallmentTrackerApp />);
    
    // Get the localStorage data to verify the value was updated to the maximum
    const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(storedData[0].monthsPaid).toBe(12);
    
    // Clear localStorage and set up a new test with already maxed out months
    localStorage.clear();
    const maxedOutInstallment = [
      { 
        id: '1', 
        bank: 'TestBank', 
        transaction: 'Monthly Test', 
        monthlyPayment: 1000, 
        monthsPaid: 12, 
        totalMonths: 12, 
        note: '' 
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maxedOutInstallment));
    
    // Mock the date to be the first day of another month
    mockDate('2023-09-01T12:00:00Z');
    
    // Render the app with the mocked date
    render(<InstallmentTrackerApp />);
    
    // Get the localStorage data to verify the value was not updated beyond the maximum
    const finalStoredData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(finalStoredData[0].monthsPaid).toBe(12);
  });
});
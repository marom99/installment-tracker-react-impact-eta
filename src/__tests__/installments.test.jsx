import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallmentTrackerApp from '../../InstallmentTrackerApp.jsx';

const STORAGE_KEY = 'installments-v4';

// Save the original Date constructor
const RealDate = Date;

beforeEach(() => {
  localStorage.clear();
  // Restore the original Date constructor
  global.Date = RealDate;
});

test('adds an installment', () => {
  localStorage.setItem(STORAGE_KEY, '[]');
  render(<InstallmentTrackerApp />);
  // Use a more specific selector for the Add Installment button
  const addButton = screen.getByRole('button', { name: /Add Installment/i });
  fireEvent.click(addButton);
  fireEvent.change(screen.getByLabelText(/Bank/i), { target: { value: 'BankA' } });
  fireEvent.change(screen.getByLabelText(/Transaction/i), { target: { value: 'New Purchase' } });
  fireEvent.change(screen.getByLabelText(/Monthly Payment/i), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText(/Total Months/i), { target: { value: '12' } });
  // Use a more specific selector for the Save button
  const saveButton = screen.getByRole('button', { name: /Save/i });
  fireEvent.click(saveButton);
  expect(screen.getByText('New Purchase')).toBeInTheDocument();
});

test('edits an installment', () => {
  const row = [{ id: '1', bank: 'BankA', transaction: 'Old', monthlyPayment: 1000, monthsPaid: 0, totalMonths: 12, note: '' }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(row));
  render(<InstallmentTrackerApp />);
  // Use a more specific selector for the Edit button
  const editButtons = screen.getAllByRole('button', { name: /Edit/i });
  fireEvent.click(editButtons[0]);
  const txInput = screen.getByLabelText(/Transaction/i);
  fireEvent.change(txInput, { target: { value: 'Updated' } });
  // Use a more specific selector for the Save button
  const saveButton = screen.getByRole('button', { name: /Save/i });
  fireEvent.click(saveButton);
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

test('deletes an installment', () => {
  const row = [{ id: '1', bank: 'BankA', transaction: 'DeleteMe', monthlyPayment: 1000, monthsPaid: 0, totalMonths: 12, note: '' }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(row));
  render(<InstallmentTrackerApp />);
  // Use a more specific selector for the Delete button
  const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
  fireEvent.click(deleteButtons[0]);
  expect(screen.queryByText('DeleteMe')).not.toBeInTheDocument();
});

test('filters installments by bank', () => {
  const rows = [
    { id: '1', bank: 'BankA', transaction: 'From A', monthlyPayment: 1000, monthsPaid: 0, totalMonths: 12, note: '' },
    { id: '2', bank: 'BankB', transaction: 'From B', monthlyPayment: 1000, monthsPaid: 0, totalMonths: 12, note: '' }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  render(<InstallmentTrackerApp />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'BankA' } });
  expect(screen.getByText('From A')).toBeInTheDocument();
  expect(screen.queryByText('From B')).not.toBeInTheDocument();
});

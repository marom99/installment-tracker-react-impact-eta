import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallmentTrackerApp from '../../installment_tracker_react_impact_finish_eta (1).jsx';

const STORAGE_KEY = 'installments-v4';

beforeEach(() => {
  localStorage.clear();
});

test('adds an installment', () => {
  localStorage.setItem(STORAGE_KEY, '[]');
  render(<InstallmentTrackerApp />);
  fireEvent.click(screen.getByText(/Add Installment/i));
  fireEvent.change(screen.getByLabelText(/Bank/i), { target: { value: 'BankA' } });
  fireEvent.change(screen.getByLabelText(/Transaction/i), { target: { value: 'New Purchase' } });
  fireEvent.change(screen.getByLabelText(/Monthly Payment/i), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText(/Total Months/i), { target: { value: '12' } });
  fireEvent.click(screen.getByText(/Save/i));
  expect(screen.getByText('New Purchase')).toBeInTheDocument();
});

test('edits an installment', () => {
  const row = [{ id: '1', bank: 'BankA', transaction: 'Old', monthlyPayment: 1000, monthsPaid: 0, totalMonths: 12, note: '' }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(row));
  render(<InstallmentTrackerApp />);
  fireEvent.click(screen.getByText(/Edit/i));
  const txInput = screen.getByLabelText(/Transaction/i);
  fireEvent.change(txInput, { target: { value: 'Updated' } });
  fireEvent.click(screen.getByText(/Save/i));
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

test('deletes an installment', () => {
  const row = [{ id: '1', bank: 'BankA', transaction: 'DeleteMe', monthlyPayment: 1000, monthsPaid: 0, totalMonths: 12, note: '' }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(row));
  render(<InstallmentTrackerApp />);
  fireEvent.click(screen.getByText(/Delete/i));
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

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InstallmentTrackerApp from '../../InstallmentTrackerApp.jsx';

// Mock localStorage
const STORAGE_KEY = 'installments-v4';

beforeEach(() => {
  localStorage.clear();
});

describe('AddEditForm Validation', () => {
  beforeEach(() => {
    // Start with an empty dataset and open the form
    localStorage.setItem(STORAGE_KEY, '[]');
    render(<InstallmentTrackerApp />);
    const addButton = screen.getByRole('button', { name: /Add Installment/i });
    fireEvent.click(addButton);
  });

  test('Save button is disabled initially', () => {
    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled();
  });

  test('Save button is disabled if only some required fields are filled', () => {
    fireEvent.change(screen.getByLabelText(/Bank/i), { target: { value: 'BankC' } });
    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled();
  });

  test('Save button becomes enabled when all required fields are valid', () => {
    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled(); // Check initial state

    fireEvent.change(screen.getByLabelText(/Bank/i), { target: { value: 'BankC' } });
    fireEvent.change(screen.getByLabelText(/Transaction/i), { target: { value: 'Valid Purchase' } });
    fireEvent.change(screen.getByLabelText(/Monthly Payment/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/Total Months/i), { target: { value: '10' } });

    expect(saveButton).not.toBeDisabled();
  });

  test('shows validation error when a required field is touched and then cleared', async () => {
    const bankInput = screen.getByLabelText(/Bank/i);
    fireEvent.change(bankInput, { target: { value: 'My Bank' } }); // fill it
    fireEvent.blur(bankInput); // touch it
    fireEvent.change(bankInput, { target: { value: '' } }); // clear it

    // Error message should appear
    const errorMessage = await screen.findByText('Bank is required.');
    expect(errorMessage).toBeInTheDocument();

    // Save button should be disabled again
    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled();
  });

  test('does not show validation error for untouched fields', () => {
    // The form is rendered, but no fields are touched.
    // The error message for "Bank is required." should not be visible.
    const errorMessage = screen.queryByText('Bank is required.');
    expect(errorMessage).not.toBeInTheDocument();
  });

  test('hides validation error when the field is corrected', async () => {
    const bankInput = screen.getByLabelText(/Bank/i);
    fireEvent.change(bankInput, { target: { value: '' } });
    fireEvent.blur(bankInput);

    // Error message should appear
    let errorMessage = await screen.findByText('Bank is required.');
    expect(errorMessage).toBeInTheDocument();

    // Correct the input
    fireEvent.change(bankInput, { target: { value: 'My Bank' } });

    // The error message should disappear
    errorMessage = screen.queryByText('Bank is required.');
    expect(errorMessage).not.toBeInTheDocument();
  });
});

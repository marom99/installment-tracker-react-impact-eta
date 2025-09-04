# Installment Tracker

This is a comprehensive React application designed to help you track your financial installments (known as *cicilan* in Indonesian). It provides a clear overview of your monthly commitments, remaining payments, and offers valuable insights into your spending habits.

## Features

*   **CRUD Operations**: Easily **Add, Edit, and Delete** installment records.
*   **Detailed Tracking**: Keep track of the **Bank**, **Transaction Details**, **Monthly Payment**, **Total Months**, and **Months Paid**.
*   **Data Persistence**: Your data is automatically saved in your browser's **localStorage**.
*   **Interactive Table**:
    *   **Group by Bank**: View your installments neatly grouped by the lending bank.
    *   **Search & Filter**: Quickly find transactions or filter by a specific bank.
    *   **Hide Completed**: Focus on active installments by hiding those that are fully paid.
    *   **Sortable Columns**: Sort your installments by any column to customize your view.
*   **Quick Actions**:
    *   **Pay 1 Month**: A convenient button to mark one month as paid for any installment.
    *   **Add Notes**: Attach notes to any installment for reminders or additional details.
*   **Data Management**:
    *   **Import/Export CSV**: Easily back up your data or import it from a CSV file.
*   **Financial Insights**:
    *   **Snapshot**: Get a clear picture of your total monthly burden, outstanding debt, and a breakdown of your payments by bank and merchant.
    *   **Cash-flow Relief**: A timeline that projects how your monthly financial burden will decrease as you pay off your installments.
*   **Add/Edit Form with Impact Analysis**: The form for adding or editing an installment shows you the immediate impact on your monthly payments and calculates the estimated finish date (ETA).
*   **Automatic Payment Tracking**: The application automatically increments the "months paid" count on the first day of each month for all active installments.
*   **Authentication**: The application is protected by a login system, ensuring that your financial data remains private and secure.

## Tech Stack

*   **Frontend**: [React](https://reactjs.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/)
*   **Testing**: [Jest](https://jestjs.io/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
*   **Routing**: [React Router](https://reactrouter.com/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) (or [Yarn](https://yarnpkg.com/)) installed on your machine.

### Installation

1.  Clone the repository to your local machine:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd installment-tracker-react-impact-eta
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To start the development server, run the following command:

```bash
npm run dev
```

This will start the application in development mode. Open [http://localhost:5173](http://localhost:5173) (the port may vary, check your terminal output) to view it in the browser.

### Running Tests

To run the test suite, use the following command:

```bash
npm run test
```

This will launch the test runner in interactive watch mode.

## Usage

1.  **Login/Register**: Since the app uses authentication, you will need to register for an account or log in to access the tracker.
2.  **Add Your Installments**: Use the "Add Installment" button to open the form. Fill in the details of your installment plan. The form will show you the impact on your monthly budget and the estimated completion date.
3.  **Track Your Progress**: The main table displays all your active installments. You can see how many months are left and what your remaining balance is for each.
4.  **Update Payments**: After making a monthly payment, click the "Pay 1" button to update the "Months Paid" count.
5.  **Use Insights**: Navigate to the "Insights" tab to get a deeper understanding of your finances.
    *   **Snapshot**: See your total monthly commitment and how it's distributed among different banks and merchants.
    *   **Cash-flow Relief**: See a month-by-month projection of how your payments will decrease, helping you plan for the future.

## Data Management

### Local Storage

This application uses your browser's `localStorage` to store all your installment data. This means your data is persistent on your machine but is not stored on a remote server. Clearing your browser's site data will erase your installment records.

### Import/Export CSV

You can back up your data by exporting it as a CSV file using the "Export CSV" button. You can also import data from a CSV file, which is useful for restoring your data or migrating from another tool.

The CSV file should have the following columns: `bank`, `transaction`, `monthlyPayment`, `monthsPaid`, `totalMonths`, and `note`.

## Authentication

The installment tracker is protected by an authentication system. You must log in to access and manage your financial data. This ensures that your information remains private and secure. The main application is a protected route, and you will be redirected to the login page if you are not authenticated.

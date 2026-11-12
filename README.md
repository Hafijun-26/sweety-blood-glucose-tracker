# Sweety – Blood Glucose Tracker

A full-stack web application that helps users securely record, manage, and monitor their daily blood glucose readings.

## Features

- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- Add, view, update, and delete glucose readings
- Four daily reading slots:
  - Morning fasting
  - After breakfast
  - After lunch
  - After dinner
- Glucose value validation (40–600 mg/dl)
- Date validation (future dates are not allowed)
- One reading per slot per day
- User-specific data privacy
- Daily glucose reports
- Month-to-date reports
- Previous-month reports
- Highest, lowest, average, and total reading count
- Responsive dashboard for desktop and mobile

## Tech Stack

- **Frontend:** React, Vite, HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT, bcrypt
- **Tools:** VS Code, Postman, Git

## Project Structure

```text
sweety-blood-glucose-tracker/
├── client/
│   └── src/
├── server/
│   ├── middleware/
│   ├── routes/
│   ├── db.js
│   ├── index.js
│   ├── seed.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

Install these before running the application:

- Node.js and npm
- PostgreSQL
- Git

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/hafijun-26/sweety-blood-glucose-tracker.git
cd sweety-blood-glucose-tracker
```

### 2. Create the PostgreSQL database

Open PostgreSQL terminal and run:

```sql
CREATE DATABASE sweety_db;
```

Connect to the database:

```sql
\c sweety_db
```

Create the users table:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

Create the glucose readings table:

```sql
CREATE TABLE glucose_readings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    slot VARCHAR(30) NOT NULL CHECK (
        slot IN (
            'Morning fasting',
            'After breakfast',
            'After lunch',
            'After dinner'
        )
    ),
    glucose_value INTEGER NOT NULL CHECK (
        glucose_value BETWEEN 40 AND 600
    ),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, reading_date, slot)
);
```

### 3. Configure the backend

Open the server folder:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create a `.env` file by copying `.env.example`.

Update the database password and JWT secret with your own local values.

Example configuration:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sweety_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_secret_key
```

Never upload your actual `.env` file or expose your secrets on GitHub.

### 4. Add demo data

Run this command from the server folder:

```bash
node seed.js
```

This creates a demo account and four sample glucose readings.

**Demo login:**

- Email: demo@sweety.com
- Password: Demo@123

### 5. Start the backend

From the server folder:

```bash
node index.js
```

Backend URL:

`http://localhost:5000`

### 6. Start the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the URL displayed by Vite, usually:

`http://localhost:5173`

## API Endpoints

Protected endpoints require a valid JWT bearer token.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login a user |

### Glucose Readings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/glucose` | Add a reading |
| GET | `/api/glucose` | Get all readings |
| GET | `/api/glucose/:id` | Get one reading |
| PUT | `/api/glucose/:id` | Update a reading |
| DELETE | `/api/glucose/:id` | Delete a reading |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | Month-to-date report |
| GET | `/api/reports/monthly` | Previous calendar month report |

## Testing

Backend APIs can be tested using Postman.

For protected endpoints, include this header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

Test registration, login, reading CRUD operations, validation, and reports.

## Security and Data Privacy

- Passwords are stored as bcrypt hashes.
- JWT authentication protects private APIs.
- Users can access only their own glucose readings.
- Database queries use parameterized values.
- Environment variables are excluded from Git.

## Assumptions and Future Improvements

- Each user can record one reading for each of the four predefined slots per day.
- Glucose values are recorded in mg/dl.
- Reports contain only the logged-in user's readings.
- Future improvements may include charts, pagination, automated tests, and Docker support.

## Author

Sweety Blood Glucose Tracker – Full Stack Developer Assignment.
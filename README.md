<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# MediConnect BD 2.0

**An AI-Powered, Real-Time Healthcare Management Platform for Bangladesh**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-^19-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-^5.8-blue.svg)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-010101.svg)](https://socket.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg)](https://www.mysql.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Real-Time Functionality](#-real-time-functionality)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Deployment Roadmap](#-deployment-roadmap)
- [Contributing](#-contributing)

---

## 🏥 Overview

**MediConnect BD 2.0** is a full-stack, real-time healthcare platform designed to modernize medical services in Bangladesh. It connects patients, doctors, and hospital administrators in a seamless, interactive digital ecosystem. The platform's core functionalities include AI-powered assistance, real-time notifications, comprehensive appointment management, multi-role user portals, medical document handling, and emergency service access.

This repository represents a significant architectural and functional upgrade, moving from a monolithic proof-of-concept to a scalable, secure, and feature-rich application ready for future expansion to mobile and advanced AI services.

---

## 🚀 Live Demo

*(Placeholder for deployed application link and credentials)*

**Test Users:**
| Role | Email | Password |
| :--- | :--- | :--- |
| Patient | `patient@test.com` | `password123` |
| Doctor | `doctor@test.com` | `password123` |
| Admin | `admin@test.com` | `password123` |
| Super Admin | `superadmin@test.com` | `password123` |

---

## ✨ Key Features

### Core Patient Features
- 🔐 **Secure Authentication**: JWT-based authentication with role-based access control (RBAC).
- 👤 **User Profile Management**: Update personal information and manage account settings.
- 👨‍⚕️ **Doctor Discovery**: Search and view detailed doctor profiles.
- 📅 **Appointment Booking**: Real-time appointment scheduling with doctors.
- 📄 **Medical Document Management**: Upload, view, download, and manage medical records (prescriptions, lab reports, X-rays).
- 🔔 **Real-Time Notifications**: Instant updates for appointment confirmations, queue changes, and new documents.
- ⭐ **Doctor Reviews & Ratings**: Provide feedback on consultations.
- 🚑 **Emergency Services**: Quick access to emergency contacts and services.
- 🤖 **AI Chatbot**: Integrated with Google's Gemini for health inquiries.

### Doctor Portal
-  Dashboard with appointment summaries and patient queue.
- Manage appointment schedules and availability.
- View and manage patient medical history and documents.
- Update live patient queue status.
- Securely communicate with patients (future feature).

### Admin & Super Admin Portals
- Comprehensive user management (patients, doctors, admins).
- System analytics and reporting.
- Role and permission management.
- Platform configuration and settings.

---

## 🏗️ System Architecture

The system employs a **decoupled, 3-Tier Architecture** to ensure security, scalability, and support for multiple clients (web and future mobile apps).

```mermaid
graph TD;
    subgraph Clients
        A[Web Frontend <br> React+Vite]
        B[Mobile App <br> Flutter (Future)]
    end

    subgraph "Backend Services"
        C[API Server <br> Express.js/Node.js]
        D[WebSocket Server <br> Socket.IO]
    end

    subgraph "Data & Storage Layer"
        E[Database <br> MySQL]
        F[File Storage <br> Local/S3]
    end

    A -- "REST API (HTTPS/JSON)" --> C;
    A -- "WebSocket (WSS)" --> D;
    B -- "REST API (HTTPS/JSON)" --> C;
    B -- "WebSocket (WSS)" --> D;
    
    C -- "Business Logic" --> C;
    C <--> E;
    C -- "Triggers Notifications" --> D;
    C <--> F;

    D -- "Real-Time Events" --> A;
    D -- "Real-Time Events" --> B;
```

### Architectural Advantages
- ✅ **Decoupling**: Frontend and backend are developed, deployed, and scaled independently.
- ✅ **Scalability**: Can scale API servers and database instances separately. WebSocket server can be scaled with a Redis adapter.
- ✅ **Security**: Sensitive business logic and database connections are shielded from direct public access. API access is protected by JWT authentication.
- ✅ **Mobile Ready**: The centralized API and WebSocket server can seamlessly serve data to any client, including a native mobile app.
- ✅ **Real-Time Interaction**: Socket.IO integration provides a highly interactive and responsive user experience.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Node.js, Express.js
- **Database**: MySQL with Sequelize ORM
- **Real-Time Communication**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT), bcryptjs
- **File Handling**: Multer for multipart/form-data
- **Environment**: dotenv

### Frontend
- **Framework**: React 19 (with Hooks)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Real-Time Client**: Socket.IO Client
- **Styling**: CSS Modules / Styled Components (TBD)
- **UI Components**: Lucide Icons for React
- **API Communication**: Axios (via custom `apiClient`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)
- MySQL Server (v8.x)
- A code editor like VS Code

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/omorfarukullas/MediConnect-BD2.0.git
    cd MediConnect-BD2.0
    ```

2.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd ..
    npm install
    ```

4.  **Database Setup:**
    - Create a new MySQL database named `mediconnect`.
    - Configure your database credentials in `backend/.env` (see [Environment Variables](#-environment-variables)).
    - The server will automatically sync the Sequelize models to create the necessary tables on first run.

5.  **Create uploads directory (required for file uploads):**
    ```powershell
    # Windows PowerShell
    cd backend
    mkdir uploads
    cd ..
    ```
    ```bash
    # Linux/macOS
    mkdir -p backend/uploads
    chmod 750 backend/uploads
    ```

### First-Run Checklist

Before starting the application for the first time, ensure:
- ✅ MySQL database `mediconnect` is created
- ✅ `backend/.env` file exists with correct credentials and `DB_PORT=3307`
- ✅ `backend/uploads/` directory exists
- ✅ Backend dependencies installed: `cd backend && npm install`
- ✅ Frontend dependencies installed: `npm install` (from root)
- ✅ `socket.io-client` is installed: `npm install socket.io-client` (from root)

### Running the Application

The application requires two terminals to run both the backend and frontend servers concurrently.

**Terminal 1: Start the Backend Server**
```powershell
cd backend

# Option 1: Direct execution (production)
node server.js

# Option 2: Development mode with auto-reload (if nodemon is configured)
npm run dev
```
The backend API and WebSocket server will be running at `http://localhost:5000`.

**Terminal 2: Start the Frontend Application**
```bash
# From the root directory
npm run dev
```
The React application will be available at `http://localhost:3000`.

---

## 📂 Project Structure

```
.
├── backend/
│   ├── config/         # Database configuration
│   ├── controllers/    # Request handlers & business logic
│   ├── middleware/     # Auth, error handling
│   ├── models/         # Sequelize models
│   ├── routes/         # API routes
│   ├── services/       # Notification service
│   ├── uploads/        # Directory for uploaded files
│   └── server.js       # Express & Socket.IO server setup
│
├── components/         # Reusable React components
├── hooks/              # Custom React hooks
├── services/           # Frontend API & WebSocket services
├── types/              # TypeScript type definitions
├── views/              # Main application pages/views
│
├── App.tsx             # Main React app component
├── package.json        # Frontend dependencies & scripts
└── vite.config.ts      # Vite configuration
```

---

## 🌐 API Endpoints

For a detailed list of API endpoints, their usage, and sample requests/responses, please refer to the API testing documentation:
- **[API Testing Guide](backend/API_TESTING.md)**

---

## ⚡ Real-Time Functionality

The application uses **Socket.IO** for real-time, bidirectional communication between the client and server.

- **Authentication**: Sockets are authenticated using the same JWT token as the REST API.
- **Rooms**: Users join personalized rooms (`user_{userId}`) for targeted notifications. Doctors and patients also join temporary queue rooms (`queue_{doctorId}`) during appointments.
- **Key Events**:
  - `notification`: Generic event for all real-time updates (e.g., appointment confirmed, document uploaded).
  - `queue_updated`: Emitted to a specific doctor's queue room when a patient joins or the doctor updates the status.

---

## 🔒 Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASS=your_mysql_password
DB_NAME=mediconnect
DB_PORT=3307  # Change to 3306 if your MySQL uses the default port

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d
```

---

## 🧪 Testing

This project includes comprehensive guides for manual testing of both the backend API and the frontend user flows.

- **[Backend API Testing Guide](backend/API_TESTING.md)**
- **[Full System Testing Guide](TESTING_GUIDE.md)**
- **[Phase-Specific Implementation Docs](PHASE6_FILE_UPLOADS.md)**

---

## 🗺️ Deployment Roadmap

- **Phase 7**: Video Telemedicine (WebRTC Integration)
- **Phase 8**: Payment Gateway (SSLCommerz/bKash)
- **Phase 9**: Flutter Mobile App Development
- **Production**:
  - Containerize with Docker.
  - Deploy to a cloud provider (AWS, Azure, DigitalOcean).
  - Use a managed database service.
  - Implement a Redis adapter for Socket.IO scaling.
  - Set up a CI/CD pipeline.
  - Migrate file storage to a cloud solution like AWS S3.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.
- **TypeScript**: For strong typing and improved developer experience.
- **Vite**: Next-generation frontend tooling for fast development.

### Backend & API Gateway
- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for building robust APIs.
- **Sequelize**: Modern ORM for MySQL.
- **JWT (JSON Web Tokens)**: For secure, stateless authentication.
- **bcryptjs**: For hashing passwords.
- **Socket.IO**: For real-time features like chat and notifications.

### Database
- **MySQL**: A reliable, open-source relational database.

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- A running instance of MySQL
- npm or yarn

### Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <your-repository-url>
    cd MediConnect-BD2.0
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd backend
    npm install
    cd ..
    ```

4.  **Set up the Database**
    - Connect to your MySQL instance.
    - Create the database for the application:
      ```sql
      CREATE DATABASE mediconnect;
      ```

5.  **Configure Environment Variables**
    - **Backend (`backend/.env`)**: Copy `backend/.env.example` to `backend/.env` and fill in your database credentials and a secure `JWT_SECRET`.
    - **Frontend (`.env`)**: Copy `.env.example` to `.env` and add your `VITE_GEMINI_API_KEY` if you are using the AI features.

6.  **Run the Application**
    - **Terminal 1 (Backend)**:
      ```bash
      cd backend
      npm run dev
      ```
    - **Terminal 2 (Frontend)**:
      ```bash
      npm run dev
      ```

---

## 📁 Project Structure

```
mediconnect-bd/
├── backend/                  # Backend Service (Business Logic)
│   ├── config/               # Database config (db.js)
│   ├── controllers/          # Business logic (userController.js)
│   ├── models/               # Database models (User.js)
│   ├── routes/               # API routes (userRoutes.js)
│   ├── middleware/           # Auth middleware
│   └── server.js             # Main server entry point
│
├── components/               # Reusable React Components
│   ├── AIChatbot.tsx
│   └── UIComponents.tsx
│
├── services/                 # Frontend API services
│   └── geminiService.ts
│
├── views/                    # Page-level React Components/Views
│   ├── LandingPage.tsx
│   ├── PatientPortal.tsx
│   ├── DoctorPortal.tsx
│   └── ...
│
├── App.tsx                   # Main App component
├── index.tsx                 # Frontend entry point
├── package.json
└── README.md                 # This file
```

---

## 🚀 Deployment Roadmap

This roadmap outlines the phases to transform the current application into a production-ready system.

### **PHASE 1: BACKEND REFACTORING & API DEVELOPMENT (4 Weeks)**

**Goal**: Establish a secure, stateless, and centralized API to serve all clients.

*   **Week 1-2: API & Authentication**
    - [ ] **Build RESTful API**: Refactor all data-related logic into dedicated API controllers that return JSON.
    - [ ] **Implement JWT**: Replace session-based logic with JWTs for stateless authentication. Create `POST /api/auth/login` and `POST /api/auth/register` endpoints.
    - [ ] **Create Auth Middleware**: Develop a middleware to protect API routes, verifying the JWT on every request.

*   **Week 3-4: Security & Database Enhancements**
    - [ ] **Implement RBAC (Role-Based Access Control)**: Create middleware to check user roles (`PATIENT`, `DOCTOR`, `ADMIN`) and ensure they only access authorized data.
    - [ ] **Expand Database Schema**: Add new tables for `Reviews`, `Prescriptions`, `DoctorSchedules`, and `Notifications` using migration scripts.
    - [ ] **Password Hashing**: Ensure all user passwords are being hashed with **Bcrypt**.

### **PHASE 2: FRONTEND INTEGRATION & UX IMPROVEMENT (4 Weeks)**

**Goal**: Adapt the frontend to consume the new API and improve the user experience.

*   **Week 5-6: API Integration**
    - [ ] **Refactor Data Fetching**: Modify all frontend components to fetch data from the `/api/` endpoints using a client like `axios`.
    - [ ] **Implement Token Management**: Store the JWT securely on the client-side upon login and attach it to all subsequent API requests.
    - [ ] **Develop User Portals**: Build out the full functionality for the `PatientPortal`, `DoctorPortal`, and `AdminPortal`.

*   **Week 7-8: User Experience Polish**
    - [ ] **Add Loading & Error States**: Implement loading indicators (spinners) for all data fetches and display user-friendly messages for API errors.
    - [ ] **Create Empty States**: Design and implement views for when there is no data to show (e.g., a new user with no appointments).
    - [ ] **Password Reset Flow**: Build the complete UI and logic for a "Forgot Password" feature.

### **PHASE 3: PRODUCTION PREPARATION & DEPLOYMENT (2 Weeks)**

**Goal**: Harden the application and deploy it to a live environment.

*   **Week 9-10: Final Deployment Checklist**
    - [ ] **Externalize Configuration**: Move all secrets (DB passwords, JWT secret) to environment variables (`.env` file) and ensure `.env` is in `.gitignore`.
    - [ ] **Enable HTTPS**: Configure the production server with an SSL certificate (e.g., via Let's Encrypt) to encrypt all traffic.
    - [ ] **Set Up Logging**: Integrate a robust logging library (like Winston) to capture errors and monitor application health.
    - [ ] **Implement Pagination**: For all API endpoints that return lists (e.g., doctors), add pagination to ensure performance.
    - [ ] **Deploy**: Deploy the frontend and backend to a cloud provider (e.g., Vercel for frontend, AWS/DigitalOcean for backend).

---

## 🔐 Security

- **JWT-based Authentication**: Ensures secure, stateless communication between the client and server.
- **Password Hashing**: Uses `bcrypt` to protect user passwords in the database.
- **Role-Based Access Control (RBAC)**: Server-side logic to prevent users from accessing data they are not authorized to see.
- **HTTPS/SSL**: All data in transit should be encrypted in production.
- **Input Validation**: Sanitize and validate all user input on the backend to prevent XSS and SQL injection attacks.
- **CORS**: Configured on the backend to only allow requests from authorized origins.

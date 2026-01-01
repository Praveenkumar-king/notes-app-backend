const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ✅ Allowed frontend origins
const allowedOrigins = [
  'http://localhost:3000',   // React (CRA)
  'http://localhost:5173',   // Vite
  'https://notes-app-backend-ric.onrender.com' // backend self (safe)
];

// ✅ CORS configuration (FIXED)
app.use(cors({
  origin: function (origin, callback) {
    // Allow Postman / curl (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ✅ VERY IMPORTANT: handle preflight
app.options('*', cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

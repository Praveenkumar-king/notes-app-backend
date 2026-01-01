const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

/* ✅ SIMPLE & SAFE CORS (ALLOW ALL ORIGINS) */
app.use(cors({
  origin: '*', // 👈 allow all (localhost, Netlify, future domains)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ✅ Handle browser preflight requests */
app.options('*', cors());

/* ✅ Middleware */
app.use(express.json());

/* ✅ Routes */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));

/* ✅ Health check */
app.get('/', (req, res) => {
  res.send('Backend is running');
});

/* ✅ Server start */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

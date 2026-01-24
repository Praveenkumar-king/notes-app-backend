const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

/* ================= FORGOT PASSWORD (BREVO API) ================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const emailContent = `
      <div style="font-family:Arial,sans-serif;background:#f4f6fb;padding:20px">
        <div style="max-width:600px;margin:auto;background:#ffffff;
        border-radius:12px;padding:25px">

          <h2 style="color:#4f46e5;">Hi 👋 ${user.name},</h2>

          <p>
            You requested a password reset for your
            <b>PK Notes</b> account.
          </p>

          <div style="text-align:center;margin:30px 0">
            <a href="${resetUrl}"
              style="padding:14px 28px;background:#4f46e5;color:#ffffff;
              text-decoration:none;border-radius:30px;font-weight:bold">
              Reset Your Password 🔐
            </a>
          </div>

          <p style="color:#d32f2f;font-size:14px">
            ⏰ This link expires in <b>15 minutes</b>.
          </p>

          <p style="font-size:14px">
            If this wasn’t you, please ignore this email.
          </p>

          <hr style="margin:25px 0"/>

          <p style="font-size:14px">
            Thanks for using <b>PK Notes</b> ❤️<br/>
            — Team PK Notes
          </p>
        </div>
      </div>
    `;

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'PK Notes',
          email: process.env.BREVO_FROM_EMAIL
        },
        to: [{ email: user.email }],
        subject: 'PK Notes - Reset Your Password',
        htmlContent: emailContent
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      message: 'Reset link sent successfully. Check Inbox / Spam.'
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Error sending reset email' });
  }
};

/* ================= RESET PASSWORD ================= */
exports.resetPassword = async (req, res) => {
  try {
    const resetToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

/* ================= FORGOT PASSWORD ================= */
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

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; padding:25px;">

          <h2 style="color:#4f46e5;">Hi 👋 ${user.name},</h2>

          <p style="font-size:15px; color:#333;">
            We received a request to reset your <b>PK Notes</b> account password.
          </p>

          <p style="font-size:15px; color:#333;">
            Click the button below to securely reset your password.
          </p>

          <div style="text-align:center; margin:30px 0;">
            <a href="${resetUrl}"
               style="
                 display:inline-block;
                 padding:14px 28px;
                 background:#4f46e5;
                 color:#ffffff;
                 text-decoration:none;
                 border-radius:30px;
                 font-weight:bold;
               ">
              Reset Your Password 🔐
            </a>
          </div>

          <p style="color:#d32f2f; font-size:14px;">
            NOTE:</b>.
          </p>

          <p style="color:#d32f2f; font-size:14px;">
            ⏰ This link will expire in <b>15 minutes.</b>.
          </p>

          <p style="color:#555; font-size:14px;">
            If you did not request this password reset, please ignore this email.
          </p>

          <hr style="margin:25px 0;" />

          <p style="font-size:14px; color:#555;">
            Thanks for using <b>PK Notes</b> ❤️<br/>
            — Team PK Notes
          </p>

        </div>
      </div>
    `;

    await sgMail.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'PK Notes - Reset Your Password',
      html: emailContent
    });

    res.json({ message: 'Reset link sent to email, Also Check Spam / Junk Folder.' });
  } catch (err) {
    console.error(err);
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

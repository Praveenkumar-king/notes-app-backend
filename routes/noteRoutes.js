const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  togglePin,
  lockNote,
  unlockNote
} = require('../controllers/noteController');

const router = express.Router();

// Create note
router.post('/', auth, createNote);

// Get all notes (pinned first)
router.get('/', auth, getNotes);

// Update note
router.put('/:id', auth, updateNote);

// Delete note
router.delete('/:id', auth, deleteNote);

// 📌 Pin / Unpin note
router.patch('/:id/pin', auth, togglePin);

// 🔒 Lock / Unlock note
router.patch('/:id/lock', auth, lockNote);
router.patch('/:id/unlock', auth, unlockNote);

module.exports = router;

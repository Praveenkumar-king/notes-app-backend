const Note = require('../models/Note');
const bcrypt = require('bcryptjs');

// ===============================
// CREATE NOTE
// ===============================
exports.createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = new Note({
      userId: req.user,
      title,
      content
    });

    await note.save();
    res.status(201).json(note);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating note' });
  }
};

// ===============================
// GET NOTES (PINNED FIRST)
// ===============================
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user })
      .sort({ isPinned: -1, updatedAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes' });
  }
};

// ===============================
// UPDATE NOTE
// ===============================
exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Ownership check
    if (note.userId.toString() !== req.user) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Prevent editing locked notes
    if (note.isLocked) {
      return res.status(403).json({ message: 'Note is locked. Unlock to edit.' });
    }

    note.title = req.body.title || note.title;
    note.content = req.body.content || note.content;

    await note.save();
    res.json(note);

  } catch (error) {
    res.status(500).json({ message: 'Error updating note' });
  }
};

// ===============================
// DELETE NOTE
// ===============================
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.userId.toString() !== req.user) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await note.deleteOne();
    res.json({ message: 'Note deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting note' });
  }
};

// ===============================
// ⭐ TOGGLE PIN / UNPIN NOTE
// ===============================
exports.togglePin = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.userId.toString() !== req.user) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.json({
      message: note.isPinned ? 'Note pinned' : 'Note unpinned',
      note
    });

  } catch (error) {
    res.status(500).json({ message: 'Error toggling pin' });
  }
};

// ===============================
// 🔒 LOCK NOTE
// ===============================
exports.lockNote = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Lock password is required' });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.userId.toString() !== req.user) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    note.isLocked = true;
    note.lockPassword = hashedPassword;
    await note.save();

    res.json({ message: 'Note locked successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error locking note' });
  }
};

// ===============================
// 🔓 UNLOCK NOTE
// ===============================
exports.unlockNote = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!note.isLocked) {
      return res.status(400).json({ message: 'Note is not locked' });
    }

    const isMatch = await bcrypt.compare(password, note.lockPassword);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    note.isLocked = false;
    note.lockPassword = null;
    await note.save();

    res.json({ message: 'Note unlocked successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error unlocking note' });
  }
};

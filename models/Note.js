import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
    category: { type: String, enum: ['General', 'Study', 'Work', 'Personal', 'Ideas', 'Todo'], default: 'General' },
    tags: { type: [String], default: [] },
    color: { type: String, default: '#2563eb' },
    pinned: { type: Boolean, default: false },
    todos: { type: [{ text: String, done: Boolean }], default: [] },
  },
  { timestamps: true }
);

// Index for user to fetch all their notes quickly
NoteSchema.index({ user: 1, createdAt: -1 });
NoteSchema.index({ user: 1, category: 1 });

export default mongoose.model("Note", NoteSchema);

import mongoose from "mongoose";

const WeekSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, index: true },
    days: { type: Object, default: {} },
    // link to the user who owns this week
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
  },
  { timestamps: true }
);

// ensure uniqueness per user + weekKey (only applies to docs that have `user` set)
WeekSchema.index({ user: 1, weekKey: 1 }, { unique: true, partialFilterExpression: { user: { $exists: true } } });

export default mongoose.model("Week", WeekSchema);

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: false, select: false },
  googleId: { type: String, unique: true, sparse: true, select: false },
  profileImage: { type: String, maxlength: 2048 },
  role: { type: String, enum: ['owner', 'buyer'], required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { transform(_doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  delete ret.googleId;
  return ret;
} } });

export default mongoose.model('User', userSchema);

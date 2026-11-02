import mongoose from 'mongoose';

const pantrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  description: { type: String, trim: true, default: '', maxlength: 500 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinRequests: [{
    _id: false,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true, toJSON: { virtuals: true, transform(_doc, ret) {
  ret.id = ret._id.toString();
  ret.ownerId = ret.ownerId.toString();
  ret.memberIds = ret.memberIds.map(id => id.toString());
  delete ret._id;
  delete ret.__v;
  return ret;
} } });

export default mongoose.model('Pantry', pantrySchema);

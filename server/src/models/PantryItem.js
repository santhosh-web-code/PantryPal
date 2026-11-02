import mongoose from 'mongoose';

const pantryItemSchema = new mongoose.Schema({
  pantryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pantry', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  category: { type: String, trim: true, default: 'Other', maxlength: 60 },
  quantity: { type: Number, required: true, min: 0, validate: Number.isFinite },
  unit: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
  // Store UTC midnight; API accepts and returns YYYY-MM-DD to match the client convention.
  expiryDate: { type: Date, default: null },
  lowStockThreshold: { type: Number, required: true, min: 0, validate: Number.isFinite },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, trim: true, default: '' }
}, { timestamps: true, toJSON: { virtuals: true, transform(_doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  ret.expiryDate = ret.expiryDate ? ret.expiryDate.toISOString().slice(0, 10) : '';
  ret.isLowStock = ret.quantity <= ret.lowStockThreshold;
  return ret;
} } });

pantryItemSchema.index({ pantryId: 1, name: 1 });

export default mongoose.model('PantryItem', pantryItemSchema);

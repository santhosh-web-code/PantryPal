import mongoose from 'mongoose';

const inventoryActivitySchema = new mongoose.Schema({
  pantryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pantry', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PantryItem', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changeAmount: { type: Number, required: true },
  note: { type: String, trim: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('InventoryActivity', inventoryActivitySchema);

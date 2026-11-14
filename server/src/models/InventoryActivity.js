import mongoose from 'mongoose';

const inventoryActivitySchema = new mongoose.Schema({
  pantryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pantry', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PantryItem' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['pantry_created', 'pantry_updated', 'item_added', 'item_updated', 'quantity_changed', 'item_removed', 'member_added', 'member_removed', 'join_requested', 'join_approved', 'join_rejected', 'ownership_transferred'], default: 'quantity_changed' },
  description: { type: String, trim: true, maxlength: 500, default: 'Inventory quantity changed' },
  changeAmount: { type: Number },
  note: { type: String, trim: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now }
});

inventoryActivitySchema.index({ pantryId:  1, createdAt: -1 });

export default mongoose.model('InventoryActivity', inventoryActivitySchema);

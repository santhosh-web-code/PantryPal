import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { authenticate } from './middleware/auth.js';
import { authorizePantryAccess } from './middleware/inventoryDependencies.js';
import InventoryActivity from './models/InventoryActivity.js';

const port = Number(process.env.PORT || 5000);

try {
  await connectDatabase();
  const app = createApp({
    authenticate,
    authorizePantryAccess,
    recordStockAdjustment: record => InventoryActivity.create({
      pantryId: record.pantryId,
      itemId: record.itemId,
      userId: record.userId,
      changeAmount: record.changeAmount,
      note: record.note,
      createdAt: record.timestamp
    })
  });
  app.listen(port, () => console.log(`PantryPal inventory API listening on port ${port}`));
} catch (error) {
  console.error(`Unable to start PantryPal API: ${error.message}`);
  process.exitCode = 1;
}

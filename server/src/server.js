import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { authenticate } from './middleware/auth.js';
import { authorizePantryAccess } from './middleware/inventoryDependencies.js';

const port = Number(process.env.PORT || 5000);

try {
  await connectDatabase();
  const app = createApp({
    authenticate,
    authorizePantryAccess
  });
  app.listen(port, () => console.log(`PantryPal inventory API listening on port ${port}`));
} catch (error) {
  console.error(`Unable to start PantryPal API: ${error.message}`);
  process.exitCode = 1;
}

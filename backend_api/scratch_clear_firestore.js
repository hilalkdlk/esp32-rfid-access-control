import { db } from './firebase.js';

async function clearCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`ℹ️ Collection "${collectionName}" is already empty.`);
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`✅ Deleted ${snapshot.size} documents from "${collectionName}".`);
  return snapshot.size;
}

async function main() {
  console.log('🧹 Cleaning Firebase Cloud Firestore collections...');
  const deletedCards = await clearCollection('cards');
  const deletedLogs = await clearCollection('access_logs');
  console.log(`🎉 Total deleted: ${deletedCards} cards and ${deletedLogs} access logs.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error clearing Firestore:', err);
  process.exit(1);
});

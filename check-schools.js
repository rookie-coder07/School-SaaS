import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = "mongodb+srv://school_db_user:SchoolDB%402026@school.b1ej8vp.mongodb.net/school_saas?retryWrites=true&w=majority&appName=School";

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  const db = client.db("school_saas");
  
  console.log("📚 Schools in database:");
  const schools = await db.collection("schools").find({}).limit(10).toArray();
  schools.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (_id: ${s._id})`);
  });

  // Check for the specific ID from the error
  const testId = "69948d0c9df6e91e6e629280";
  try {
    const objId = new ObjectId(testId);
    const school = await db.collection("schools").findOne({ _id: objId });
    if (school) {
      console.log(`\n✅ Found school with ID ${testId}: ${school.name}`);
    } else {
      console.log(`\n❌ School with ID ${testId} NOT found in database`);
    }
  } catch (err) {
    console.log(`\n❌ Invalid ObjectId: ${testId}`);
  }

} finally {
  await client.close();
}

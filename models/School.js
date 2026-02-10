import { ObjectId } from "mongodb";

export default function SchoolModel(db) {
  return db.collection("schools");
}

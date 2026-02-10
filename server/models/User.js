import { ObjectId } from "mongodb";

export default function UserModel(db) {
  return db.collection("users");
}

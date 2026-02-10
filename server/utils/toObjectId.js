import { ObjectId } from "mongodb";

function safeObjectId(id) {
  if (!id) return null;
  if (ObjectId.isValid(id)) return new ObjectId(id);
  return null;
}

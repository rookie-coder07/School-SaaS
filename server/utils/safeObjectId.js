import { ObjectId } from "mongodb";

export function safeObjectId(id) {
  try {
    if (!id) return null;
    return new ObjectId(String(id));
  } catch (e) {
    return null;
  }
}

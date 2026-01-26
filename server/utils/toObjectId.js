import { ObjectId } from "mongodb";

export function toObjectId(value) {
  if (!value) return null;

  if (value instanceof ObjectId) {
    return value;
  }

  if (ObjectId.isValid(value)) {
    return new ObjectId(value);
  }

  return null;
}

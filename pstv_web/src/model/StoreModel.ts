// Importing mongoose library along with Document and Model types from it
import mongoose, { type Document, type Model } from "mongoose";

// Defining the structure of a Store using TypeScript interfaces
export interface IStore {
  databaseId: string;
  defaultLocale: string;
  name: string;
  domainName: string;
}

// Merging IStore interface with mongoose's Document interface to create
// a new interface that represents a Store document in MongoDB
export interface IStoreDocument extends IStore, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Defining a mongoose schema for the Store document, specifying the types
// and constraints
const StoreSchema = new mongoose.Schema<IStoreDocument>(
  {
    databaseId: {
      type: String,
      required: true,
    },
    defaultLocale: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    domainName: {
      type: String,
      required: false,
    },
  },
  {
    // Automatically add 'createdAt' and 'updatedAt' fields to the document
    timestamps: true,
  },
);

// Creating a mongoose model for the Store document
const StoreModel: Model<IStoreDocument> =
  mongoose.models?.Store || mongoose.model("Store", StoreSchema);

export default StoreModel;

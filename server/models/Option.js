const mongoose = require("mongoose");

// One document per dropdown value. `type` says which list it belongs to,
// so categories and languages share a single collection (and a future
// "format", "age group", etc. list is just a new enum value).
const optionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["category", "language"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
  },
  { timestamps: true }
);

// "poetry" and "Poetry" are the same value within a list.
optionSchema.index(
  { type: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Option", optionSchema);
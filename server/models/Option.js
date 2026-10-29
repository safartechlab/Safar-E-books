const mongoose = require("mongoose");

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

optionSchema.index(
  { type: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Option", optionSchema);
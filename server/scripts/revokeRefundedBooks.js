require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const orders = await Order.find({
    type: "book",
    status: "refunded",
    book: { $ne: null },
  }).select("user book");

  let removed = 0;
  for (const o of orders) {
 
    const boughtAgain = await Order.exists({
      _id: { $ne: o._id },
      user: o.user,
      book: o.book,
      status: "paid",
    });
    if (boughtAgain) continue;

    const r = await User.updateOne({ _id: o.user }, { $pull: { purchasedBooks: o.book } });
    removed += r.modifiedCount;
  }

  console.log(`Checked ${orders.length} refunded order(s). Access removed for ${removed} user(s).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
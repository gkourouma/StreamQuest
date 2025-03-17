const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Movie"}]
});

const User = mongoose.model("User", userSchema);

module.exports = User;

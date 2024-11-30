// User.js

const mongoose = require("mongoose");

// Define the User schema
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [false, "First name is required"],
  },
  lastName: {
    type: String,
    required: [false, "Last name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  mobileNo: {
    type: String,
    required: [false, "Mobile number is required"],
  }
});

// Create and export the User model
module.exports = mongoose.model("User", userSchema);

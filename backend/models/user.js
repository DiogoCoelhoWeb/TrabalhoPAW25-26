const { default: mongoose } = require("mongoose");

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Using email as the unique identifier
  name: { type: String, required: true },
  hashed_password: { type: String, required: true, select: false },
  roles: [{ type: String, ref: 'Role' }],
  profile_picture: { type: String, default: null },
  address: { type: String, default: null },
  phone_number: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
},
{
  collection: "Users",
  versionKey: false,
  _id: false
}
);

module.exports = mongoose.model("Users", UserSchema);
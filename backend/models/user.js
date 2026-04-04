const { default: mongoose } = require("mongoose");

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Using email as the unique identifier
  name: { type: String, required: true },
  password: { type: String, required: true },
  roles: [{ type: String, ref: 'Roles' }],
  profile_picture: { type: String, default: "default.jpg" },
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

UserSchema.pre(/^find/, async function() {
  this.populate("roles");
});

module.exports = mongoose.model("Users", UserSchema);
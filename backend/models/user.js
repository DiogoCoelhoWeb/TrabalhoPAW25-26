const { default: mongoose } = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Using email as the unique identifier
    name: { type: String, required: true },
    password: { type: String, required: true },
    roles: {
      type: [{ type: String, ref: "Roles" }],
      validate: {
        validator: checkUserType,
      },
      message: "Roles are only allowed for User type",
    },
    profile_picture: { type: String, default: "default.jpg" },
    address: { type: String, default: null }, //Not in Supermarket
    phone_number: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "Users",
    versionKey: false,
    _id: false,
    discriminatorKey: 'userType',
  }
);

UserSchema.pre(/^find/, async function () {
  this.populate("roles");
});

function checkUserType() {
  if (this.userType === "User") {
    return false;
  }
  return true;
}

module.exports = mongoose.model("Users", UserSchema);

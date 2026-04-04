const { default: mongoose } = require("mongoose");

const RoleSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  default: { type: Boolean, required: false }
},
{
  collection: "Roles",
  versionKey: false,
  _id: false
}
);

module.exports = mongoose.model("Roles", RoleSchema);
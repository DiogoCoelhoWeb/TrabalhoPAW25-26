const { default: mongoose } = require("mongoose");

const StatusSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
},
{
  collection: "Status",
  versionKey: false,
  _id: false
}
);

module.exports = mongoose.model("Status", StatusSchema);
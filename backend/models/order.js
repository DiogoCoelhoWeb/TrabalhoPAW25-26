const { default: mongoose } = require("mongoose");

const OrderSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: String, required: true, ref: 'Users' },
  supermarket: { type: String, required: true, ref: 'Supermarkets' },
  products: [{
    product: { type: String, required: true, ref: 'Products' },
    quantity: { type: Number, required: true }
  }],
  deliveryMethod: {
    method: {type: String, required: true},
    courier: { type:String, required: false, ref: 'Users' },
    cost: { type: Number, required: true }
  },
  total: { type: Number, required: true },
  status: { type: String, required: true, ref: 'Status' },
  createdAt: { type: Date, default: Date.now }
},
{
  collection: "Orders",
  versionKey: false
}
);

module.exports = mongoose.model("Orders", OrderSchema);
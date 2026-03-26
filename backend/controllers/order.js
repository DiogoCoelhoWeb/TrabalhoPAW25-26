const Order = require('../models/order')
const Status = require('../models/status')
const orderController = {};

orderController.getAllStatuses = async (req, res) => {
  try {
    const statuses = await Status.find();
  
    if(statuses.length == 0){
      return res.status(204).json({error: 204, message: "No Statuses Found"})
    }

    res.status(200).json(statuses);
  } catch (error) {
    res.status(500).json({error: 500, message: 'Error retrieving statuses'});
  }
};


module.exports = orderController;
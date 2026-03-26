const express = require('express');
const orderController = require('../../controllers/order');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Orders Route'
  })
});

router.use('/statuses', orderController.getAllStatuses);

module.exports = router;
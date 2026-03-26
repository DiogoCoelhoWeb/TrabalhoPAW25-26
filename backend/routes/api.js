const express = require('express');
const router = express.Router();

const userRoutes = require('./api/users');
const productRoutes = require('./api/products');
const orderRoutes = require('./api/orders');
const supermarketRoutes = require('./api/supermarkets');

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/supermarkets', supermarketRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    maintenance: false,
    version: '1.0.0',
    endpoints: {
      users: '/api/v1/users',
      products: '/api/v1/products',
      orders: '/api/v1/orders',
      supermarkets: '/api/v1/supermarkets'
    },
    message: 'Welcome to the PAW API! Please refer to the documentation for usage details.'
  });
});

module.exports = router;
const express = require('express');
const userController = require('../../controllers/user');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Users Route'
  })
});

router.post('/', (req, res) => {
  res.status(200).json({
    message: 'User Created'
  })
});

router.use('/roles', userController.getRoles);

router.get('/:email', (req, res) => {
  res.status(200).json({
    message: `User with email ${req.params.email} found`
  })
});

router.put('/:email', (req, res) => {
  res.status(200).json({
    message: `User with email ${req.params.email} updated`
  })
});

router.delete('/:email', (req, res) => {
  res.status(200).json({
    message: `User with email ${req.params.email} deleted`
  })
});

module.exports = router;
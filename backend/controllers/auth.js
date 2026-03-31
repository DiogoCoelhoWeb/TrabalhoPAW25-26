const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sanitize = require("mongo-sanitize");
const { v4: uuidv4 } = require("uuid");

// In-memory blacklist of token jti's (token IDs)
// Replace with Redis or DB for production
const tokenBlacklist = new Set();
const authController = {};

authController.login = async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword } = req.body || {};

    if (!rawEmail || !rawPassword) {
      return res.status(400).json({ 
        message: "Email and password are required.", 
        error: 400 
      });
    }

    //Clean and sanitize inputs
    const email = sanitize(rawEmail.toLowerCase().trim());
    const password = sanitize(rawPassword.trim());

    //Fetch the user by email
    const user = await User.findOne({ email: email });

    if(!user){
      return res.status(401).json({
        message: "User not found.",
        error: 401,
      });
    }

    //Validate password
    const passwordIsValid = await bcrypt.compare(password, user.password);
    
    if (!passwordIsValid) {
      return res.status(401).json({ 
        auth: false, 
        token: null, 
        error: 401 
      });
    }

    //Generate a JWT with a unique jti for blacklist tracking
    const token = jwt.sign(
      { 
        name: user.name, 
        email: user._id, 
        timestamp: Date.now(), 
        jti: uuidv4() 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    //Return the token to the client
    return res.status(200).json({ auth: true, token });

  } catch (error) {
    return res.status(500).json({ 
      message: "Error on the server.", 
      error: 500 
    });
  }
};

authController.register = async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword, name: rawName } = req.body || {};

    if(!rawEmail || !rawPassword || !rawName) {
      return res.status(400).json({
        message: "Email, password, and name are required.",
        error: 400,
      });
    }

    const email = sanitize(rawEmail.toLowerCase().trim());
    const password = bcrypt.hashSync(sanitize(rawPassword.trim()), 8);
    const name = sanitize(rawName.trim());

    const userExists = await User.findOne({ email: email });

    if (userExists) {
      return res.status(409).json({
        message: "User already exists",
        error: 409,
      });
    }

    const newUser = new User({
      _id: email,
      name: name,
      password: password,
    });

    const savedUser = await newUser.save();
    const login = await this.login({ body: { email, password: rawPassword } }, res);

    return res.status(200).json({ auth: true, token: login.token });    

  } catch (error) {
    return res.status(500).json({
      message: "Error on the server.",
      error: 500,
    });
  }

  //TODO: Check logic
  //TODO: Very compliance with User Model
};

authController.logout = async (req, res) => {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return res.status(400).json({ message: "No token provided." });
  }

  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.jti) {
      tokenBlacklist.add(decoded.jti);
    }
  } catch (err) {}

  return res.status(200).json({ message: "Logged out successfully." });
};

authController.userInfo = async (req, res) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(403).json({ message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.status(200).json({
      name: decoded?.name,
      email: decoded?.email,
    });

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

authController.verifyToken = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(403).json({ auth: false, message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({
        auth: false,
        message: "Token has been revoked. Please login again.",
      });
    }

    req.userEmail = decoded.email;
    //TODO: Add user role to token and check it here for protected routes
    return next();

  } catch (err) {
    return res.status(401).json({ 
      auth: false, 
      message: "Failed to authenticate token." 
    });
  }
};

function getTokenFromRequest(req) {
  const authHeader = req.headers?.["authorization"];

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return req.headers?.["x-access-token"] || null;
}

module.exports = authController;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sanitize = require("mongo-sanitize");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/user");
const Role = require("../models/role");

const tokenBlacklist = new Set();
const authController = {};

authController.login = async (req, res) => {
  try {

    //TODO: Might change with refresh token implementation. For now check if user already has a valid token and return it to avoid multiple logins and token proliferation. This is not ideal but works for the current scope.
    const userToken = getTokenFromRequest(req);
    if(userToken) {
      const tokenData = checkValidToken(userToken);

      if (tokenData) {
        return res.status(200).json({
          auth: true,
          token: userToken,
          message: "Already logged in. Token is still valid.",
        });
      }
    }

    // Get data from request body and basic validation
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
    const user = JSON.parse(JSON.stringify(await User.findOne({ _id: email })));


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
        error: 401 
      });
    }

    //Generate a JWT with a unique jti for blacklist tracking
    //TODO: Implement refresh tokens for better security and user experience
    const token = jwt.sign(
      { 
        name: user.name, 
        email: user._id, 
        roles: user.roles,
        profile_pic: user.profile_picture,
        ...(user?.address && { address: user.address }),
        ...(user?.phone_number && { phone_number: user.phone_number }),
        userType: user.userType,
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
      error: error.message || 500
    });
  }
};

authController.register = async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword, name: rawName, userType: rawUserType } = req.body || {};

    if(!rawEmail || !rawPassword || !rawName || !rawUserType) {
      return res.status(400).json({
        message: "Email, password, name, and user type are required.",
        error: 400,
      });
    }

    const email = sanitize(rawEmail.toLowerCase().trim());
    const password = bcrypt.hashSync(sanitize(rawPassword.trim()), 8);
    const name = sanitize(rawName.trim());
    const userType = sanitize(rawUserType.trim());
    const role = await getRoleFromRequest(req);

    const userExists = await User.findOne({ _id: email });

    if (userExists) {
      return res.status(409).json({
        error: 409,
        message: "User already exists",
      });
    }

    const newUser = new User({
      _id: email,
      name: name,
      password: password,
      roles: [role],
      userType: userType,
    });

    //Save to DB and auto-login
    await newUser.save();
    
    const token = jwt.sign(
      { 
        name: newUser.name, 
        email: newUser._id, 
        roles: newUser.roles,
        profile_pic: newUser.profile_picture,
        userType: newUser.userType,
        timestamp: Date.now(), 
        jti: uuidv4() 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({ auth: true, token: token });    

  } catch (error) {
    return res.status(500).json({
      message: "Error on the server.",
      error: 500,
    });
  }
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
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

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
      roles: decoded?.roles,
      profile_pic: decoded?.profile_pic,
      ...(decoded?.address && { address: decoded.address }),
      ...(decoded?.phone_number && { phone_number: decoded.phone_number }),
      userType: decoded?.userType,
    });

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// Auth Guard Middleware
authController.verifyToken = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(403).json({ auth: false, message: "No token provided." });
  }

  const tokenData = checkValidToken(token);

  if (!checkValidToken(token)) {
    return res.status(401).json({
      auth: false,
      message: "Token has been revoked or is invalid. Please login again.",
    });
  }

  req.userEmail = tokenData.email;
  req.userRoles = tokenData.roles || [];
  req.profile_pic = tokenData.profile_pic;
  if (tokenData?.address) req.address = tokenData.address;
  if (tokenData?.phone_number) req.phone_number = tokenData.phone_number;
  req.userType = tokenData.userType;

  return next();
};

authController.verifyAdmin = async (req, res, next) => {
  await authController.verifyToken(req, res, async () => {
      if (!req?.userRoles) {
        return res.status(403).json({ message: "No roles found. Access denied." });
      }

      const isAdmin = req.userRoles.some(role => role?.admin === true);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin role required. Access denied." });
      }

      return next();
  });
};

authController.injectUserInfo = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  const tokenData = checkValidToken(token);

  if (!tokenData) {
    return next();
  }

  req.userEmail = tokenData.email;
  req.userRoles = tokenData.roles || [];
  req.profile_pic = tokenData.profile_pic;
  if (tokenData?.address) req.address = tokenData.address;
  if (tokenData?.phone_number) req.phone_number = tokenData.phone_number;
  req.userType = tokenData.userType;

  return next();
};

// Helper functions
function getTokenFromRequest(req) {
  const authHeader = req.headers?.["authorization"];

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return req.headers?.["x-access-token"] || null;
}

async function getRoleFromRequest(req) {
  const defaultRoleDoc = await Role.findOne({ default: true });
  const defaultRoleId = defaultRoleDoc ? defaultRoleDoc._id : null;

  if (!req?.userRoles) return defaultRoleId;

  const userRoles = req.userRoles || [];
  const isAdmin = userRoles.some(role => role?.admin === true);

  if (isAdmin && req.body?.role) {
    return req.body.role;
  }

  return defaultRoleId;
}

function checkValidToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.jti && tokenBlacklist.has(decoded.jti)) {
      return false;
    }

    return {
      email: decoded?.email,
      roles: decoded?.roles,
      profile_pic: decoded?.profile_pic,
      ...(decoded?.address && { address: decoded.address }),
      ...(decoded?.phone_number && { phone_number: decoded.phone_number }),
      userType: decoded?.userType,
    };
  } catch (err) {
    return false;
  }
}

module.exports = authController;
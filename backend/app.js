const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const apiRouter = require("./routes/api");

const app = express();
app.use(cors());

require("dotenv").config();

//Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.locals.db = mongoose.connection;
    console.log("Connected to MongoDB [" + mongoose.connection.name + "]");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

app.get("/api", (req, res) => {
  res.redirect("/api/v1");
});
app.use("/api/v1", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (req.originalUrl.startsWith("/api")) {
    return res.json({ error: 404, message: "Endpoint not found" });
  }
  
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);

  if (req.originalUrl.startsWith("/api")) {
    return res.json({ error: 500, message: "Internal server error" });
  }

  res.render("error");
});

module.exports = app;

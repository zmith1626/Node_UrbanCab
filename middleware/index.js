"use strict";

module.exports = function(req, res, next) {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  )
    return res.status(401).json({ message: "Unauthorized" });

  req.uid = req.headers.authorization.split("Bearer ")[1];

  next();
};

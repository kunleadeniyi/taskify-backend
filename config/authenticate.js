const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function ensureAuth(req, res, next) {
    try {
        if (!req.header("Authorization")) {
            return res.status(403).send("Forbidden")
        }
    
        const token = req.header("Authorization").split(" ")[1];
    
        if (!token) {
            return res.status(403).send("Forbidden")
        }
        req.token = token
        req.user = await User.findByToken(token)
        next()
    } catch (error) {
        next(error)
    }
}

module.exports = {
    ensureAuth
};

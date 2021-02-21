const authRouter = require("express").Router();
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

require("dotenv").config({ path: `${__dirname}/../.env` });

const { ensureAuth } = require("../config/authenticate");
const { sendMail } = require("../config/nodemailer");

const User = require("../models/User");
const Board = require("../models/Board");
const { reset } = require("nodemon");
// const { response } = require("express");


authRouter.post("/signup", async function (req, res, next) {
    try {
        const body = _.pick(req.body, ["firstName", "lastName", "email", "password"])
        if (!body.firstName || !body.lastName || !body.password || !body.email) {
            return res.status(400).send("Please provide all necessary information")
        }

        // check if user already exists
        const existingUser = await User.findOne({ "local.email": body.email })
        if (existingUser) {
            return res.send("User with existing email already exists")
        }
        // create new user
        const newUser = new User({
            method: "local",
            local: body
        })
        // send saved user as response
        const savedUser = await newUser.save();

        // create new default board 
        // const generalBoard = await Board.create({title: "General", createdBy: savedUser._id});
        await Board.create({ title: "General", createdBy: savedUser._id });

        res.status(200).send(_.pick(savedUser, ["method", "local"]))
    } catch (error) {
        next(error)
    }
})

authRouter.post("/login", async function (req, res, next) {
    try {
        const body = _.pick(req.body, ["email", "password"])
        if (!body.password || !body.email) {
            return res.status(400).send("Please provide all email and password")
        }

        // check if user exists
        const existingUser = await User.findOne({ "local.email": body.email })
        if (!existingUser) {
            return res.status(400).send("No account with this email!")
        }

        // res.send({existingUser, body})
        // checking if password matches wiht bcrypt.compare
        const validPassword = await bcrypt.compare(body.password, existingUser.local.password);
        if (!validPassword) {
            return res.status(400).send("Invalid Password");
        }
        // create token
        const token = await existingUser.generateAuthToken()
        res.header("Authorization", token)
        let response = _.pick(existingUser, ["method", "local"])
        response.token = token
        res.status(200).send(response)
    } catch (error) {
        next(error)
    }
})

authRouter.post("/googleSignIn", async function (req, res, next) {
    try {
        const body = _.pick(req.body, ["googleId", "displayName", "firstName", "lastName", "image"])

        if (!body.googleId) { /* assuming that if there"s a googleId everything else will follow */
            return res.status(400).send("Auth failed")
        }
        // Check if user already exists - if so, generate token
        let user = await User.findOne({ "google.googleId": body.googleId })
        if (user) {
            const token = await user.generateAuthToken()
            res.header("Authorization", token)
            res.status(200).send(_.pick(user, ["method", "google"]))
        } else {
            // else create new user and generate token
            user = new User({
                method: "google",
                google: body
            })

            const savedUser = await user.save();
            const token = await savedUser.generateAuthToken();

            // create new default board 
            // const generalBoard = await Board.create({title: "General", createdBy: savedUser._id});
            await Board.create({ title: "General", createdBy: savedUser._id });

            res.header("Authorization", token)

            let response = _.pick(savedUser, ["method", "google"])
            response.token = token
            res.status(200).send(response)
        }
    } catch (error) {
        next(error)
    }
})

authRouter.get("/logout", ensureAuth, async function (req, res, next) {

    // strip user token away
    try {
        await User.updateOne({ _id: req.user._id }, { $pull: { tokens: { access: "Bearer" } } }, { multi: true })
        res.status(200).send("successful")
    } catch (error) {
        next(error)
    }

})


/*
change password should only display for users that signed up locally not with google.
*/

authRouter.post("/changePassword", ensureAuth, async function (req, res, next) {
    // user info is in req.user
    // user token is in req.token
    const body = _.pick(req.body, ["password", "newPassword"])
    console.log(req.user.local.password)
    try {
        const validPassword = await bcrypt.compare(body.password, req.user.local.password);
        if (!validPassword) {
            // const error = new Error("Invalid Password");
            return res.status(400).send("Invalid Password");
        }

        // check if new and old passwords are the same 
        const samePassword = await bcrypt.compare(body.newPassword, req.user.local.password);
        if (samePassword) {
            return res.status(400).send("Cannot set new password to current existing password")
        }

        // const updatedUser = await User.updateOne({_id: req.user._id}, {"local.password": body.newPassword})
        let user = await User.findOne({ _id: req.user._id })
        user.local.password = body.newPassword
        user = await user.save()
        // res.status(200).send(_.pick(user, ["method", "local"]))
        res.status(200).send("Your password has been changed succesffully")
    } catch (error) {
        next(error)
    }
})

// // forgot password route that will not required being loggedIn
authRouter.post("/forgotPassword", async function (req, res, next) {
    // check if user exists
    const body = _.pick(req.body, ["email"])
    if (!body.email) {
        return res.status(404).send("Cannot leave fields empty")
    }

    try {
        let user = await User.findOne({ "local.email": body.email })

        if (!user) {
            return res.status(400).send("No account with this email!")
        }
        // generate reset link token
        const token = await jwt.sign({ _id: user._id }, process.env.JWT_RESET_TOKEN, { expiresIn: "20m" })

        // refactor this
        let mailObj = {
            subject: "Reset Password",
            text: `Dear ${user.local.firstName},\n\nPlease click on the link below to reset your password.\nhttps://taskifyy.netlify.app/resetPassword/${token}`,
            html: `<p>Dear ${user.local.firstName},<br><br>Please click on the link below to reset your password.<br><a href="https://taskifyy.netlify.app/resetPassword/${token}">Click here</a></p>`
        }

        const updatedUser = await User.findOneAndUpdate({_id: user._id}, { resetToken: token }, {new: true})

        if (updatedUser) {
            sendMail(updatedUser.local.email, mailObj)
                .then(function (mail) {
                    return res.status(200).send("Mail sent, kindly follow the instructions.")
                })
                .catch(function (error) {
                    return res.status(404).send(error.message)
                })
        } else {
            return res.status(404).send("Reset password link error")
        }


    } catch (error) {
        next(error)
    }
})


authRouter.post("/resetPassword", async function(req, res, next) {
    // take token and new password and update user password through the preset schema method --- user.save...
    const body = _.pick(req.body, ["resetToken", "newPassword"]);

    if (!body.resetToken) {
        return res.status(404).send("Authorization Error")
    }
    try {
        const decodedData = await jwt.verify(body.resetToken, process.env.JWT_RESET_TOKEN)
        // check if user exists
        let user =  await User.findById(decodedData._id)
        user.local.password = body.newPassword
        user = await user.save()
        res.status(200).send("Your password has been reset succesffully")
    } catch (error) {
        next(error)
    }
})

module.exports = authRouter;
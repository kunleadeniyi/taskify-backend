const authRouter = require('express').Router();
const _ = require('lodash');
// const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { ensureAuth } = require('../config/authenticate');

const User = require('../models/User');
const Board = require('../models/Board');
const { response } = require('express');

authRouter.post('/signup', async function (req,res,next) {
    try {
        const body = _.pick(req.body, ['firstName', 'lastName', 'email', 'password'])
        if (!body.firstName || !body.lastName || !body.password || !body.email) {
            return res.status(400).send("Please provide all necessary information")
        }

        // check if user already exists
        const existingUser = await User.findOne({'local.email': body.email})
        if (existingUser) {
            return res.send("User with existing email already exists")
        }
        // create new user
        const newUser = new User({
            method: 'local',
            local: body
        })
        // send saved user as response
        const savedUser = await newUser.save();

        // create new default board 
        // const generalBoard = await Board.create({title: 'General', createdBy: savedUser._id});
        await Board.create({title: 'General', createdBy: savedUser._id});
        
        res.status(200).send(_.pick(savedUser, ['method', 'local']))
    } catch (err) {
        next(err)
    }
})

authRouter.post('/login', async function (req,res,next) {
    try {
        const body = _.pick(req.body, ['email', 'password'])
        if (!body.password || !body.email) {
            return res.status(400).send("Please provide all email and password")
        }

        // check if user exists
        const existingUser = await User.findOne({'local.email': body.email})
        if (!existingUser) {
            return res.status(400).send("No account with this email!")
        }

        // res.send({existingUser, body})
        // checking if password matches wiht bcrypt.compare
        const validPassword =  await bcrypt.compare(body.password, existingUser.local.password);
        if (!validPassword) {
            return res.status(400).send("Invalid Password");
        }
        // create token
        const token = await existingUser.generateAuthToken()
        res.header('Authorization', token)
        // res.status(200).send(_.pick(existingUser, ['method', 'local', 'tokens']))
        let response = _.pick(existingUser, ['method', 'local'])
        response.token = token
        res.status(200).send(response)
    } catch (err) {
        next(err)
    }
})

authRouter.post('/googleSignIn', async function(req, res, next) {
    try {    
        const body = _.pick(req.body, ['googleId', 'displayName', 'firstName', 'lastName', 'image'])

        if (!body.googleId) { /* assuming that if there's a googleId everything else will follow */
            return res.status(400).send("Auth failed")
        }
        // Check if user already exists - if so, generate token
        let user = await User.findOne({"google.googleId": body.googleId})
        if (user) {
            const token = await user.generateAuthToken()
            res.header('Authorization', token)
            res.status(200).send(_.pick(user, ['method', 'google']))
        } else {
            // else create new user and generate token
            user = new User({
                method: 'google',
                google: body
            })
            
            
            // const doc = await Person.create({ name: 'Will Riker', age: 29 });
            const savedUser = await user.save();
            const token = await savedUser.generateAuthToken();

            // create new default board 
            // const generalBoard = await Board.create({title: 'General', createdBy: savedUser._id});
            await Board.create({title: 'General', createdBy: savedUser._id});

            res.header('Authorization', token)
            // res.status(200).send(_.pick(savedUser, ['method', 'google']))

            let response = _.pick(savedUser, ['method', 'google'])
            response.token = token
            res.status(200).send(response)
        }
    } catch (err) {
        next(err)
    }
})

authRouter.get('/logout', ensureAuth, async function (req,res,next) {

    // strip user token away
    try {
        await User.updateOne({_id: req.user._id}, {$pull: {tokens: {access: "Bearer"}}}, {multi: true})
        res.status(200).send('successful')
    } catch (err) {
        next(err)
    }

})

authRouter.post('/changePassword', ensureAuth, async function (req, res, next) {
    // user info is in req.user
    // user token is in req.token
    const body = _.pick(req.body, ['password', 'newPassword'])
    console.log(req.user.local.password)
    try {
        const validPassword =  await bcrypt.compare(body.password, req.user.local.password);
        if (!validPassword) {
            // const error = new Error("Invalid Password");
            return res.status(400).send("Invalid Password");
        }

        // check if new and old passwords are the same 
        const samePassword =  await bcrypt.compare(body.newPassword, req.user.local.password);
        if (samePassword) {
            return res.status(400).send("Cannot set new password to current existing password")
        }

        // const updatedUser = await User.updateOne({_id: req.user._id}, {'local.password': body.newPassword})
        let user = await User.findOne({_id: req.user._id})
        user.local.password = body.newPassword
        user = await user.save()
        res.status(200).send(_.pick(user, ['method', 'local']))
    } catch (error) {
        next(error)
    }
})

// forgot password route that will not required being loggedIn

// edit user
authRouter.put('/editProfile', ensureAuth, async function(req, res, next) {
    const body = _.pick(req.body, ['firstName', 'lastName'])
    if (!body.firstName && !body.lastName) {
        return res.status(404).send('Cannot leave fields empty')
    }
    try {
        await User.updateOne({_id: req.user._id}, {$set: body}, function(err) {
            if (err) {
                console.log(err)
                next(err)
            }
        });
        res.sendStatus(204)
    } catch (error) {
        console.log(error);
        next(error)
    }
}) 

module.exports = authRouter;
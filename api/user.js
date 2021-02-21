const userRouter = require("express").Router();

const _ = require("lodash");

const { ensureAuth } = require("../config/authenticate");
const User = require("../models/User");
const Task = require("../models/Task");

// todays tasks
userRouter.get("/today", ensureAuth, async function (req, res, next) {
    try {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const tasks = await Task.find({ "createdBy": req.user._id })
            .where({ "dueTime": { $gte: startDate, $lte: endDate } })

        if (!tasks) {
            res.status(404).send(new Error("Error making request"))
        } else {
            res.status(200).json({ tasks: tasks }) /* Comes out as a list of objects */
        }
    } catch (err) {
        next(err)
        res.status(404).send(err.message)
    }
})


// edit user
// can only edit firstname and lastName
userRouter.put("/editProfile", ensureAuth, async function (req, res, next) {
    const body = _.pick(req.body, ["firstName", "lastName"])
    if (!body.firstName && !body.lastName) {
        return res.status(404).send("Cannot leave fields empty")
    }
    try {
        await User.updateOne({ _id: req.user._id }, { $set: { "local.firstName": body.firstName, "local.lastName": body.lastName } });
        res.status(200).send(body)
    } catch (error) {
        next(error)
    }
})

module.exports = userRouter
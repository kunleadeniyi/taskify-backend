const taskRouter = require('express').Router({mergeParams: true});
const mongoose  = require('mongoose');
const _ = require('lodash');

const { ensureAuth } = require('../config/authenticate');
const Task = require('../models/Task');
// const Board = require('../models/Board')

taskRouter.param('taskId', async function(req, res, next, taskId) {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(404).send("Provide a valid board id")
    }

    try {
        const task = await Task.findById(taskId)
        if (!task) {
            res.status(404).send("Cannot find task")
        } else {
            req.task = task;
            next()
        }
    } catch (error) {
        next(error)
    }
});


// fullpath - /api/board/:boardId/task/
taskRouter.get('/', ensureAuth, async function(req, res, next) {
    try {
        const tasks = await Task.find({'createdBy': req.user._id, 'board': req.params.boardId})
        if (!tasks) {
            res.status(404).send(new Error("Error making request"))
        } else {
            res.status(200).json({tasks: tasks}) /* Comes out as a list of objects */
        }
    } catch (err) {
        next(err)
        res.status(404).send(err.message)
    }
})

taskRouter.get('/:taskId', ensureAuth, async function(req, res, next) {
    try {
        res.status(200).json({task: req.task})
    } catch (err) {
        next(err)
        res.status(404).send(err.message)
    }
})

// a get tasks route with sort query params? by when due ?

taskRouter.put('/:taskId', ensureAuth, async function(req, res, next) {
    const body = _.pick(req.body, ['body', 'dueTime', 'repeat', 'completed'])
    body.board = req.params.boardId
    body.createdBy = req.user._id

    try {
        await Task.updateOne({_id: req.params.taskId}, {$set: body}, function(err) {
            if (err) {
                console.log(err)
                next(err)
            }
        })
        const updatedTask = await Task.findById(req.params.taskId)
        res.status(200).json({task: updatedTask})
    } catch (error) {
        next(error)
    }
})

taskRouter.post('/', ensureAuth, async function(req, res, next) {
    const body = _.pick(req.body, ['body', 'dueTime', 'repeat', 'completed'])
    body.board = req.params.boardId
    body.createdBy = req.user._id
    if (!body.body) { // only the body content is required
        return res.status(400).send("Cannot have an empty task :-|")
    }
    try {
        const task = new Task(body)
        const newTask = await task.save()
        res.status(200).json({task: newTask})
    } catch (error) {
        next(error)
        res.send(error.message)
    }
})

taskRouter.delete('/:taskId', ensureAuth, async function(req, res, next) {
    try {
        await Task.findByIdAndDelete(req.params.taskId, function(err) {
            if (err) {
                throw new Error
            }
        });
        res.sendStatus(204)
    } catch (error) {
        next(error)
    }
})

/* completetask route - patch request?
basically just setting completed: true
*/
taskRouter.patch('/:taskId/toggleComplete', ensureAuth, async function(req, res, next) {
    try {
        // toggle task.completed 
        await Task.updateOne({_id: req.params.taskId}, {$set: {completed: !req.task.completed}}, function(err) {
            if (err) {
                console.log(err)
                next(err)
            }
        });
        res.sendStatus(204)
    } catch (error) {
        console.log(error)
        next(error)
    }
})

module.exports = taskRouter;
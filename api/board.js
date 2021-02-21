const boardRouter = require("express").Router();
const _ = require("lodash");
const mongoose = require("mongoose");

const { ensureAuth } = require("../config/authenticate");
const Board = require("../models/Board");
const Task = require("../models/Task");


boardRouter.param("boardId", async function(req, res, next, boardId) {
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
        return res.status(404).send("Provide a valid board id")
    }

    try {
        const board = await Board.findById(boardId)
        if (!board) {
            res.status(404).send("Cannot find board")
        } else {
            req.board = board;
            next()
        }
    } catch (error) {
        next(error)
    }
});

// get one board
boardRouter.get("/:boardId", ensureAuth, async function(req, res, next) {
    try {
        res.status(200).json({board: req.board})
    } catch (error) {
        next(error)
    }
});

// get all boards
boardRouter.get("/", ensureAuth, async function(req, res, next) {
    try {
        const boards = await Board.find({"createdBy": req.user._id})
        if (!boards) {
            res.status(404).send(new Error("Error making request"))
        } else {
            // res.status(200).send(boards)
            res.status(200).json({boards: boards}) /* Comes out as a list of objects */
        }
    } catch (err) {
        next(err)
        res.status(404).send(err.message)
    }
});

boardRouter.post("/", ensureAuth, async function(req, res, next) {
    const body = _.pick(req.body, ["title"]);
    if (!body.title) {
        return res.sendStatus(400)
    }

    try {
        const board = new Board({
            title: body.title,
            createdBy: req.user._id
        })

        const newBoard = await board.save()
        res.status(200).json({board: newBoard})
    } catch (err) {
        next(err)
    }
})

boardRouter.put("/:boardId", ensureAuth, async function(req, res, next) {
    const body = _.pick(req.body, ["title"]);
    if (!body.title) {
        return res.status(404).send("Fill title field")
    }
    try {
        // find board and update it
        let board = await Board.findOne({_id: req.params.boardId})
        if (!board) {
            return res.status(404).send("Board does not exist")
        }
        board.title = body.title
        board = await board.save()
        res.status(200).json({board: board})
    } catch (err) {
        next(err)
    }

})

// mount task on boardRouter, all task must belong to a board
const taskRouter = require("./task")
boardRouter.use("/:boardId/task", taskRouter)

// deleting a board will delete all the tasks in it.
boardRouter.delete("/:boardId", ensureAuth, async function(req,res,next) {
    try {
        // delete board and all tasks in it 
        // find 
        let result = ""
        // delete tasks on that board
        await Task.deleteMany({board: req.params.boardId}, function(err, taskDeleted) {
            if (err) {
                next(err)
            } else {
                result = `${taskDeleted.deletedCount} tasks deleted`
            }
        })
        // delete board
        await Board.findByIdAndDelete(req.params.boardId, function(err) {
            if (err) {
                next(err)
            } else {
                result = `Board and ` + result
            }
        })
        res.status(200).send(result)
        // res.sendStatus(204)
    } catch (err) {
        next(err)
    }
})

module.exports = boardRouter;

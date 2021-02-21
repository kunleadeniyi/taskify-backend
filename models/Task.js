const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    body: {type: String, required: true},
    dueTime: {type: Date, default: null},
    repeat: {type: Boolean, default: false},
    completed: {type: Boolean, default: false},
    board: {type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    createdAt: {type: Date, default: Date.now}
})

module.exports = mongoose.model("Task", taskSchema);
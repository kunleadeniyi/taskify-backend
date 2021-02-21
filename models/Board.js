const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema({
    title: {type: String, required: true},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    createdAt: {type: Date, default: Date.now}
})

module.exports = mongoose.model("Board", boardSchema);
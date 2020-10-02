const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: ['google', 'local']
    },
    local: {
        firstName: {type: String},
        lastName: {type: String},
        email: {type: String},
        password: {type: String},
        image: {type: String},
        createdAt: {type: Date, default: Date.now}
    },
    google: {
        googleId: {type: String},
        email: {type: String},
        displayName: {type: String},
        firstName: {type: String},
        lastName: {type: String},
        image: {type: String},
        createdAt: {type: Date, default: Date.now}
    },
    tokens: [
        {
            access: { type: String, required: true }, 
            token: { type: String, required: true }
        }
    ]
})

// static methods
userSchema.statics.findByToken = async function (token) {
    const User = this

    const verified = jwt.verify(token, process.env.JWT_SECRET)
    return User.findOne({'_id': verified._id, 'tokens.access':verified.access, 'tokens.token': token})
}

// schema methods
userSchema.methods.generateAuthToken = function () {
    let user = this
    const access = 'Bearer'
    const token = jwt.sign({_id: user._id, access}, process.env.JWT_SECRET).toString()

    user.tokens = user.tokens.concat([{access, token}]) 
    
    return user.save().then(() => {
        return token
    })  
}

// hooks
userSchema.pre("save", async function(next) {
    const user = this
    if (user.method !== 'local') {
       return next()
    }
    if (user.isModified('local.password') || user.isNew) {
        try {
            const hashedPassword = await bcrypt.hash(user.local.password, 10)
            user.local.password = hashedPassword
            next()
        } catch (error) {
            next(error)
        }
    }
})

// virtual
userSchema
.virtual('displayName')
.get(function () {
    if (user.method === 'local') {
        return `${this.local.firstName[0].toUpperCase()}${this.local.firstName.slice(1)} ${this.local.lastName[0].toUpperCase()}${this.local.lastName.slice(1)}`;
    }
 
});


module.exports = mongoose.model('User', userSchema)
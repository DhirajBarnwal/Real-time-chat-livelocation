const mongoose = require('mongoose');

const GroupMessageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: function() { return !this.fileUrl && !this.location; },
        maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    type: {
        type: String,
        enum: ['text','image','file','location','voice','system'],
        default: 'text'
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileType: String,
    location: {
        lat: Number,
        lng: Number,
        address: String,
        expiresAt: Date
    },
    deleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

GroupMessageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('GroupMessage', GroupMessageSchema);

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const PostSchema = new Schema(
	{
		title: String,
		summary: String,
		content: String,
		cover: String,
		author: { type: Schema.Types.ObjectId, ref: 'User' },
	},
	{
		timestamps: true, // निर्माण समय जोड़ें और टाइमस्टैम्प फ़ील्ड अपडेट करें
	}
);

const PostModel = model('Post', PostSchema);

module.exports = PostModel;

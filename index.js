const express = require('express');
const app = express();
const cors = require('cors');
const User = require('./models/User');
const Post = require('./models/Post');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = 'abcdefghijklmnopqrstuvxyz0123456789';

app.use(
	cors({
		credentials: true,
		origin: 'https://harmonious-kitsune-6f79c5.netlify.app',
	})
);
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose
	.connect(
		'mongodb+srv://sks2098:sharma2098@cluster.op7t35o.mongodb.net/?retryWrites=true&w=majority',
		{
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true,
		}
	)
	.then(() => {
		console.log('MongoDB connected');
	})
	.catch((error) => {
		console.error('MongoDB connection error:', error);
	});

app.post('/register', async (req, res) => {
	const { username, password } = req.body;
	try {
		const userDoc = await User.create({
			username,
			password: bcrypt.hashSync(password, salt),
		});
		res.json(userDoc);
	} catch (error) {
		console.error('Error during user registration:', error);
		res.status(400).json({ error: 'Internal Server Error' });
		console.log(error);
	}
});

app.post('/login', async (req, res) => {
	const { username, password } = req.body;
	const userDoc = await User.findOne({ username });
	const passOk = bcrypt.compareSync(password, userDoc.password);
	if (passOk) {
		jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
			if (err) throw err;
			res.cookie('token', token).json({
				id: userDoc._id,
				username,
			});
		});
	} else {
		res.status(400).json('Wrong Credientials');
	}
	// res.json(userDoc);
});

app.get('/profile', async (req, res) => {
	const { token } = req.cookies;

	try {
		if (!token) {
			return res.status(401).json({ error: 'Token not provided' });
		}

		const info = await jwt.verify(token, secret, {});
		res.json(info);
	} catch (err) {
		console.error('Error during profile verification:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// New Change

app.post('/logout', (req, res) => {
	res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
	const { originalname, path } = req.file;
	const parts = originalname.split('.');
	const ext = parts[parts.length - 1];
	const newPath = path + '.' + ext;
	fs.renameSync(path, newPath);

	const { token } = req.cookies;
	jwt.verify(token, secret, {}, async (err, info) => {
		if (err) throw err;
		const { title, summary, content } = req.body;
		const postDoc = await Post.create({
			title,
			summary,
			content,
			cover: newPath,
			author: info.id,
		});
		res.json(postDoc);
	});
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
	let newPath = null;
	if (req.file) {
		const { originalname, path } = req.file;
		const parts = originalname.split('.');
		const ext = parts[parts.length - 1];
		newPath = path + '.' + ext;
		fs.renameSync(path, newPath);
	}

	const { token } = req.cookies || { token: '' }; // chnages as per ChatGPT solutions
	jwt.verify(token, secret, {}, async (err, info) => {
		if (err) throw err;
		const { title, summary, content, id } = req.body;
		const postDoc = await Post.findById(id);
		const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
		// res.json({ isAuthor, postDoc, info });

		if (!isAuthor) {
			return res.status(400).json('you are not the author');
		}

		await postDoc.updateOne(
			{ _id: id },
			{
				title,
				summary,
				content,
				cover: newPath ? newPath : postDoc.cover,
			}
		);
		res.json(postDoc);
	});
});

app.get('/post', async (req, res) => {
	try {
		const options = { maxTimeMS: 20000 }; // Set to 20 seconds
		const posts = await Post.find()
			.populate('author', ['username'])
			.sort({ createdAt: -1 })
			.limit(20)
			.lean();
		res.json(posts);
	} catch (error) {
		console.error('Error during post retrieval:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/post/:id', async (req, res) => {
	const { id } = req.params;
	const postDoc = await Post.findById(id).populate('author', ['username']);
	res.json(postDoc);
});

app.listen(4000);
// hello

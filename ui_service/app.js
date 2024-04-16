const express = require('express');
const session = require('express-session');

const app = express();
const PORT = 3000;

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true when using HTTPS
}));

// Body parser for parsing form data
app.use(express.urlencoded({ extended: true }));

// Route to display login page
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f4f4f9;
                }
                form {
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    background-color: white;
                }
                input[type=password], button {
                    width: 100%;
                    padding: 8px;
                    margin: 10px 0;
                    display: inline-block;
                    border: 1px solid #ccc;
                    box-sizing: border-box;
                    border-radius: 4px;
                }
                button {
                    background-color: #5cabff;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                button:hover {
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <form action="/login" method="post">
                <input type="password" name="password" placeholder="Enter your password" required>
                <button type="submit">Login</button>
            </form>
        </body>
        </html>
    `);
});

// Handle login logic
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.AUTHORIZED_TOKEN) {
        req.session.authenticated = true;
        res.redirect('/'); // Redirect to the home page if login is successful
    } else {
        // res.send('Incorrect password! <a href="/login">Try again</a>'); // Provide a retry link 
        res.send(`<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f4f4f9;
                }
                div {
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    background-color: white;
                }
            </style>
        </head>
        <body>
            <div>
                <p>Incorrect password!</p><br>
                <a href="/login">Try again</a>
            </div>
        </body>
        </html>`)
    }
});

// Middleware to check if the user is authenticated
app.use((req, res, next) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    } else {
        next();
    }
});


app.get('/video_proxy', async (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const fetch = (await import('node-fetch')).default;

        const videoResponse = await fetch('http://api_service:8000/video_feed', {
            headers: {
                'X-Auth-Token': process.env.AUTHORIZED_TOKEN
            }
        });

        if (!videoResponse.ok) {
            throw new Error('Failed to fetch video');
        }

        res.setHeader('Content-Type', 'multipart/x-mixed-replace;boundary=frame');
        videoResponse.body.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not fetch video');
    }
});


app.get('/camera_stats', async (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const fetch = (await import('node-fetch')).default;
        const statsResponse = await fetch('http://api_service:8000/camera_stats', {
            headers: {
                'X-Auth-Token': process.env.AUTHORIZED_TOKEN
            }
        });

        if (!statsResponse.ok) {
            throw new Error('Failed to fetch camera stats');
        }

        const data = await statsResponse.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not fetch camera stats');
    }
});


// Middleware to serve static files. It should come after your authentication check.
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
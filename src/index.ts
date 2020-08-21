const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const sendRequest = require('./controller');

app.use(express.json());

app.post('/requests', (req: any, res: any, next: any) => {
    const { id } = req.body;
    sendRequest(id);
    res.status(200).json({
        status: "started"
    })
})


app.listen(PORT, () => {
    console.log('Server is running on port ', PORT)
})
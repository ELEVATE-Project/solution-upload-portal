const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 4200;
console.log(process.env.PORT, port,"ENV PORT, port")
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'src/index.html'));
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
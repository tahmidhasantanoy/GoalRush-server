const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

//middle ware

app.get("/", (req, res) => {
  res.send("Let's score some goals");
});

app.listen(port, () => {
  console.log(`My port is runing on ${port}`);
});

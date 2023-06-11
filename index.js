const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  //check first authorization or not
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: error, message: "Unauthorized access" });
  }

  //Bearer token
  const token = authorization.split(" ")[1];

  //verify jwt
  jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: error, message: "Unauthorized access" });
    }
    req.decoded = decoded; //send token data
    next();
  });
};

//Mongodb
const { MongoClient, ServerApiVersion } = require("mongodb");
const { status } = require("express/lib/response");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oc9fgut.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //All collections
    const userCollecion = client.db("goalRush").collection("users");
    const classCollecion = client.db("goalRush").collection("classes");

    //start jwt here  || req from login
    app.post("/jwt", (req, res) => {
      const userData = req.body;
      console.log(userData);

      const token = jwt.sign(userData, process.env.SECRET_ACCESS_TOKEN, {
        expiresIn: "5h",
      });

      res.send({ token }); //why obj??
    });

    // All users routes
    app.post("/users", async (req, res) => {
      const newUserData = req.body;

      //DB
      const result = await userCollecion.insertOne(newUserData);
      res.send(result);
    });

    //Check the user is admin or not
    app.get("/users/admin/:email",verifyJWT, async(req, res) => {
      const email = req.params.email;
      console.log(email);

      if (email !== req.decoded.email) {
        return res
          .status(401)
          .send({ eror: true, message: "Forbidden access" });
      }


      const query = {email : email}
      const queryUser = await userCollecion.findOne(query)

      const result = {admin : queryUser?.role === "admin"}
      res.send(result)
    });
    //Check the user is instructor or not
    app.get("/users/instructor/:email",verifyJWT, async(req, res) => {
      const email = req.params.email;
      console.log(email);

      if (email !== req.decoded.email) {
        return res
          .status(401)
          .send({ eror: true, message: "Forbidden access" });
      }


      const query = {email : email}
      const queryUser = await userCollecion.findOne(query)

      const result = {admin : queryUser?.role === "instructor"}
      res.send(result)
    });

    //All class routes
    app.post("/all-class", async (req, res) => {
      const newClassData = req.body;

      //DB
      const result = await classCollecion.insertOne(newClassData);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Let's score some goals");
});

app.listen(port, () => {
  console.log(`My port is runing on ${port}`);
});

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
//ch 6:30 no-err
const stripe = require("stripe")(process.env.PAYMENT_SECRET_TOKEN);
const app = express();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  //  Change : advise of moderator
  // next();
  // return;

  //check first authorization or not
  const authorization = req.headers.authorization;
  if (!authorization) {
    // console.log("err in auth");
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }

  //Bearer token
  const token = authorization.split(" ")[1];
  // console.log({ token });
  //verify jwt
  jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      // console.log("err in decoded");
      return res
        .status(401)
        .send({ error: err, message: "Unauthorized access" });
    }
    req.decoded = decoded; //send token data
    // console.log(req.decoded);
    next();
  });
};

//Mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    /* All collections here */
    const userCollection = client.db("goalRush").collection("users");
    const classCollection = client.db("goalRush").collection("classes");
    const SelectClassCollection = client
    .db("goalRush")
    .collection("SelectClasses");
    const PaymentCollection = client.db("goalRush").collection("Payments");

    //start jwt here  || req from login
    app.post("/jwt", (req, res) => {
      const userData = req.body;

      const token = jwt.sign(userData, process.env.SECRET_ACCESS_TOKEN, {
        expiresIn: "5h",
      });

      res.send({ token }); //why obj??
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log("verifyAdmin", email);
      // const query = { email: email };
      const user = await userCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(401).send({ message: "UnAuthorized access" });
      }

      next();
    };

    // All users routes
    app.post("/users", async (req, res) => {
      const newUserData = req.body;

      //DB
      const result = await userCollection.insertOne(newUserData);
      res.send(result);
    });

    //Check the user is admin or not
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      // if (email !== req.decoded.email) {
      //   return res
      //     .status(401)
      //     .send({ eror: true, message: "Forbidden access" });
      // }

      const query = { email: email };
      const queryUser = await userCollection.findOne(query);

      const result = { admin: queryUser?.role === "admin" };
      res.send(result);
    });

    //Check the user is instructor or not
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      // if (email !== req.decoded.email) {
      //   return res
      //     .status(401)
      //     .send({ eror: true, message: "Forbidden access" });
      // }

      const query = { email: email };
      const queryUser = await userCollection.findOne(query);

      const result = { instructor: queryUser?.role === "instructor" };
      res.send(result);
    });

    //Check the user is generalUser or not
    app.get("/users/generalUser/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      // if (email !== req.decoded.email) {
      //   return res
      //     .status(401)
      //     .send({ eror: true, message: "Forbidden access" });
      // }

      const query = { email: email };
      const queryUser = await userCollection.findOne(query);

      const result = {
        generalUser:
          queryUser?.role !== "instructor" && queryUser?.role !== "admin",
      }; //
      res.send(result);
    });

    //Get all the instructor || Can't enter this route
    app.get(
      "/users/instructors",
      /* verifyJWT, */ async (req, res) => {
        const query = { role: "instructor" };
        // console.log(query);

        const result = await userCollection.find(query).toArray();
        res.send(result);
      }
    );

    //All class routes
    app.get(
      "/all-class",
      /*  verifyJWT, */ async (req, res) => {
        const result = await classCollection.find().toArray();
        res.send(result);
      }
    );

    //Get all selected classes
    app.get("/all-class/selected", async (req, res) => {
      //DB
      const result = await SelectClassCollection.find().toArray();
      res.send(result);
    });

    //Instructor added classes ...
    app.post("/all-class", async (req, res) => {
      const newClassData = req.body;

      //DB
      const result = await classCollection.insertOne(newClassData);
      res.send(result);
    });

    //Student selected classes
    app.post("/all-class/selected", async (req, res) => {
      const selectClassData = req.body;

      //DB
      const result = await SelectClassCollection.insertOne(selectClassData);
      res.send(result);
    });

    app.delete("/all-class/selected/:delete_id", async (req, res) => {
      const id = req.params.delete_id;

      //DB
      const query = { _id: new ObjectId(id) };
      const result = await SelectClassCollection.deleteOne(query);
      res.send(result);
    });

    //Create payment intent || 6:53
    app.post("/create-payment-intent", async(req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency : "usd",
        payment_method_types : ['card']

      })
      //7:00
      res.send({
        clientSecret : paymentIntent.client_secret
      })
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

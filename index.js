const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 2000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7lm78mi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function verifyToken(req, res, next) { 
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send("Unauthorized access");
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).send({ error: true, message: error.message });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("Car-Doctor").collection("services");
    const bookingCollection = client.db("Car-Doctor").collection("bookings");
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // JSON Web token for user
    app.post("/user-token", (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        { email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10m" }
      );
      res.send({ token: token });
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });
    app.get("/bookings", verifyToken, async (req, res) => {
      const decoded = req.decoded;
      console.log("log after verifying");
      if(decoded.email !== req.query?.email){
        return res.status(403).send({error: true, message: "forbidden access"});
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/bookings", async (req, res) => {
      const bookingInfo = req.body;
      const result = await bookingCollection.insertOne(bookingInfo);
      res.send(result);
    });
    app.patch("/update-booking/:id", async (req, res) => {
      const id = req.params.id;
      const updatedInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: updatedInfo.status,
        },
      };
      const result = await bookingCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    app.delete("/delete-booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/delete-all-bookings", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query?.email };
      }
      const result = await bookingCollection.deleteMany(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Car-Doctor webapp server");
});

app.listen(port, () => {
  console.log("Car-Doctor Server running on port", port);
});

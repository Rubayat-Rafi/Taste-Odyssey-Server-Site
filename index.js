require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const port = process.env.PORT || 7000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5174",
      "https://taste-odyssey.web.app",
      "https://taste-odyssey.firebaseapp.com"
    ],
    credentials: true,
    optionalSuccessStatus: 200,
  })
);

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASSWORD}@cluster0.c8olx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify jwt token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded
    })
  next();
};

async function run() {

  try {
    const db = client.db("taste-odyssey-db");
    const foodsCollection = db.collection("foods");
    const ordersCollection = db.collection("orders");

    //granaret jwt token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // create a token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //logut || clear jwt token
    app.get("/logOut", (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // post all foods in database
    app.post("/add-food", async (req, res) => {
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      res.json(result);
    });

    // get all foods from database
    app.get("/all-foods", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page);
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {};
      if (sort) options = { sort: { food_price: sort === "asc" ? 1 : -1 } };
      const query = {
        food_name: { $regex: search, $options: "i" },
      };
      if (filter) query.food_category = filter;
      const result = await foodsCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // home page foods best selling
    app.get("/best-selling", async (req, res) => {
      const Dsc = {purchases: -1};
      const result = await foodsCollection.find().sort(Dsc).limit(6).toArray();
      res.send(result);
    });

    // get a single food by id
    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    //get all food by using Email address
    app.get("/all-foods/:email", verifyToken, async (req, res) => {
      const decoded = req.user?.email;
      const email = req.params.email;

      if (decoded !== email)
        return res.status(401).send({ message: 'unauthorized access' })
    
      const query = { "buyer.email": email };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });


    //food count for pagination
    app.get("/food-count", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      let query = {
        job_title: { $regex: search, $options: "i" },
      };

      if (filter) query.category = filter;
      const count = await foodsCollection.estimatedDocumentCount(query);
      res.send({ count });
    });

    // post order food  in database
    app.post("/purchase", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);

      // update food quantity
      const filter = { _id: new ObjectId(order.food_id) };
      const update = {
        $inc: { quantity: -order.quantity, purchases: order.quantity },
      };
      const updateFood = await foodsCollection.updateOne(filter, update);

      res.send(result);
    });

    // get all orders from database with email
    app.get("/my-orders/:email",verifyToken, async (req, res) => {
      const email = req.params.email;
      const decoded = req.user?.email;
      if (decoded !== email)
        return res.status(401).send({ message: 'unauthorized access' })
      const query = { email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // delete posted food from database
    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    // delete order from database
    app.delete("/delete-order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    // upadet a food in database
    app.put("/update-food/:id", async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      const query = { _id: new ObjectId(id) };
      const update = { $set: food };
      const result = await foodsCollection.updateOne(query, update);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// server side data
app.get("/", (req, res) => {
  res.send("A Restaurant API server is building here.................");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

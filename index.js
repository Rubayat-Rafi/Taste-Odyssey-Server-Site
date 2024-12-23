require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');


// middlewere
app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASSWORD}@cluster0.c8olx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {


    const db = client.db('taste-odyssey-db')
    const foodsCollection = db.collection('foods')
    // const bidsCollection = db.collection('bids')

    app.post('/add-food', async (req, res) => { 
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      res.json(result);
    })





    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






// server side data 
app.get('/', (req, res) => {
    res.send('A Restaurant API server is building here.................')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

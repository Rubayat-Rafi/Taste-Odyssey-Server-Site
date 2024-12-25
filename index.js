require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


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


    // post all foods in database 
    app.post('/add-food', async (req, res) => { 
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      res.json(result);
    })

    // get all foods from database
    app.get('/all-foods', async(req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page);
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {};
      if(sort) options = {sort: {food_price: sort === 'asc' ? 1 : -1}}
      const query = {
        food_name: { $regex: search, $options: 'i' }
      };
      if(filter) query.food_category = filter
      const result = await foodsCollection.find(query, options).skip(page * size).limit(size).toArray();
      res.send(result);
    })

    // home page foods best selling
    app.get('/best-selling', async(req, res) => {
      const result = await foodsCollection.find().limit(6).toArray();
      res.send(result);
    })

    // get a single food by id
    app.get('/food/:id', async(req, res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await foodsCollection.findOne(query);
      res.send(result);
    })

    //get all food by using Email address
    app.get('/all-foods/:email', async(req, res)=> {
      const email = req.params.email;
      const query = { 'buyer.email': email }
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    })

    //food count for pagination
    app.get('/food-count', async(req, res)=> {
      const filter = req.query.filter
      const search = req.query.search
      let query = {
        job_title: { $regex: search, $options: 'i' },
      }
      if (filter) query.category = filter
      const count = await foodsCollection.estimatedDocumentCount(query);
      res.send({count})
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

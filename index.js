const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_Name}:${process.env.DB_PASS}@cluster0.ythezyh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
      // Connect the client to the server	(optional starting in v4.7)
      //await client.connect();
      const userCollection = client.db('bistroDB').collection('users');
      const menuCollection = client.db('bistroDB').collection('menu');
      const reviewsCollection = client.db('bistroDB').collection('reviews');
      const cartsCollection = client.db('bistroDB').collection('carts');


      

      // jwt token create
      app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn : '2h'})
            res.send({token})
      })

      // middleware 
      
      const verifyToken = (req, res, next) => {
            //console.log('insert the token',req.headers.authorization)
            if(!req.headers.authorization){
                  return res.status(401).send({message : 'unauthorize access'});
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                  if(err){
                        return res.status(401).send({message : 'unauthorize access'});
                        
                  }
                  req.decoded = decoded;
                  next();
            })
      }

      // verify admin middleware 	
      const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = {email : email}
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin';
            if(!isAdmin){
                  return res.status(403).send({message : 'forbidden access'})
            }
            next();
      }


      app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
      })


      app.post('/user', async (req, res) =>{
            const user = req.body
            const query = { email : user.email}
            const isExist = await userCollection.findOne(query);
            if(isExist) return res.send(isExist)
            const result = await userCollection.insertOne(user);
            res.send(result)
      })

      app.get('/user/admin/:email', verifyToken, async (req, res) =>{
            const email = req.params.email;
            if(email !== req.decoded.email){
                  return res.status(403).send({message : 'forbidden access'});
            }
            const query = { email : email };
            const user = await userCollection.findOne(query)
            let admin = false;
            if(user){
                  admin = user?.role === 'admin';
            }
            res.send({admin})

      })

      app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) =>{
            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                  $set: { role : 'admin' }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
      })

      app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) =>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result)
      })
        
      app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartsCollection.insertOne(cartItem);
            res.send(result)
      })


      app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email : email };
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
      })

      app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartsCollection.deleteOne(query);
            res.send(result)
      })

      app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuItem = req.body;
            const result = await menuCollection.insertOne(menuItem);
            res.send(result)
      })

      
      app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
      })

      app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.findOne(query)
            res.send(result)

      })

      app.patch('/menu/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                  $set:{
                        name : item.name,
                        price : item.price,
                        description : item.description,
                        image : item.image
                  }
            }
            const result = await menuCollection.updateOne(filter, updateDoc);
            res.send(result)
      })

      app.delete('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.deleteOne(query);
            res.send(result)
      })


      app.get('/review', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
      })
      
      // Send a ping to confirm a successful connection
      //await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
      } finally {
      // Ensures that the client will close when you finish/error
      //await client.close();
      }
}
run().catch(console.dir);


app.get('/', (req, res) => {
      res.send('Welcome to the server!');
})

app.listen(port, () => {
      console.log(`listening on port ${port}`);
})
const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.95g0ypv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // await client.connect();

        // articles collection
        const articleCollection = client.db("newspaperDB").collection("articles")


        app.get("/articles", async (req, res) => {
            const result = await articleCollection.find().toArray()
            res.send(result)
        })

        app.get('/singleDetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await articleCollection.findOne(query);
            res.send(result);
        })

        app.post('/articles', async (req, res) => {
            const newsArticles = req.body;
            console.log(newsArticles);
            const result = await articleCollection.insertOne(newsArticles);
            res.send(result);
        })


        //users Collection
        const userCollection = client.db("newspaperDB").collection("users")

        app.get("/users", async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exits", insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.patch("/users/admin/:id",  async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
              $set: {
                role: 'admin'
              }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
          })





        //Publisher Collection
        const publisherCollection = client.db("newspaperDB").collection("publisher")

        app.post('/publisher', async (req, res) => {
            const publisherArticles = req.body;
            console.log(publisherArticles);
            const result = await publisherCollection.insertOne(publisherArticles);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Newspaper Server is running")
})

app.listen(port, () => {
    console.log(`newspaper Server is running ${port}`);
})
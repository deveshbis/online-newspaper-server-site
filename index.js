const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
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
        const userCollection = client.db("newspaperDB").collection("users")



        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares 
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }


        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        //user related api

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });


        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })



        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user doesnt exists: 
            // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });


        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })


        //optional
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })





        // articles related api
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





        //Admin Publisher
        const adminPublisherCollection = client.db("newspaperDB").collection("adminPublisher")

        app.get("/adminPublisher", async (req, res) => {
            const result = await adminPublisherCollection.find().toArray()
            res.send(result)
        })

        app.post('/adminPublisher', verifyToken, verifyAdmin, async (req, res) => {
            const adminPublisherArticles = req.body;
            console.log(adminPublisherArticles);
            const result = await adminPublisherCollection.insertOne(adminPublisherArticles);
            res.send(result);
        })




        //Admin Publisher
        const userPublisherCollection = client.db("newspaperDB").collection("publisher")

        app.get("/userPublisher", verifyToken, async (req, res) => {
            const result = await userPublisherCollection.find().toArray()
            res.send(result)
        })

        app.get('/userPublisher/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userPublisherCollection.findOne(query);
            res.send(result);
        })

        app.post('/userPublisher', verifyToken, async (req, res) => {
            const userPublisherArticles = req.body;
            console.log(userPublisherArticles);
            const result = await userPublisherCollection.insertOne(userPublisherArticles);
            res.send(result);
        })

        app.get('/myPublisher/:email', verifyToken, async (req, res) => {
            // const tokenEmail = req.user.email
            const email = req.params.email
            // if (tokenEmail !== email) {
            //   return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { authorEmail: email }
            const result = await userPublisherCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/myArticleDetails/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userPublisherCollection.findOne(query);
            res.send(result);
        })
        app.delete('/articles/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userPublisherCollection.deleteOne(query);
            res.send(result);
        })



        app.patch('/userPublisher/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    title: item.title,
                    publisher: item.publisher,
                    description: item.description,
                    recipe: item.recipe,
                    image: item.image
                }
            }

            const result = await userPublisherCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // app.put('/updateData/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) }
        //     const options = { upsert: true };
        //     const updatedArticle = req.body;

        //     const article = {
        //         $set: {
        //             title: updatedArticle.title,
        //             description: updatedArticle.description,
        //             publisher: updatedArticle.publisher
        //         }
        //     }
        //     const result = await userPublisherCollection.updateOne(filter, article, options);
        //     res.send(result);
        // })



        // // Send a ping to confirm a successful connection
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
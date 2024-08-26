const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIP_SECRET_KEY);
const port = process.env.PORT || 5000;


//middleware
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://newspaper-website-1931a.web.app',
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

// app.use(cors());
// app.use(express.json())



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
        const reviewCollection = client.db("newspaperDB").collection("reviews")



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

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
        //     const result = await userCollection.find().toArray();
        //     res.send(result);
        // });


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

        //approved article show
        app.get("/singleArticleShow", async (req, res) => {
            const result = await userPublisherCollection.find().toArray()
            res.send(result)
        })

        app.get('/allApprovedArticleView/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userPublisherCollection.findOne(query);
            res.send(result);
        })

        app.delete('/deleteArticleByAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userPublisherCollection.deleteOne(query);
            res.send(result);
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




        // Update user status
        app.patch('/articleStatus/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: status,
            }
            const result = await userPublisherCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        //Admin make primeum content
        app.patch('/premium/article/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    isPremium: 'premium'
                }
            }
            const result = await userPublisherCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.get("/premiumArticlesShow", async (req, res) => {
            const result = await userPublisherCollection.find().toArray()
            res.send(result)
        })



        app.get('/allPremiumArticleView/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userPublisherCollection.findOne(query);
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
                    image: item.image
                }
            }

            const result = await userPublisherCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })









        app.get("/publication", async (req, res) => {
            const result = await userPublisherCollection.find().toArray()
            res.send(result)
        })



        // Features Plan
        const featuresPlanCollection = client.db("newspaperDB").collection("featuresPlan")

        app.get("/planFeatures", async (req, res) => {
            const result = await featuresPlanCollection.find().toArray()
            res.send(result)
        })

        app.get('/planSubscribe/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await featuresPlanCollection.findOne(query);
            res.send(result);
        })

        //......................................................................................................


        //Payment card

        const paymentCollection = client.db("newspaperDB").collection("payments")


        app.get("/premiumUser", async (req, res) => {
            const result = await paymentCollection.find().toArray()
            res.send(result)
        })


        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            console.log('payment info', payment);

            res.send({ paymentResult });
        })




        //................................................................................................................





        app.get('/singleArticleShow', async (req, res) => {
            try {
                const db = client.db('newspaperDB');
                const collection = db.collection('userPublisherCollection');
                const { search } = req.query;

                // Query articles by title using case-insensitive regex
                const query = {
                    title: { $regex: search, $options: 'i' },
                    status: 'Approved' // Assuming you have a 'status' field in your articles
                };

                const articles = await collection.find(query).toArray();
                res.json(articles);
            } catch (error) {
                console.error('Error searching articles:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });





        // app.get('/singleArticleShow', async (req, res) => {
        //   const size = parseInt(req.query.size)
        //   const page = parseInt(req.query.page) - 1
        //   const filter = req.query.filter
        //   const sort = req.query.sort
        //   const search = req.query.search
        //   console.log(size, page)

        //   let query = {
        //     title: { $regex: search, $options: 'i' },
        //   }
        //   if (filter) query.tags = filter
        //   let options = {}
        //   if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }
        //   const result = await userPublisherCollection
        //     .find(query, options)
        //     .skip(page * size)
        //     .limit(size)
        //     .toArray()

        //   res.send(result)
        // })


        // app.get('/singleArticleShow-count', async (req, res) => {
        //   const filter = req.query.filter
        //   const search = req.query.search
        //   let query = {
        //     title: { $regex: search, $options: 'i' },
        //   }
        //   if (filter) query.publisher = filter
        //   const count = await userPublisherCollection.countDocuments(query)

        //   res.send({ count })
        // })





        //review collection
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        });


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












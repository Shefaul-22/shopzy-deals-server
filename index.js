const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Firebase admin
const admin = require("firebase-admin");

const serviceAccount = require("./shopzy-deals-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// Middleware
app.use(cors())
app.use(express.json())

const logger = (req, res, next) => {
    console.log('logging information')
    next();
}

const verifyFirebaseToken = async(req, res, next) => {
    console.log('verify firebase token', req.headers.authorization)

    if(!req.headers.authorization){
        // do not allow to go
        return res.status(401).send({message: 'unauthorized access'})

    }

    const token = req.headers.authorization.split(' ')[1]
    if(!token){
        return res.status(401).send({message: 'unautorized access'})
    }

    // verify token

    try{
        const userInfo = await admin.auth().verifyIdToken(token);
        console.log('After token validation', userInfo)
        next();
    }
    catch{
        return res.status(401).send({message: 'unautorized access'})
    }

    // 
    
}
// For hiding secrity key using dotenv
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/?appName=crud-server-practices`;




// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Smart server is running');
})


async function run() {

    try {
        await client.connect();

        const db = client.db('smart-db')
        const productsCollection = db.collection('products');
        const bidsCollection = db.collection('bids');
        const usersCollection = db.collection('users')

        // Users related apis here
        app.post('/users', async (req, res) => {
            const newUser = req.body;

            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                res.send({ message: 'Users already exists' })
            }
            else {

                const result = await usersCollection.insertOne(newUser)
                res.send(result)
            }

        })

        // Products apis
        app.get('/products', async (req, res) => {

            console.log(req.query)
            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email;
            }

            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/latest-products', async (req, res) => {

            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        // app.get('/products/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }
        //     const result = await productsCollection.findOne(query);
        //     res.send(result)

        // })

        app.get("/products/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: id };
                const result = await productsCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: "Product not found" });
                }

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });


        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    name: updatedProduct.name,
                    price: updatedProduct.price
                }
            }
            const result = await productsCollection.updateOne(query, update)
            res.send(result);
        })

        // app.delete('/products', async (req, res) => {

        //     const result = await productsCollection.deleteMany({})
        //     res.send(result);
        // })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result);
        })


        // bids related apis here
        app.get('/bids', logger,verifyFirebaseToken, async (req, res) => {
            // console.log('headers',req.headers)
            const email = req.query.email;
            // console.log(email)
            const query = {}
            if (email) {
                query.buyer_email = email
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/products/bids/:productId', async (req, res) => {
            const productId = req.params.productId;
            const query = { product: productId }
            const cursor = bidsCollection.find(query).sort({ bid_price: -1 })
            const result = await cursor.toArray();
            res.send(result);
        })

        // app.get('/bids', async (req, res) => {

        //     const query = {};
        //     if (query.email) {
        //         query.buyer_email = email;
        //     }

        //     const cursor = bidsCollection.find(query);
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        app.post('/bids', async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        })

        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bidsCollection.deleteOne(query)
            res.send(result);
        })
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}
run().catch(console.dir)


app.listen(port, () => {
    console.log(`Smart server is running on port: ${port}`);
})

// another way to connect
// client.connect()
//     .then(() => {
//         app.listen(port, () => {
//             console.log(`Smart server is running now on port: ${port}`);
//         })
//     })
//     .catch(console.dir)
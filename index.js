const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const app = express()
const port = process.env.PORT || 3000

//middleware:
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const database = client.db('coffee-store') // create database
        const coffeeCollection = database.collection('coffees') // create coffees collection

        // get coffee data 
        app.get('/coffees', async (req, res) => {
            const allCoffees = await coffeeCollection.find().toArray();
            console.log(allCoffees);
            res.send(allCoffees)
        })

        //get a single coffee by id
        app.get('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await coffeeCollection.findOne(query);
            res.send(result)
        })

        //save a coffee data in database through post 
        app.post('/add-coffee', async (req, res) => {
            const coffeeData = req.body;
            const quantity = coffeeData.quantity
            coffeeData.quantity = parseInt(quantity)

            const result = await coffeeCollection.insertOne(coffeeData);
            res.send(result)
        })

        // update a single item: 
        app.patch('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const updatedCoffee = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "invalid id" })
            }
            // fields to update
            const updateDoc = {
                $set: {
                    name: updatedCoffee.name,
                    quantity: parseInt(updatedCoffee.quantity),
                    supplier: updatedCoffee.supplier,
                    taste: updatedCoffee.taste,
                    price: updatedCoffee.price,
                    details: updatedCoffee.details,
                    photo: updatedCoffee.photo,
                    email: updatedCoffee.email
                }
            };

            const query = { _id: new ObjectId(id) };
            const result = await coffeeCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        // delete a single item 
        app.delete('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            //need some validation

            const query = { _id: new ObjectId(id) }
            const result = await coffeeCollection.deleteOne(query);

            res.send(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Coffee Server is Running")
})
app.listen(port, () => {
    console.log(`the app is running ${port}`);
})


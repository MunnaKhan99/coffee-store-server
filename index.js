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
        const orderCollection = database.collection('orders') /// crete order collection
        // get coffee data 
        app.get('/coffees', async (req, res) => {
            const allCoffees = await coffeeCollection.find().toArray();
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

        // delete a single coffee item 
        app.delete('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            //need some validation

            const query = { _id: new ObjectId(id) }
            const result = await coffeeCollection.deleteOne(query);

            res.send(result)
        })

        // handle like toggle and count: 
        app.patch('/like/:coffeeId', async (req, res) => {
            const id = req.params.coffeeId;
            const email = req.body.email;

            const filter = { _id: new ObjectId(id) }

            const coffee = await coffeeCollection.findOne(filter)

            const alreadyLiked = coffee?.likedBy?.includes(email);

            const updateDoc = alreadyLiked ? {
                $pull: {
                    likedBy: email,
                }
            } :
                {
                    $addToSet: {
                        likedBy: email,
                    }

                }

            await coffeeCollection.updateOne(filter, updateDoc)
            res.send({
                message: alreadyLiked ? " dislike successfully done" : "liked successful",
                liked: !alreadyLiked
            })
        })

        //handle order section: 
        //save a coffee data in database through post request
        app.post('/place-order/:coffeeId', async (req, res) => {
            const id = req.params.coffeeId;
            const orderData = req.body;
            const query = { _id: new ObjectId(id) }
            const result = await orderCollection.insertOne(orderData)

            if (result.acknowledged) {
                await coffeeCollection.updateOne(
                    query, {
                    $inc: {
                        quantity: -1,
                    },
                }
                )
            }
            res.status(201).send(result)
        })

        //get all order by customer email: 
        app.get('/my-orders/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { customerEmail: email }
            const allOrders = await orderCollection.find(filter).toArray();

            for (const order of allOrders) {
                const orderId = order.coffeeId
                const fullCoffeeData = await coffeeCollection.findOne({ _id: new ObjectId(orderId), })
                order.name = fullCoffeeData.name
                order.photo = fullCoffeeData.photo
                order.price = fullCoffeeData.price
                order.quantity = fullCoffeeData.quantity

            }
            res.send(allOrders)
        })

        // cancel a single coffee item 
        app.delete('/my-orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const order = await orderCollection.findOne(query);
            if (!order) return res.status(404).send({ message: "Order not found" });

            const deleteResult = await orderCollection.deleteOne(query);

            if (deleteResult.deletedCount > 0) {
                await coffeeCollection.updateOne(
                    { _id: new ObjectId(order.coffeeId) },
                    { $inc: { quantity: 1 } }
                );
                res.send(deleteResult);
            }
        });



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


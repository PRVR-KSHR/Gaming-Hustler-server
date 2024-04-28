const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// Middleware
app.use(cors());
app.use(express.json());


const verifyInstructorOrAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user.role === "instructor" || user.role === "admin") {
     next();
  } else {
     return res
       .status(401)
       .send({ error: true, message: "Unauthorize access" });
  }
 };



// Routes
// SET TOKEN .
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorize access" });
  }
  const token = authorization?.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "forbidden user or token has expired" });
    }
    req.decoded = decoded;
    next();
  });
};

// MONGO DB ROUTES

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@esports-gaming.altools.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@esports-gaming.altools.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // const database = client.db("music_cons");
    const database = client.db("Esports-Gaming");
    const userCollection = database.collection("users");
    const classesCollection = database.collection("classes");
    const cartCollection = database.collection("cart");
    const enrolledCollection = database.collection("enrolled");
    const paymentCollection = database.collection("payments");
    const appliedCollection = database.collection("applied");
    client.connect();

    // Verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.role === "admin") {
        next();
      } else {
        return res
          .status(401)
          .send({ error: true, message: "Unauthorize access" });
      }
    };

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.role === "instructor" || user.role === "admin") {
        next();
      } else {
        return res
          .status(401)
          .send({ error: true, message: "Unauthorize access" });
      }
    };

     // Fetch enrolled teams
     app.get("/api/enrolled-teams", async (req, res) => {
      try {
        const enrolledTeams = await enrolledTeamsCollection.find({}).toArray();
        res.send(enrolledTeams);
      } catch (error) {
        console.error('Error fetching enrolled teams:', error);
        res.status(500).send({ error: true, message: "Error fetching enrolled teams" });
      }
    });

    // Approve a team
    app.put("/api/enrolled-teams/:teamId/approve", async (req, res) => {
      const teamId = req.params.teamId;
      try {
        const result = await enrolledTeamsCollection.updateOne(
          { _id: new ObjectId(teamId) },
          { $set: { status: "approved" } }
        );
        res.send(result);
      } catch (error) {
        console.error('Error approving team:', error);
        res.status(500).send({ error: true, message: "Error approving team" });
      }
    });

    // Reject a team
    app.put("/api/enrolled-teams/:teamId/reject", async (req, res) => {
      const teamId = req.params.teamId;
      try {
        const result = await enrolledTeamsCollection.updateOne(
          { _id: new ObjectId(teamId) },
          { $set: { status: "rejected" } }
        );
        res.send(result);
      } catch (error) {
        console.error('Error rejecting team:', error);
        res.status(500).send({ error: true, message: "Error rejecting team" });
      }
    });

//////////////////////////////////////////////////////////////////////////
    app.delete("/classes/:id", verifyJWT, verifyInstructor, async (req, res) => {
      console.log("Delete class route hit"); // Debugging log
      const id = req.params.id;
      const isValidObjectId = ObjectId.isValid(id);
     
      if (!isValidObjectId) {
         return res.status(400).send({ error: "Invalid ObjectId" });
      }
     
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.deleteOne(query);
      console.log("Delete result:", result); // Debugging log
      res.send(result);
     });
     ////////////////////////////////////////////////////////////////////
     
    // Add this route inside the `run` function
    app.get("/check-email", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }

      try {
        const existingUser = await userCollection.findOne({ email: email });
        if (existingUser) {
          return res.status(200).send({ exists: true });
        } else {
          return res.status(200).send({ exists: false });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).send({ error: "Internal server error" });
      }
    });

    app.post("/new-user", async (req, res) => {
      const newUser = req.body;

      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });
    app.post("/api/set-token", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // GET ALL USERS
    app.get("/users", async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    });
    // GET USER BY ID
    // app.get('/users/:id', async (req, res) => {
    //     const id = req.params.id;
    //     const query = { _id: new ObjectId(id) };
    //     const user = await userCollection.findOne(query);
    //     res.send(user);
    // })

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const isValidObjectId = ObjectId.isValid(id); // Check if the id is a valid ObjectId string

      if (isValidObjectId) {
        const query = { _id: new ObjectId(id) };
        const user = await userCollection.findOne(query);
        res.send(user);
      } else {
        res.status(400).send({ error: "Invalid ObjectId" });
      }
    });

    // GET USER BY EMAIL
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // Delete a user

    app.delete("/delete-user/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

     // UPDATE USER
     app.put('/update-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedUser = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
          $set: {
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.option,
              address: updatedUser.address,
              phone: updatedUser.phone,
              about: updatedUser.about,
              photoUrl: updatedUser.photoUrl,
              skills: updatedUser.skills ? updatedUser.skills : null,
          }
      }
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
  })


    app.put('/update-class/:id', verifyJWT, verifyInstructor, async (req, res) => {
      try {
          const id = req.params.id;
          const isValidObjectId = ObjectId.isValid(id);
  
          if (!isValidObjectId) {
              return res.status(400).send({ error: 'Invalid ObjectId' });
          }
  
          const updatedClass = req.body;
          console.log('Updated Class:', updatedClass); // Log the updated class data
  
          const filter = { _id: new ObjectId(id) };
          const options = { upsert: true };
          const updateDoc = {
              $set: {
                  name: updatedClass.name,
                  videoLink: updatedClass.videoLink,
                  teamType: updatedClass.teamType,
                  slot: updatedClass.slot,
                  prizePoolFirst: updatedClass.prizePoolFirst,
                  prizePoolSecond: updatedClass.prizePoolSecond,
                  prizePoolThird: updatedClass.prizePoolThird,
                  scheduledDate: updatedClass.scheduledDate,
                  qualifier: updatedClass.qualifier,
                  quarterFinal: updatedClass.quarterFinal,
                  semiFinal: updatedClass.semiFinal,
                  grandFinal: updatedClass.grandFinal,
                  instructorName: updatedClass.instructorName,
                  instructorEmail: updatedClass.instructorEmail,
                  status: 'pending',
                  submitted: updatedClass.submitted,
                  totalEnrolled: updatedClass.totalEnrolled,
              },
          };
          console.log('Update Document:', updateDoc); // Log the update document
  
          const result = await classesCollection.updateOne(filter, updateDoc, options);
          console.log('Update Result:', result); // Log the update result
  
          res.send(result);
      } catch (err) {
          console.error(err);
          res.status(500).json({ message: 'Internal server error' });
      }
  });

    // ! CLASSES ROUTES

    app.post("/new-class", verifyJWT, verifyInstructor, async (req, res) => {
      const newClass = req.body;
      newClass.availableSeats = parseInt(newClass.availableSeats);
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    // GET ALL CLASSES ADDED BY INSTRUCTOR
    app.get(
      "/classes/:email",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const email = req.params.email;
        const query = { instructorEmail: email };
        const result = await classesCollection.find(query).toArray();
        res.send(result);
      }
    );

    // Store form data
    app.post("/store-form-data", verifyJWT, async (req, res) => {
      console.log('Received request at /store-form-data');
      const formData = req.body;
      try {
          console.log('Form data received:', formData);
          console.log('Attempting to store form data in MongoDB...');
          // Ensure enrolledTeamsCollection is correctly set up to interact with your MongoDB database
          const result = await enrolledTeamsCollection.insertOne(formData);
          console.log('Form data stored successfully:', result);
          res.status(200).json({ success: true, message: "Form data stored successfully" });
      } catch (err) {
          console.error('Error storing form data:', err);
          res.status(500).json({ success: false, message: "Error storing form data" });
      }
  });










     // Fetch enrolled teams
     app.get("/api/enrolled-teams", async (req, res) => {
      try {
        const enrolledTeams = await enrolledTeamsCollection.find({}).toArray();
        res.send(enrolledTeams);
      } catch (error) {
        console.error('Error fetching enrolled teams:', error);
        res.status(500).send({ error: true, message: "Error fetching enrolled teams" });
      }
    });

    // Approve a team
    app.put("/api/enrolled-teams/:teamId/approve", async (req, res) => {
      const teamId = req.params.teamId;
      try {
        const result = await enrolledTeamsCollection.updateOne(
          { _id: new ObjectId(teamId) },
          { $set: { status: "approved" } }
        );
        res.send(result);
      } catch (error) {
        console.error('Error approving team:', error);
        res.status(500).send({ error: true, message: "Error approving team" });
      }
    });

    // Reject a team
    app.put("/api/enrolled-teams/:teamId/reject", async (req, res) => {
      const teamId = req.params.teamId;
      try {
        const result = await enrolledTeamsCollection.updateOne(
          { _id: new ObjectId(teamId) },
          { $set: { status: "rejected" } }
        );
        res.send(result);
      } catch (error) {
        console.error('Error rejecting team:', error);
        res.status(500).send({ error: true, message: "Error rejecting team" });
      }
    });

    // GET ALL CLASSES
    app.get("/classes", async (req, res) => {
      const query = { status: "approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/classes-manage", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Change status of a class
    app.put("/change-status/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      console.log(req.body);
      const reason = req.body.reason;
      const filter = { _id: new ObjectId(id) };
      console.log("🚀 ~ file: index.js:180 ~ app.put ~ reason:", reason);
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
          reason: reason,
        },
      };
      const result = await classesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    // * GET APPROVED CLASSES
    app.get("/approved-classes", async (req, res) => {
      const query = { status: "approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // GET ALL INSTRUCTORS
    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // Update a class
    // app.put('/update-class/:id', verifyJWT, verifyInstructor, async (req, res) => {
    //     const id = req.params.id;
    //     const updatedClass = req.body;
    //     const filter = { _id: new ObjectId(id) };
    //     const options = { upsert: true };
    //     const updateDoc = {
    //         $set: {
    //             name: updatedClass.name,
    //             description: updatedClass.description,
    //             price: updatedClass.price,
    //             availableSeats: parseInt(updatedClass.availableSeats),
    //             videoLink: updatedClass.videoLink,
    //             status: 'pending'
    //         }
    //     }
    //     const result = await classesCollection.updateOne(filter, updateDoc, options);
    //     res.send(result);
    // })

    app.put(
      "/update-class/:id",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const id = req.params.id;
        // Check if the id is a valid ObjectId string
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ error: true, message: "Invalid ObjectId" });
        }
        const updatedClass = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            name: updatedClass.name,
            description: updatedClass.description,
            price: updatedClass.price,
            availableSeats: parseInt(updatedClass.availableSeats),
            videoLink: updatedClass.videoLink,
            status: "pending",
          },
        };
        const result = await classesCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    // Get single class by id for details page
    app.get("/class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });
    // ! CART ROUTES

    // ADD TO CART
    app.post("/add-to-cart", verifyJWT, async (req, res) => {
      const newCartItem = req.body;
      const result = await cartCollection.insertOne(newCartItem);
      res.send(result);
    });
    // Get cart item id for checking if a class is already in cart
    app.get("/cart-item/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      const query = { classId: id, userMail: email };
      const projection = { classId: 1 };
      const result = await cartCollection.findOne(query, {
        projection: projection,
      });
      res.send(result);
    });

    app.get("/cart/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { userMail: email };
      const projection = { classId: 1 };
      const carts = await cartCollection
        .find(query, { projection: projection })
        .toArray();
      const classIds = carts.map((cart) => new ObjectId(cart.classId));
      const query2 = { _id: { $in: classIds } };
      const result = await classesCollection.find(query2).toArray();
      res.send(result);
    });

    // Delete a item form cart
    app.delete("/delete-cart-item/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { classId: id };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    // PAYMENT ROUTES
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        description: "Anything",
        currency: "inr",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // POST PAYMENT INFO
    app.post("/payment-info", verifyJWT, async (req, res) => {
      const paymentInfo = req.body;
      const classesId = paymentInfo.classesId;
      const userEmail = paymentInfo.userEmail;
      const singleClassId = req.query.classId;
      let query;
      // const query = { classId: { $in: classesId } };
      if (singleClassId) {
        query = { classId: singleClassId, userMail: userEmail };
      } else {
        query = { classId: { $in: classesId } };
      }
      const classesQuery = {
        _id: { $in: classesId.map((id) => new ObjectId(id)) },
      };
      const classes = await classesCollection.find(classesQuery).toArray();
      const newEnrolledData = {
        userEmail: userEmail,
        classesId: classesId.map((id) => new ObjectId(id)),
        transactionId: paymentInfo.transactionId,
      };
      const updatedDoc = {
        $set: {
          totalEnrolled:
            classes.reduce(
              (total, current) => total + current.totalEnrolled,
              0
            ) + 1 || 0,
          availableSeats:
            classes.reduce(
              (total, current) => total + current.availableSeats,
              0
            ) - 1 || 0,
        },
      };
      // const updatedInstructor = await userCollection.find()
      const updatedResult = await classesCollection.updateMany(
        classesQuery,
        updatedDoc,
        { upsert: true }
      );
      const enrolledResult = await enrolledCollection.insertOne(
        newEnrolledData
      );
      const deletedResult = await cartCollection.deleteMany(query);
      const paymentResult = await paymentCollection.insertOne(paymentInfo);
      res.send({ paymentResult, deletedResult, enrolledResult, updatedResult });
    });

    app.get("/payment-history/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await paymentCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/payment-history-length/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const total = await paymentCollection.countDocuments(query);
      res.send({ total });
    });

    // ! ENROLLED ROUTES

    app.get("/popular_classes", async (req, res) => {
      const result = await classesCollection
        .find()
        .sort({ totalEnrolled: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/popular-instructors", async (req, res) => {
      const pipeline = [
        {
          $group: {
            _id: "$instructorEmail",
            totalEnrolled: { $sum: "$totalEnrolled" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "email",
            as: "instructor",
          },
        },
        {
          $project: {
            _id: 0,
            instructor: {
              $arrayElemAt: ["$instructor", 0],
            },
            totalEnrolled: 1,
          },
        },
        {
          $sort: {
            totalEnrolled: -1,
          },
        },
        {
          $limit: 6,
        },
      ];
      const result = await classesCollection.aggregate(pipeline).toArray();
      res.send(result);
    });

    // Admins stats
    app.get("/admin-stats", verifyJWT, verifyAdmin, async (req, res) => {
      // Get approved classes and pending classes and instructors
      const approvedClasses = (
        await classesCollection.find({ status: "approved" }).toArray()
      ).length;
      const pendingClasses = (
        await classesCollection.find({ status: "pending" }).toArray()
      ).length;
      const instructors = (
        await userCollection.find({ role: "instructor" }).toArray()
      ).length;
      const totalClasses = (await classesCollection.find().toArray()).length;
      const totalEnrolled = (await enrolledCollection.find().toArray()).length;
      // const totalRevenue = await paymentCollection.find().toArray();
      // const totalRevenueAmount = totalRevenue.reduce((total, current) => total + parseInt(current.price), 0);
      const result = {
        approvedClasses,
        pendingClasses,
        instructors,
        totalClasses,
        totalEnrolled,
        // totalRevenueAmount
      };
      res.send(result);
    });

    // !GET ALL INSTrUCTOR

    app.get("/instructors", async (req, res) => {
      const result = await userCollection
        .find({ role: "instructor" })
        .toArray();
      res.send(result);
    });

    app.get("/enrolled-classes/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const pipeline = [
        {
          $match: query,
        },
        {
          $lookup: {
            from: "classes",
            localField: "classesId",
            foreignField: "_id",
            as: "classes",
          },
        },
        {
          $unwind: "$classes",
        },
        {
          $lookup: {
            from: "users",
            localField: "classes.instructorEmail",
            foreignField: "email",
            as: "instructor",
          },
        },
        {
          $project: {
            _id: 0,
            classes: 1,
            instructor: {
              $arrayElemAt: ["$instructor", 0],
            },
          },
        },
      ];
      const result = await enrolledCollection.aggregate(pipeline).toArray();
      // const result = await enrolledCollection.find(query).toArray();
      res.send(result);
    });

    // Applied route
    app.post("/as-instructor", async (req, res) => {
      const data = req.body;
      const result = await appliedCollection.insertOne(data);
      res.send(result);
    });
    app.get("/applied-instructors/:email", async (req, res) => {
      const email = req.params.email;
      const result = await appliedCollection.findOne({ email });
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Gaming-Hustler Server is running!");
});

// Listen
app.listen(port, () => {
  console.log(`SERVER IS RUNNING ON PORT ${port}`);
});

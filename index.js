import express from "express";
import cors from "cors";
import "dotenv/config";
const app = express();
const port = process.env.PORT || 5000;
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zui8vyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();

    // database connection
    const jobCollection = client.db("jobs-portal").collection("jobs");
    const jobApplicationCollection = client
      .db("jobs-portal")
      .collection("job_applications");

    // Jobs APIs

    // get all jobs
    app.get("/jobs", async (req, res) => {
      let email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }

      let cursor = jobCollection.find(query);
      let result = await cursor.toArray();
      res.send(result);
    });

    // get single job
    app.get("/job/:id", async (req, res) => {
      let id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // get recruiter all job applications
    app.get("/application/job/:jobId", async (req, res) => {
      let jobId = req.params.jobId;

      let query = { job_id: jobId };
      let result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });

    // change status of job applications
    app.path("/application/status/:appId", async (req, res) => {
      let appId = req.params.appId;
      let status = req.body;

      let query = { _id: new ObjectId(appId) };
      let updateDoc = {
        $set: {
          status,
        },
      };

      let result = await jobApplicationCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // add new job post
    app.post("/job/new", async (req, res) => {
      let job = req.body;
      let result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // Job Applications API
    // Apply Job
    app.post("/job-apply", async (req, res) => {
      let application = req.body;
      let result = await jobApplicationCollection.insertOne(application);

      // actual job er count will increase + 1
      let job_id = application.job_id;
      let query = { _id: new ObjectId(job_id) };
      let result1 = await jobCollection.findOne(query);
      let count = 0;
      if (result1.applicationCount) {
        count = result1.applicationCount + 1;
      } else {
        count = 1;
      }

      // let's update
      let updateDoc = {
        $set: { applicationCount: count },
      };

      let result2 = await jobCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // Get Application based on email
    app.get("/job-application", async (req, res) => {
      let email = req.query.email;
      let query = { email };
      let result = await jobApplicationCollection.find(query).toArray();

      // let's get job details too
      for (const application of result) {
        let query1 = { _id: new ObjectId(application.job_id) };
        let job = await jobCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.location = job.location;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

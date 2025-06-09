const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
let cachedClient = null;

exports.handler = async (event) => {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await cachedClient.connect();
  }

const db = cachedClient.db('yusanstories'); // ← your actual DB name
const collection = db.collection('betweenmeandyusan'); // ← your actual collection

  const search = event.queryStringParameters.q || "";
  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { story: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const veterans = await collection.find(query).toArray();

  return {
    statusCode: 200,
    body: JSON.stringify(veterans),
  };
};

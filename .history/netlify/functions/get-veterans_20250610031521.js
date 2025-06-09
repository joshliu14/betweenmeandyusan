// netlify/functions/get-veterans.js
const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

exports.handler = async (event) => {
  try {
    if (!cachedClient || !cachedDb) {
      cachedClient = new MongoClient(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await cachedClient.connect();
      cachedDb = cachedClient.db('yusanstories'); // ← your actual DB name
    }

    const collection = cachedDb.collection('betweenmeandyusan'); // ← your actual collection
    const search = event.queryStringParameters.q || '';

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { story: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const veterans = await collection.find(query).toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(veterans),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

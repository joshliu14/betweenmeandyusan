const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
let cachedClient = null;

exports.handler = async (event) => {
  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      await cachedClient.connect();
    }

    const db = cachedClient.db('yusanstories');
    const collection = db.collection('betweenmeandyusan');

    const search = event.queryStringParameters.q || "";
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { story: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } }
          ]
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

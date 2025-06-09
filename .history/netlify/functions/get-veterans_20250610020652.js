const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI; // Set this in Netlify dashboard
const client = new MongoClient(uri);

exports.handler = async (event) => {
  try {
    await client.connect();
    const collection = client.db('your_db_name').collection('veterans');

    const search = event.queryStringParameters.q || "";
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { story: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const veterans = await collection.find(query).toArray();
    return {
      statusCode: 200,
      body: JSON.stringify(veterans),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

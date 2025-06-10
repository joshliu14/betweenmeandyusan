// netlify/functions/upload-media.js
const { MongoClient, GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

let cachedClient = null;
let cachedDb = null;

const connectToDatabase = async () => {
  if (!cachedClient || !cachedDb) {
    cachedClient = new MongoClient(process.env.MONGO_URI);
    await cachedClient.connect();
    cachedDb = cachedClient.db('yusanstories');
  }
  return cachedDb;
};

const uploadToGridFS = async (db, fileBuffer, filename, contentType, type) => {
  const bucket = new GridFSBucket(db, { bucketName: type === 'photo' ? 'photos' : 'videos' });
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { contentType, uploadDate: new Date(), fileSize: fileBuffer.length, type }
  });

  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);

  return new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id,
        filename,
        contentType,
        size: fileBuffer.length,
        url: `/.netlify/functions/get-veterans?media=${uploadStream.id}&type=${type}`
      });
    });

    readable.pipe(uploadStream);
  });
};

const parseMultipartForm = (buffer, boundary) => {
  const result = { files: {}, fields: {} };
  const parts = buffer.toString('binary').split(`--${boundary}`).slice(1, -1);

  parts.forEach(part => {
    const [header, content] = part.split(Buffer.from('\r\n\r\n'));
    const headerStr = header.toString('utf8');
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const fileNameMatch = headerStr.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerStr.match(/Content-Type: ([^\r\n]+)/);

    if (!nameMatch) return;
    const fieldName = nameMatch[1];

    if (fileNameMatch) {
      const filename = fileNameMatch[1];
      const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
      const startIndex = header.length + 4;
      const endIndex = part.length - 2;
      const fileBuffer = part.slice(startIndex, endIndex);

      result.files[fieldName] = {
        filename,
        contentType,
        buffer: fileBuffer,
        size: fileBuffer.length
      };
    } else {
      const value = content.toString('utf8').trim();
      result.fields[fieldName] = value;
    }
  });

  return result;
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const db = await connectToDatabase();
    const contentType = event.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid Content-Type' }) };
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing boundary in multipart form data' }) };
    }

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    const { files, fields } = parseMultipartForm(bodyBuffer, boundary);

    const file = files.file;
    const type = fields.type;

    if (!file || !type || !['photo', 'video'].includes(type)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid file or type' }) };
    }

    const validTypes = type === 'photo'
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/mov'];

    if (!validTypes.includes(file.contentType.toLowerCase())) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid file type: ${file.contentType}` }) };
    }

    const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `File too large. Max size: ${type === 'photo' ? '10MB' : '100MB'}` }) };
    }

    const uploadResult = await uploadToGridFS(db, file.buffer, file.filename, file.contentType, type);
    return { statusCode: 200, headers, body: JSON.stringify(uploadResult) };

  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
    };
  }
};

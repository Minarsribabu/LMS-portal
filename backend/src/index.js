require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const client = require('prom-client');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://lms-ml:8000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://lms-mongo:27017/lms';

const defaultCourses = [
  { title: 'Docker & Containers', sessions: 12, level: 'Beginner' },
  { title: 'CI/CD Pipelines', sessions: 10, level: 'Intermediate' },
  { title: 'Cloud Deployment', sessions: 8, level: 'Intermediate' },
  { title: 'Monitoring & Observability', sessions: 6, level: 'Advanced' },
];

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    sessions: { type: Number, required: true, min: 1 },
    level: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

courseSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Course = mongoose.model('Course', courseSchema);

// ─── Middleware ───
app.use(cors());
app.use(express.json());

// ─── Prometheus Metrics ───
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    httpRequestsTotal.inc(
      { method: req.method, route, status_code: res.statusCode }
    );
  });
  next();
});

// ─── Routes ───

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lms-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Sample courses endpoint
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: 1 });
    res.json(courses);
  } catch (err) {
    console.error('[Backend] Failed to fetch courses:', err.message);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { title, sessions, level } = req.body;
    const course = await Course.create({ title, sessions, level });
    res.status(201).json(course);
  } catch (err) {
    console.error('[Backend] Failed to create course:', err.message);
    res.status(400).json({
      error: 'Invalid course payload. Required fields: title, sessions, level',
      details: err.message,
    });
  }
});

// ─── Inter-Service Communication: Proxy to ML Service ───
app.post('/api/predict', async (req, res) => {
  try {
    const { hours_watched, quizzes_passed, assignments_done } = req.body;

    if (hours_watched == null || quizzes_passed == null || assignments_done == null) {
      return res.status(400).json({
        error: 'Missing required fields: hours_watched, quizzes_passed, assignments_done',
      });
    }

    console.log(`[Backend] Forwarding prediction request to ML service at ${ML_SERVICE_URL}/predict`);
    console.log(`[Backend] Payload:`, { hours_watched, quizzes_passed, assignments_done });

    // Call FastAPI ML service internally via Docker network
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      hours_watched,
      quizzes_passed,
      assignments_done,
    });

    console.log(`[Backend] ML service responded:`, mlResponse.data);

    res.json({
      ...mlResponse.data,
      source: 'backend-proxy → ml-service',
    });
  } catch (err) {
    console.error(`[Backend] ML service call failed:`, err.message);
    res.status(502).json({
      error: 'ML service unavailable',
      details: err.message,
      ml_url: `${ML_SERVICE_URL}/predict`,
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

async function connectAndSeedMongo() {
  await mongoose.connect(MONGO_URI);
  console.log('[Backend] Connected to MongoDB');

  const coursesCount = await Course.countDocuments();
  if (coursesCount === 0) {
    await Course.insertMany(defaultCourses);
    console.log('[Backend] Seeded default courses');
  }
}

// ─── Start Server ───
connectAndSeedMongo()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Backend] LMS Backend running on port ${PORT}`);
      console.log(`[Backend] ML Service URL: ${ML_SERVICE_URL}`);
      console.log(`[Backend] Health: http://localhost:${PORT}/api/health`);
      console.log(`[Backend] Metrics: http://localhost:${PORT}/metrics`);
    });
  })
  .catch((err) => {
    console.error('[Backend] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

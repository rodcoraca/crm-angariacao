import express from 'express';
import cors from 'cors';
import providersRouter from './routes/providers.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/providers', providersRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[OSFlow Provider API] Server is running on port ${PORT}`);
  console.log(`[OSFlow Provider API] Endpoint active: POST /api/providers/:provider/sync`);
});

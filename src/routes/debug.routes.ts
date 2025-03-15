import express from 'express';
import * as debugController from '../controllers/debug.controller';

const router = express.Router();

// Route to check database status
router.get('/db-status', debugController.getDatabaseStatus);

// Route to initialize database with test data
router.post('/init-db', debugController.initializeDatabase);

export default router;
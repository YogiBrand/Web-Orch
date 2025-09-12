import { Router, Request, Response } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const router = Router();

// GET /models - Get available AI models
router.get('/', async (req: Request, res: Response) => {
  try {
    const openrouterService = req.app.locals.openrouterService;
    
    if (!openrouterService) {
      return res.status(503).json({
        success: false,
        error: 'OpenRouter service not available',
        timestamp: new Date().toISOString()
      });
    }

    // Get models from OpenRouter service
    const models = await openrouterService.getModels();
    
    logger.info('Retrieved models list', {
      count: models.length,
      user_agent: req.get('User-Agent')
    });

    res.json(models);
  } catch (error: any) {
    logger.error('Failed to get models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve models',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
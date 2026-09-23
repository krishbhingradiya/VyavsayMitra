/**
 * VYAVSAYMITRA — Business & ML Routes
 */

const { Router } = require('express');
const businessController = require('../controllers/businessController');

const router = Router();

// Advisory & calculations
router.post('/analyze', businessController.analyze);
router.post('/calculate', businessController.calculate);

// ML inference
router.post('/predict', businessController.predict);

// Classification
router.get('/archetype', businessController.getArchetype);

// Benchmark & catalog queries
router.get('/data/business/:type', businessController.getBenchmark);
router.get('/datasets', businessController.getDatasets);
router.get('/models', businessController.getModels);
router.get('/schemes', businessController.getSchemes);

// FoodTech Engine & Registry (Phase 3 Step 3 & 4)
router.get('/foodtech/models', businessController.getFoodTechModels);
router.get('/foodtech/models/:id', businessController.getFoodTechModelById);
router.post('/foodtech/calculate', businessController.calculateFoodTech);
router.post('/foodtech/validate-mass-balance', businessController.validateFoodTechMassBalance);
router.post('/foodtech/advisory', businessController.getFoodTechAdvisory);

module.exports = router;

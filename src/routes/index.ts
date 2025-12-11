import { Router } from 'express';
import { GenericController } from '../controllers/genericController';
import { TableConfigController } from '../controllers/tableConfigController';

const router = Router();
const controller = new GenericController();
const configController = new TableConfigController();

// Metadata Routes
router.get('/meta/tables', controller.getTables);
router.get('/meta/table/:table', controller.getTableMetadata);
router.post('/meta/refresh', controller.refreshMetadata);

// Table Configuration Routes
router.get('/api/table_configurations', configController.listConfiguredTables); // List configured tables
router.get('/api/table_configurations/:table', configController.getConfig);
router.post('/api/table_configurations', configController.saveConfig);
router.delete('/api/table_configurations/:table', configController.deleteConfig);

// CRUD Routes
router.get('/api/:table', controller.list);
router.get('/api/:table/:id', controller.get);
router.post('/api/:table', controller.create);
router.put('/api/:table/:id', controller.update);
router.delete('/api/:table/:id', controller.delete);

export default router;

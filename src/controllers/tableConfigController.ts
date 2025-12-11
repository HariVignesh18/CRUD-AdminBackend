import { Request, Response } from 'express';
import { sequelize } from '../connection/db';
import { QueryTypes } from 'sequelize';

export class TableConfigController {
    // List all configured tables (for sidebar)
    async listConfiguredTables(req: Request, res: Response) {
        try {
            const configs: any = await sequelize.query(
                `SELECT table_name FROM table_configurations WHERE deleted_at IS NULL ORDER BY table_name`,
                {
                    type: QueryTypes.SELECT
                }
            );

            const tableNames = configs.map((c: any) => c.table_name);

            res.json({ success: true, data: tableNames });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get configuration for a table
    async getConfig(req: Request, res: Response) {
        let config: any = null;
        let table = '';

        try {
            table = req.params.table;

            [config] = await sequelize.query(
                `SELECT * FROM table_configurations WHERE table_name = :table AND deleted_at IS NULL`,
                {
                    replacements: { table },
                    type: QueryTypes.SELECT
                }
            );

            if (!config) {
                return res.json({
                    success: true,
                    data: null
                });
            }

            // Parse JSON fields (MySQL may already parse JSON columns)
            const result = {
                ...config,
                column_order: Array.isArray(config.column_order) ? config.column_order : (config.column_order ? JSON.parse(config.column_order) : null),
                unique_constraints: Array.isArray(config.unique_constraints) ? config.unique_constraints : (config.unique_constraints ? JSON.parse(config.unique_constraints) : null),
                sortable_columns: Array.isArray(config.sortable_columns) ? config.sortable_columns : (config.sortable_columns ? JSON.parse(config.sortable_columns) : null),
                searchable_columns: Array.isArray(config.searchable_columns) ? config.searchable_columns : (config.searchable_columns ? JSON.parse(config.searchable_columns) : null),
                filterable_columns: Array.isArray(config.filterable_columns) ? config.filterable_columns : (config.filterable_columns ? JSON.parse(config.filterable_columns) : null),
            };

            res.json({ success: true, data: result });
        } catch (error: any) {
            console.error(`[Error] Failed to get config for ${table}:`, error.message);
            console.error(`[Debug] Raw config value:`, config);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async saveConfig(req: Request, res: Response) {
        try {
            const { table_name, column_order, unique_constraints, sortable_columns, searchable_columns, filterable_columns } = req.body;

            if (!table_name) {
                return res.status(400).json({ success: false, message: 'table_name is required' });
            }

            // Check if config exists
            const [existing]: any = await sequelize.query(
                `SELECT id FROM table_configurations WHERE table_name = :table_name`,
                {
                    replacements: { table_name },
                    type: QueryTypes.SELECT
                }
            );

            if (existing) {
                // Update
                await sequelize.query(
                    `UPDATE table_configurations SET 
                        column_order = :column_order,
                        unique_constraints = :unique_constraints,
                        sortable_columns = :sortable_columns,
                        searchable_columns = :searchable_columns,
                        filterable_columns = :filterable_columns,
                        updated_at = NOW()
                    WHERE table_name = :table_name`,
                    {
                        replacements: {
                            table_name,
                            column_order: JSON.stringify(column_order),
                            unique_constraints: JSON.stringify(unique_constraints),
                            sortable_columns: JSON.stringify(sortable_columns),
                            searchable_columns: JSON.stringify(searchable_columns),
                            filterable_columns: JSON.stringify(filterable_columns)
                        }
                    }
                );
            } else {
                // Insert
                await sequelize.query(
                    `INSERT INTO table_configurations 
                    (table_name, column_order, unique_constraints, sortable_columns, searchable_columns, filterable_columns) 
                    VALUES (:table_name, :column_order, :unique_constraints, :sortable_columns, :searchable_columns, :filterable_columns)`,
                    {
                        replacements: {
                            table_name,
                            column_order: JSON.stringify(column_order),
                            unique_constraints: JSON.stringify(unique_constraints),
                            sortable_columns: JSON.stringify(sortable_columns),
                            searchable_columns: JSON.stringify(searchable_columns),
                            filterable_columns: JSON.stringify(filterable_columns)
                        }
                    }
                );
            }

            res.json({ success: true, message: 'Configuration saved successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Delete configuration (invalidate cache)
    async deleteConfig(req: Request, res: Response) {
        try {
            const { table } = req.params;

            // Soft delete
            await sequelize.query(
                `UPDATE table_configurations SET deleted_at = NOW() WHERE table_name = :table`,
                {
                    replacements: { table }
                }
            );

            res.json({ success: true, message: 'Configuration deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

}

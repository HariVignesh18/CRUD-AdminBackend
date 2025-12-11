import { Request, Response } from 'express';
import { GenericService } from '../services/genericService';
import { getAllTables, getTableMetadata, clearMetadataCache } from '../utility/introspection';

const service = new GenericService();

export class GenericController {
    // Metadata Endpoints
    async getTables(req: Request, res: Response) {
        try {
            const tables = await getAllTables();
            res.json({ success: true, data: tables });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getTableMetadata(req: Request, res: Response) {
        try {
            const { table } = req.params;
            const metadata = await getTableMetadata(table);
            res.json({ success: true, ...metadata });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async refreshMetadata(req: Request, res: Response) {
        try {
            clearMetadataCache();
            res.json({ success: true, message: 'Metadata cache cleared' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // CRUD Endpoints
    async list(req: Request, res: Response) {
        try {
            const { table } = req.params;

            // Support multiple pagination formats
            // Refine format: current=1&pageSize=30 OR _start=0&_end=30
            // Legacy format: page=1&per_page=30
            let page = 1;
            let limit = 30;

            if (req.query.current && req.query.pageSize) {
                // Refine pagination format
                page = parseInt(req.query.current as string) || 1;
                limit = parseInt(req.query.pageSize as string) || 30;
            } else if (req.query._start !== undefined && req.query._end !== undefined) {
                // Alternative Refine format
                const start = parseInt(req.query._start as string) || 0;
                const end = parseInt(req.query._end as string) || 30;
                limit = end - start;
                page = Math.floor(start / limit) + 1;
            } else {
                // Legacy format
                page = parseInt(req.query.page as string) || 1;
                limit = parseInt(req.query.per_page as string) || 30;
            }

            // Parse filters - support both Refine array format and legacy object format
            const filters: any = {};
            let searchQuery: string | null = null;

            // Refine format: filters[0][field]=name&filters[0][operator]=eq&filters[0][value]=John
            Object.keys(req.query).forEach(key => {
                const arrayMatch = key.match(/^filters\[(\d+)\]\[(\w+)\]$/);
                if (arrayMatch) {
                    const index = arrayMatch[1];
                    const prop = arrayMatch[2];
                    if (prop === 'field') {
                        const field = req.query[key] as string;
                        const valueKey = `filters[${index}][value]`;

                        // Handle search field specially
                        if (field === '_search' && req.query[valueKey]) {
                            searchQuery = req.query[valueKey] as string;
                        } else if (req.query[valueKey]) {
                            filters[field] = req.query[valueKey];
                        }
                    }
                }
            });

            // Legacy filter format: filter[field]=value
            Object.keys(req.query).forEach(key => {
                const match = key.match(/^filter\[(.*)\]$/);
                if (match) {
                    filters[match[1]] = req.query[key];
                }
            });

            // Express nested object format: filter: { field: value }
            if (req.query.filter && typeof req.query.filter === 'object') {
                Object.assign(filters, req.query.filter);
            }

            // Simple _search parameter (from updated data provider)
            if (req.query._search && typeof req.query._search === 'string') {
                searchQuery = req.query._search;
            }

            // If search query exists, load table config and add search filters
            if (searchQuery) {
                try {
                    const [config]: any = await (await import('../connection/db')).sequelize.query(
                        `SELECT searchable_columns FROM table_configurations WHERE table_name = :table AND deleted_at IS NULL`,
                        {
                            replacements: { table },
                            type: (await import('sequelize')).QueryTypes.SELECT
                        }
                    );

                    if (config?.searchable_columns) {
                        // MySQL may already parse JSON columns as arrays
                        const searchableColumns = Array.isArray(config.searchable_columns)
                            ? config.searchable_columns
                            : JSON.parse(config.searchable_columns);

                        if (searchableColumns && searchableColumns.length > 0) {
                            // Add _search key with columns and query
                            filters._search = {
                                columns: searchableColumns,
                                query: searchQuery
                            };
                        }
                    }
                } catch (error) {
                    // Could not load searchable columns, skipping search
                }
            }

            // Extract sort parameters
            const sortBy = req.query.sortBy as string | undefined;
            const sortOrder = req.query.sortOrder as string | undefined;

            const result = await service.list(table, page, limit, filters, sortBy, sortOrder);
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async get(req: Request, res: Response) {
        try {
            const { table, id } = req.params;
            const result = await service.get(table, id);
            if (!result) return res.status(404).json({ success: false, message: 'Not found' });
            res.json({ success: true, data: result });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { table } = req.params;
            const result = await service.create(table, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { table, id } = req.params;
            const result = await service.update(table, id, req.body);
            res.json({ success: true, data: result });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { table, id } = req.params;
            await service.delete(table, id);
            res.json({ success: true, message: 'Deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}


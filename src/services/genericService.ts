import { sequelize } from '../connection/db';
import { QueryTypes } from 'sequelize';
import { getTableMetadata, checkTableExists } from '../utility/introspection';

export class GenericService {
    async list(table: string, page: number = 1, limit: number = 10, filters: any = {}, sortBy?: string, sortOrder?: string) {
        const exists = await checkTableExists(table);
        if (!exists) throw new Error('Invalid table');

        const offset = (page - 1) * limit;

        // Build WHERE clause
        const whereClauses: string[] = [];
        const replacements: any = { limit, offset };

        Object.keys(filters).forEach((key) => {
            if (filters[key] !== undefined && filters[key] !== '') {
                // Handle search across multiple columns
                if (key === '_search' && typeof filters[key] === 'object') {
                    const { columns, query } = filters[key];
                    if (columns && columns.length > 0 && query) {
                        const searchClauses = columns.map((col: string, idx: number) => {
                            const paramName = `search_${idx}`;
                            replacements[paramName] = `%${query}%`;
                            return `${col} LIKE :${paramName}`;
                        });
                        whereClauses.push(`(${searchClauses.join(' OR ')})`);
                    }
                } else {
                    // Simple equality check for regular filters
                    whereClauses.push(`${key} = :filter_${key}`);
                    replacements[`filter_${key}`] = filters[key];
                }
            }
        });

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Build ORDER BY clause
        let orderBySQL = '';
        if (sortBy && sortOrder) {
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            orderBySQL = `ORDER BY ${sortBy} ${order}`;
        }

        const query = `SELECT * FROM ${table} ${whereSQL} ${orderBySQL} LIMIT :limit OFFSET :offset`;

        const data = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        const countResult: any = await sequelize.query(`SELECT COUNT(*) as total FROM ${table} ${whereSQL}`, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            data: data,
            total: countResult[0].total,
        };
    }

    async get(table: string, id: number | string) {
        const exists = await checkTableExists(table);
        if (!exists) throw new Error('Invalid table');

        const metadata = await getTableMetadata(table);
        const pk = metadata.primaryKey;

        const result = await sequelize.query(`SELECT * FROM ${table} WHERE ${pk} = :id`, {
            replacements: { id },
            type: QueryTypes.SELECT
        });
        return result[0];
    }

    async create(table: string, data: any) {
        const exists = await checkTableExists(table);
        if (!exists) throw new Error('Invalid table');

        const metadata = await getTableMetadata(table);

        // Validate Data
        for (const col of metadata.columns) {
            if (!col.nullable && !col.isAutoIncrement && data[col.name] === undefined) {
                throw new Error(`Column '${col.name}' is required`);
            }
            if (col.maxLength && data[col.name] && String(data[col.name]).length > col.maxLength) {
                throw new Error(`Column '${col.name}' exceeds max length of ${col.maxLength}`);
            }
        }

        // Check unique constraints
        try {
            const [config]: any = await sequelize.query(
                `SELECT unique_constraints FROM table_configurations WHERE table_name = :table AND deleted_at IS NULL`,
                {
                    replacements: { table },
                    type: QueryTypes.SELECT
                }
            );

            if (config?.unique_constraints) {
                const uniqueColumns = Array.isArray(config.unique_constraints)
                    ? config.unique_constraints
                    : JSON.parse(config.unique_constraints);

                // Check each unique column for duplicates
                for (const column of uniqueColumns) {
                    if (data[column] !== undefined && data[column] !== null) {
                        const [existing]: any = await sequelize.query(
                            `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = :value`,
                            {
                                replacements: { value: data[column] },
                                type: QueryTypes.SELECT
                            }
                        );

                        if (existing.count > 0) {
                            throw new Error(`Record with ${column}: '${data[column]}' already exists`);
                        }
                    }
                }
            }
        } catch (error: any) {
            // If it's our validation error, rethrow it
            if (error.message.includes('already exists')) {
                throw error;
            }
            // Otherwise, continue (table might not have config)
        }

        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(',');

        const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

        const [result] = await sequelize.query(query, {
            replacements: values
        });

        return result;
    }

    async update(table: string, id: number | string, data: any) {
        const exists = await checkTableExists(table);
        if (!exists) throw new Error('Invalid table');

        const metadata = await getTableMetadata(table);
        const pk = metadata.primaryKey;

        // Check unique constraints (excluding current record)
        try {
            const [config]: any = await sequelize.query(
                `SELECT unique_constraints FROM table_configurations WHERE table_name = :table AND deleted_at IS NULL`,
                {
                    replacements: { table },
                    type: QueryTypes.SELECT
                }
            );

            if (config?.unique_constraints) {
                const uniqueColumns = Array.isArray(config.unique_constraints)
                    ? config.unique_constraints
                    : JSON.parse(config.unique_constraints);

                // Check each unique column for duplicates (excluding current record)
                for (const column of uniqueColumns) {
                    if (data[column] !== undefined && data[column] !== null) {
                        const [existing]: any = await sequelize.query(
                            `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = :value AND ${pk} != :id`,
                            {
                                replacements: { value: data[column], id },
                                type: QueryTypes.SELECT
                            }
                        );

                        if (existing.count > 0) {
                            throw new Error(`Record with ${column}: '${data[column]}' already exists`);
                        }
                    }
                }
            }
        } catch (error: any) {
            // If it's our validation error, rethrow it
            if (error.message.includes('already exists')) {
                throw error;
            }
            // Otherwise, continue (table might not have config)
        }

        const keys = Object.keys(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(data), id];

        const query = `UPDATE ${table} SET ${setClause} WHERE ${pk} = ?`;

        await sequelize.query(query, {
            replacements: values
        });

        return this.get(table, id);
    }

    async delete(table: string, id: number | string) {
        const exists = await checkTableExists(table);
        if (!exists) throw new Error('Invalid table');

        const metadata = await getTableMetadata(table);
        const pk = metadata.primaryKey;

        await sequelize.query(`DELETE FROM ${table} WHERE ${pk} = :id`, {
            replacements: { id }
        });

        return { success: true };
    }
}

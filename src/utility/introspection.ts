import { sequelize } from '../connection/db';
import { QueryTypes } from 'sequelize';

let metadataCache: Record<string, any> = {};

export const clearMetadataCache = () => {
    metadataCache = {};
};

const mapTypeToWidget = (dataType: string): string => {
    const type = dataType.toLowerCase();
    if (type.includes('tinyint') || type.includes('boolean')) return 'switch';
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double')) return 'number';
    if (type.includes('text') || type.includes('json')) return 'textarea';
    if (type.includes('date') || type.includes('timestamp') || type.includes('time')) return 'date';
    return 'text';
};

const formatLabel = (name: string): string => {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const checkTableExists = async (tableName: string): Promise<boolean> => {
    const dbName = sequelize.config.database;
    const query = `
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = :dbName AND TABLE_NAME = :tableName
    `;
    const result: any[] = await sequelize.query(query, {
        replacements: { dbName, tableName },
        type: QueryTypes.SELECT
    });
    return result.length > 0;
};

export const getTableMetadata = async (tableName: string) => {
    if (metadataCache[tableName]) {
        return metadataCache[tableName];
    }

    const exists = await checkTableExists(tableName);
    if (!exists) {
        throw new Error(`Table '${tableName}' does not exist`);
    }

    const dbName = sequelize.config.database;

    // Fetch Columns
    const columnsQuery = `
        SELECT 
            COLUMN_NAME as name, 
            DATA_TYPE as type, 
            IS_NULLABLE as isNullable, 
            COLUMN_KEY as 'key',
            EXTRA as extra,
            CHARACTER_MAXIMUM_LENGTH as maxLength
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = :dbName AND TABLE_NAME = :tableName
    `;

    const columnsRaw: any[] = await sequelize.query(columnsQuery, {
        replacements: { dbName, tableName },
        type: QueryTypes.SELECT
    });

    // Detect Primary Key
    let primaryKey = 'id'; // Default fallback
    const pkColumn = columnsRaw.find(col => col.key === 'PRI');
    if (pkColumn) {
        primaryKey = pkColumn.name;
    }

    // Map Columns to Metadata Format
    const columns = columnsRaw.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.isNullable === 'YES',
        maxLength: col.maxLength,
        isPrimaryKey: col.key === 'PRI',
        isAutoIncrement: col.extra.includes('auto_increment'),
        ui: {
            widget: mapTypeToWidget(col.type),
            label: formatLabel(col.name)
        }
    }));

    const metadata = {
        table: tableName,
        label: formatLabel(tableName),
        primaryKey,
        columns,
        relations: []
    };

    metadataCache[tableName] = metadata;
    return metadata;
};

export const getAllTables = async () => {
    const dbName = sequelize.config.database;
    const query = `
        SELECT TABLE_NAME as name
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = :dbName
    `;
    const result: any[] = await sequelize.query(query, {
        replacements: { dbName },
        type: QueryTypes.SELECT
    });
    return result.map(row => row.name);
};



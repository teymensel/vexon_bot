
import fs from 'fs';
import path from 'path';

export class JsonDb<T> {
    private dbPath: string;
    private defaultData: T;

    constructor(fileName: string, defaultData: T) {
        this.dbPath = path.resolve(__dirname, '../../data', fileName);
        this.defaultData = defaultData;
        this.ensureDbExists();
    }

    private ensureDbExists() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.dbPath)) {
            this.write(this.defaultData);
        }
    }

    public read(): T {
        try {
            const data = fs.readFileSync(this.dbPath, 'utf-8');
            return JSON.parse(data) as T;
        } catch (error) {
            console.error(`Error reading DB ${this.dbPath}:`, error);
            return this.defaultData;
        }
    }

    public write(data: T): void {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error(`Error writing DB ${this.dbPath}:`, error);
        }
    }

    public update(callback: (data: T) => void): void {
        const data = this.read();
        callback(data);
        this.write(data);
    }
}

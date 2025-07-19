  import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
  import { Platform } from 'react-native';
  import { SensorData } from '@/types';

  export interface SensorLog {
    id?: number;
    timestamp: number;
    gyroscopeX: number;
    gyroscopeY: number;
    gyroscopeZ: number;
    accelerometerX: number;
    accelerometerY: number;
    accelerometerZ: number;
    sessionId: string;
    userId: string;
  }

  export interface BehaviorProfileData {
    userId: string;
    keystrokeDynamics: any;
    gestureDynamics: any;
    navigationPatterns: any;
    handTremor: any;
    riskScore: number;
  }

  export class DatabaseService {
    private static instance: DatabaseService;
    private db: SQLiteDatabase | null = null;
    private isInitialized = false;

    static getInstance(): DatabaseService {
      if (!DatabaseService.instance) {
        DatabaseService.instance = new DatabaseService();
      }
      return DatabaseService.instance;
    }

    async ensureInitialized(): Promise<void> {
      if (!this.isInitialized) {
        await this.initializeDatabase();
      }
    }

    async initializeDatabase(): Promise<void> {
      try {
        if (Platform.OS === 'web') {
          console.warn('❌ SQLite not supported on web platform.');
          return;
        }

        this.db = await openDatabaseAsync('secureflow.db'); // ✅ FIXED
        await this.createTables();
        this.isInitialized = true;
        console.log('✅ Database initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
      }
    }

    private async createTables(): Promise<void> {
      if (!this.db) return;

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sensor_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          gyroscope_x REAL NOT NULL,
          gyroscope_y REAL NOT NULL,
          gyroscope_z REAL NOT NULL,
          accelerometer_x REAL NOT NULL,
          accelerometer_y REAL NOT NULL,
          accelerometer_z REAL NOT NULL,
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS behavior_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          keystroke_dynamics TEXT,
          gesture_dynamics TEXT,
          navigation_patterns TEXT,
          hand_tremor_signature TEXT,
          risk_score REAL DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS security_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          risk_score REAL NOT NULL,
          action_taken TEXT NOT NULL,
          details TEXT,
          timestamp INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sensor_logs_timestamp 
        ON sensor_logs(timestamp);
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sensor_logs_user_session 
        ON sensor_logs(user_id, session_id);
      `);

      console.log('✅ Database tables created successfully');
    }

    async logSensorData(data: SensorData, sessionId: string, userId: string): Promise<void> {
      await this.ensureInitialized();
      if (!this.db) return;

      try {
        await this.db.runAsync(
          `INSERT INTO sensor_logs 
          (timestamp, gyroscope_x, gyroscope_y, gyroscope_z, 
            accelerometer_x, accelerometer_y, accelerometer_z, 
            session_id, user_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.timestamp,
            data.gyroscope.x,
            data.gyroscope.y,
            data.gyroscope.z,
            data.accelerometer.x,
            data.accelerometer.y,
            data.accelerometer.z,
            sessionId,
            userId
          ]
        );
      } catch (error) {
        console.error('❌ Failed to log sensor data:', error);
      }
    }

    async getSensorLogs(userId: string, sessionId?: string, limit: number = 100): Promise<SensorLog[]> {
      await this.ensureInitialized();
      if (!this.db) return [];

      try {
        let query = `SELECT * FROM sensor_logs WHERE user_id = ?`;
        const params: any[] = [userId];

        if (sessionId) {
          query += ` AND session_id = ?`;
          params.push(sessionId);
        }

        query += ` ORDER BY timestamp DESC LIMIT ?`;
        params.push(limit);

        const result = await this.db.getAllAsync(query, params);

        return result.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          gyroscopeX: row.gyroscope_x,
          gyroscopeY: row.gyroscope_y,
          gyroscopeZ: row.gyroscope_z,
          accelerometerX: row.accelerometer_x,
          accelerometerY: row.accelerometer_y,
          accelerometerZ: row.accelerometer_z,
          sessionId: row.session_id,
          userId: row.user_id,
        }));
      } catch (error) {
        console.error('❌ Failed to get sensor logs:', error);
        return [];
      }
    }

    async getSensorStats(userId: string, sessionId?: string) {
      await this.ensureInitialized();
      if (!this.db) return {
        totalReadings: 0,
        avgGyroscope: { x: 0, y: 0, z: 0 },
        avgAccelerometer: { x: 0, y: 0, z: 0 },
        timeRange: { start: 0, end: 0 },
      };

      try {
        let query = `
          SELECT 
            COUNT(*) as total,
            AVG(gyroscope_x) as avg_gx,
            AVG(gyroscope_y) as avg_gy,
            AVG(gyroscope_z) as avg_gz,
            AVG(accelerometer_x) as avg_ax,
            AVG(accelerometer_y) as avg_ay,
            AVG(accelerometer_z) as avg_az,
            MIN(timestamp) as min_time,
            MAX(timestamp) as max_time
          FROM sensor_logs 
          WHERE user_id = ?
        `;
        const params: any[] = [userId];

        if (sessionId) {
          query += ` AND session_id = ?`;
          params.push(sessionId);
        }

        const result = await this.db.getFirstAsync(query, params) as any;

        return {
          totalReadings: result.total || 0,
          avgGyroscope: {
            x: result.avg_gx || 0,
            y: result.avg_gy || 0,
            z: result.avg_gz || 0,
          },
          avgAccelerometer: {
            x: result.avg_ax || 0,
            y: result.avg_ay || 0,
            z: result.avg_az || 0,
          },
          timeRange: {
            start: result.min_time || 0,
            end: result.max_time || 0,
          },
        };
      } catch (error) {
        console.error('❌ Failed to get sensor stats:', error);
        return {
          totalReadings: 0,
          avgGyroscope: { x: 0, y: 0, z: 0 },
          avgAccelerometer: { x: 0, y: 0, z: 0 },
          timeRange: { start: 0, end: 0 },
        };
      }
    }

    async clearOldSensorData(olderThanDays: number = 30): Promise<void> {
      await this.ensureInitialized();
      if (!this.db) return;

      try {
        const cutoffTimestamp = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        await this.db.runAsync(
          'DELETE FROM sensor_logs WHERE timestamp < ?',
          [cutoffTimestamp]
        );
      } catch (error) {
        console.error('❌ Failed to clear old sensor data:', error);
      }
    }

    async saveBehaviorProfile(userId: string, profile: BehaviorProfileData): Promise<void> {
      await this.ensureInitialized();
      if (!this.db) return;

      try {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO behavior_profiles 
          (user_id, keystroke_dynamics, gesture_dynamics, navigation_patterns, 
            hand_tremor_signature, risk_score, last_updated) 
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            userId,
            JSON.stringify(profile.keystrokeDynamics),
            JSON.stringify(profile.gestureDynamics),
            JSON.stringify(profile.navigationPatterns),
            JSON.stringify(profile.handTremor),
            profile.riskScore
          ]
        );
      } catch (error) {
        console.error('❌ Failed to save behavior profile:', error);
      }
    }

    async getBehaviorProfile(userId: string): Promise<BehaviorProfileData | null> {
      await this.ensureInitialized();
      if (!this.db) return null;

      try {
        const result = await this.db.getFirstAsync(
          'SELECT * FROM behavior_profiles WHERE user_id = ?',
          [userId]
        ) as any;

        if (!result) return null;

        return {
          userId: result.user_id,
          keystrokeDynamics: JSON.parse(result.keystroke_dynamics || '{}'),
          gestureDynamics: JSON.parse(result.gesture_dynamics || '{}'),
          navigationPatterns: JSON.parse(result.navigation_patterns || '{}'),
          handTremor: JSON.parse(result.hand_tremor_signature || '{}'),
          riskScore: result.risk_score || 0,
        };
      } catch (error) {
        console.error('❌ Failed to get behavior profile:', error);
        return null;
      }
    }

    async logSecurityEvent(
      userId: string,
      eventType: string,
      riskScore: number,
      actionTaken: string,
      details: any
    ): Promise<void> {
      await this.ensureInitialized();
      if (!this.db) return;

      try {
        await this.db.runAsync(
          `INSERT INTO security_events 
          (user_id, event_type, risk_score, action_taken, details, timestamp) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            eventType,
            riskScore,
            actionTaken,
            JSON.stringify(details),
            Date.now()
          ]
        );
      } catch (error) {
        console.error('❌ Failed to log security event:', error);
      }
    }

    async getSecurityEvents(userId: string, limit: number = 50): Promise<any[]> {
      await this.ensureInitialized();
      if (!this.db) return [];

      try {
        const result = await this.db.getAllAsync(
          `SELECT * FROM security_events 
          WHERE user_id = ? 
          ORDER BY timestamp DESC 
          LIMIT ?`,
          [userId, limit]
        );

        return result.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          eventType: row.event_type,
          riskScore: row.risk_score,
          actionTaken: row.action_taken,
          details: JSON.parse(row.details || '{}'),
          timestamp: row.timestamp,
          createdAt: row.created_at,
        }));
      } catch (error) {
        console.error('❌ Failed to get security events:', error);
        return [];
      }
    }

    async getDatabaseStats(): Promise<{
      sensorLogs: number;
      behaviorProfiles: number;
      securityEvents: number;
      databaseSize: string;
    }> {
      await this.ensureInitialized();
      if (!this.db) return {
        sensorLogs: 0,
        behaviorProfiles: 0,
        securityEvents: 0,
        databaseSize: 'N/A'
      };

      try {
        const sensor = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM sensor_logs') as any;
        const profile = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM behavior_profiles') as any;
        const event = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM security_events') as any;

        return {
          sensorLogs: sensor.count || 0,
          behaviorProfiles: profile.count || 0,
          securityEvents: event.count || 0,
          databaseSize: 'N/A'
        };
      } catch (error) {
        console.error('❌ Failed to get database stats:', error);
        return {
          sensorLogs: 0,
          behaviorProfiles: 0,
          securityEvents: 0,
          databaseSize: 'N/A'
        };
      }
    }
  }
